# --------------------------------------------------------------------------
# 1. 라이브러리 임포트
# --------------------------------------------------------------------------

# --- 표준 라이브러리 ---
import io
import os
import pathlib
import random
import re
import secrets
import smtplib
import ssl
import json
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, List, Optional

# --- 서드파티 라이브러리 ---
import mysql.connector
from fastapi import (APIRouter, Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, UploadFile, status, Body, Path, UploadFile)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from google.cloud import speech
from jose import JWTError, jwt
from mysql.connector import Error
from mysql.connector.connection import MySQLConnection
from passlib.context import CryptContext
from pydantic import BaseModel

# --- 게시판 라이브러리 ---
import uuid
import base64

# --------------------------------------------------------------------------
# 2. 설정 (FastAPI, 보안, 경로, DB, 이메일 등)
# --------------------------------------------------------------------------

# --- FastAPI 애플리케이션 설정 ---
# --- FastAPI 애플리케이션 설정 ---
app = FastAPI()
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/home/ubuntu/gacha2/first-parser-457504-k2-b1534e2ccbd4.json"

# --- CORS 미들웨어 설정 ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # ‼️ 실제 서비스에서는 프론트엔드 주소만 허용하세요
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 경로 설정 ---
BASE_DIR = pathlib.Path(__file__).parent.resolve()
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
app.mount("/gacha-images", StaticFiles(directory=STATIC_DIR / "images"), name="gacha-images")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# --- 보안 및 JWT 설정 ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "EC59F15933C82E5DE45CC1385A1C8"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# --- 데이터베이스 연결 정보 ---
DB_CONFIG = {
    "host": "43.200.128.44",
    "user": "server",
    "password": "jhWiz0705!",
    "database": "gachaco"
}

connection = mysql.connector.connect(
    host='43.200.128.44',
    user='server',
    password='jhWiz0705!',
    database = 'gachaco'
)

def get_db_connection():
    return mysql.connector.connect(
    host='43.200.128.44',
    user='server',
    password='jhWiz0705!',
    database = 'gachaco'
    )

# --- 이메일 설정 ---
SMTP_SSL_PORT = 465
SMTP_SERVER = "smtp.gmail.com"
SENDER_EMAIL = "jihyecindy@gmail.com"
SENDER_PASSWORD = "voaqqdjqzeqabopq"

# --- 인메모리 저장소 (비밀번호 재설정 인증번호) ---
reset_auth_codes = {}

# --------------------------------------------------------------------------
# 3. Pydantic 데이터 모델
# --------------------------------------------------------------------------

class LoginRequest(BaseModel):
    id: str
    pw: str

class FavoriteStoreRequest(BaseModel):
    store_id: int
    store_name: str

class StoreLocation(BaseModel):
    store_id: int
    name: str
    address: str
    phone_number: str
    image_path: Optional[str] = None
    lat: float
    lng: float

class GachaItem(BaseModel):
    gacha_id: int
    name: str
    img_url: str
    stock_quantity: int
    price: int

class FavoriteRequest(BaseModel):
    id: int
    name: Optional[str] = None
    
class FindIdRequest(BaseModel):
    email: str

# --------------------------------------------------------------------------
# 4. 데이터베이스 의존성 함수
# --------------------------------------------------------------------------

def get_db():
    """데이터베이스 커넥션을 관리하는 의존성 함수"""
    conn = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        yield conn
    except Error as e:
        print(f"데이터베이스 연결 오류: {e}")
        raise HTTPException(status_code=500, detail="データベースの接続に失敗しました。")
    finally:
        if conn and conn.is_connected():
            conn.close()

# --------------------------------------------------------------------------
# 5. 유틸리티 및 헬퍼 함수 (인증, 토큰, 이메일 등)
# --------------------------------------------------------------------------

def verify_password(plain_password, hashed_password):
    """비밀번호 검증 함수"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """액세스 토큰 생성 함수"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """토큰을 검증하고 유저 ID를 가져오는 의존성 함수"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return {"id": user_id}
    except JWTError:
        raise credentials_exception

def get_current_user_from_token(token: str, db):
    """토큰에서 사용자 ID를 추출하고 DB에서 전체 사용자 정보를 조회하는 함수"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT id, nickname, email FROM gachaco_user WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        cursor.close()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate token")

def send_email(receiver_email: str, auth_code: str) -> bool:
    """인증 코드를 이메일로 발송하는 함수"""
    try:
        msg = MIMEText(f"認証番号です。 確認後、必ずパスワードを変更してください。\n\n{auth_code}", _charset="utf-8")
        msg['Subject'] = "パスワード認証番号"
        msg['From'] = SENDER_EMAIL
        msg['To'] = receiver_email

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_SSL_PORT, context=context) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def is_valid_password(password: str) -> bool:
    """비밀번호 형식 유효성 검사 함수 (영문+숫자, 8자 이상)"""
    return bool(re.match(r'^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$', password))

def decode_token_and_get_user_id(token: str):
    try:
        if token.startswith("Bearer "):
            token = token[7:]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")  # 사용자 id가 'sub'에 들어있다고 가정
    except JWTError:
        return None
# --------------------------------------------------------------------------
# 6. API 엔드포인트 (라우트)
# --------------------------------------------------------------------------

# --- 페이지 렌더링 ---
@app.get("/")
def serve_main_page(request: Request):
    return templates.TemplateResponse("main.html", {"request": request})

@app.get("/map")
def serve_map_page(request: Request):
    return templates.TemplateResponse("map.html", {"request": request})

# --- 회원가입 및 인증 ---
@app.post("/signup")
async def signup(
    id: str = Form(...),
    pw: str = Form(...),
    email: str = Form(...),
    nickname: str = Form(...),
    db: mysql.connector.connection = Depends(get_db)
):
    cursor = db.cursor(dictionary=True)
    try:
        hashed_password = pwd_context.hash(pw)
        cursor.execute(
            "INSERT INTO gachaco_user (id, pw, email, nickname) VALUES (%s, %s, %s, %s)",
            (id, hashed_password, email, nickname)
        )
        db.commit()
        return {"message": "会員登録に成功しました。"}
    except mysql.connector.errors.IntegrityError as err:
        if "Duplicate entry" in str(err):
            if "for key 'id'" in str(err):
                return JSONResponse(status_code=409, content={"error": "既に使用中のIDです。"})
            elif "for key 'nickname'" in str(err):
                return JSONResponse(status_code=409, content={"error": "既に使用中のニックネームです。"})
            elif "for key 'email'" in str(err):
                return JSONResponse(status_code=409, content={"error": "既に使用中のメールです。"})
            else:
                return JSONResponse(status_code=409, content={"error": "重複した情報があります。"})
        return JSONResponse(status_code=500, content={"error": str(err)})
    except mysql.connector.Error as err:
        return JSONResponse(status_code=500, content={"error": "データベース エラーが発生しました。"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "予期しないサーバー エラーが発生しました。"})
    finally:
        if cursor:
            cursor.close()

@app.get("/check-duplicate")
async def check_duplicate(type: str = Query(...), value: str = Query(...), db: mysql.connector.connection = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    if type == "id":
        query = "SELECT COUNT(*) AS cnt FROM gachaco_user WHERE id = %s"
    elif type == "nickname":
        query = "SELECT COUNT(*) AS cnt FROM gachaco_user WHERE nickname = %s"
    else:
        return {"available": False, "error": "Invalid type"}
    cursor.execute(query, (value,))
    result = cursor.fetchone()
    count = result['cnt']
    cursor.close()
    db.close()
    return {"available": count == 0}

@app.post("/login")
async def login(request_body: LoginRequest, db: mysql.connector.connection = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, pw FROM gachaco_user WHERE id = %s", (request_body.id,))
        user = cursor.fetchone()

        if user and pwd_context.verify(request_body.pw, user["pw"]):
            token = create_access_token(data={"sub": user["id"]})
            return {"token": token, "token_type": "bearer"}
        else:
            return JSONResponse(status_code=401, content={"success": False, "error": "IDまたはパスワードが間違っています。"})
    finally:
        cursor.close()

# --- 아이디/비밀번호 찾기 ---
@app.post("/find-id")
async def find_id(email: str = Form(...), db: mysql.connector.connection = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM gachaco_user WHERE email = %s", (email,))
        user = cursor.fetchone()
        if user:
            return {"success": True, "id": user["id"]}
        else:
            return JSONResponse(status_code=404, content={"success": False, "error": "一致するメールアドレスが見つかりません。"})
    except mysql.connector.Error as err:
        return JSONResponse(status_code=500, content={"success": False, "error": str(err)})
    finally:
        cursor.close()

@app.post("/send-reset-authcode")
async def send_reset_authcode(id: str = Form(...), email: str = Form(...), db: mysql.connector.connection = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT email FROM gachaco_user WHERE id = %s AND email = %s", (id, email))
        if not cursor.fetchone():
            return {"success": False, "error": "一致するメールアドレスが見つかりません。"}
        
        code = secrets.token_hex(3).upper()
        reset_auth_codes[(id, email)] = code
        
        if send_email(email, code):
            return {"success": True, "email": email}
        else:
            return {"success": False, "error": "メールの送信に失敗しました。"}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        cursor.close()

@app.post("/verify-reset-authcode")
async def verify_reset_authcode(id: str = Form(...), email: str = Form(...), code: str = Form(...)):
    key = (id, email)
    if key in reset_auth_codes and reset_auth_codes[key] == code:
        return {"success": True}
    else:
        return {"success": False, "error": "認証番号が一致しません。"}

@app.post("/reset-pw")
async def reset_password(id: str = Form(...), email: str = Form(...), newpw: str = Form(...), db: mysql.connector.connection = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        if not is_valid_password(newpw):
            return {"success": False, "error": "パスワードは8文字以上で、英字と数字を含めてください。"}

        cursor.execute("SELECT COUNT(*) AS cnt FROM gachaco_user WHERE id = %s AND email = %s", (id, email))
        if cursor.fetchone()['cnt'] == 0:
            return {"success": False, "error": "IDとメールが一致しません。"}

        hashed_new_pw = pwd_context.hash(newpw)
        cursor.execute("UPDATE gachaco_user SET pw = %s WHERE id = %s AND email = %s", (hashed_new_pw, id, email))
        db.commit()

        key = (id, email)
        if key in reset_auth_codes:
            del reset_auth_codes[key]
        return {"success": True, "message": "パスワードが正常に再設定されました。"}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        cursor.close()

# --- 가게 및 가챠 정보 ---
@app.get("/api/stores", response_model=List[StoreLocation])
def get_all_stores(db: MySQLConnection = Depends(get_db)):
    try:
        cursor = db.cursor(dictionary=True)
        query = "SELECT store_id, store_name AS name, address, phone_number, image_path, lat, lng FROM info"
        cursor.execute(query)
        results = cursor.fetchall()

        # Convert data types to match the Pydantic model
        for store in results:
            if store.get('lat') is not None:
                store['lat'] = float(store['lat'])
            if store.get('lng') is not None:
                store['lng'] = float(store['lng'])
        
        return results
        
    except Error as e:
        raise HTTPException(status_code=500, detail=f"データベース処理中にエラーが発生しました: {e}")
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()

@app.get("/api/stores/{store_id}/gachas", response_model=List[GachaItem])
def get_gachas_by_store(store_id: int, db: MySQLConnection = Depends(get_db)):
    try:
        cursor = db.cursor(dictionary=True)
        query = """
            SELECT g.gacha_id, g.gacha_name AS name, sp.stock_quantity, sp.price
            FROM store_products AS sp
            JOIN gacha AS g ON sp.gacha_id = g.gacha_id
            WHERE sp.store_id = %s
        """
        cursor.execute(query, (store_id,))
        db_results = cursor.fetchall()

        return [
            GachaItem(**item, img_url=f"/static/images/{item['gacha_id']}.jpg")
            for item in db_results
        ]
    except Error as e:
        raise HTTPException(status_code=500, detail=f"データベースエラー: {e}")
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()

# --- 검색 기능 ---
@app.get("/api/search")
def search_shops(query: str = Query(..., min_length=1), db: MySQLConnection = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        keyword = f"%{query}%"
        cursor.execute(
            "SELECT store_id, store_name AS name, address, phone_number, image_path, lat, lng FROM info WHERE store_name LIKE %s OR address LIKE %s OR phone_number LIKE %s",
            (keyword, keyword, keyword),
        )
        result = cursor.fetchall()
        shops = [
            {
                "name": r["name"],
                "address": r["address"],
                "phone_number": r["phone_number"],
                "coordinates": {"lat": float(r["lat"]), "lng": float(r["lng"])},
                "store_id": r["store_id"],
                "image_path": r["image_path"],
            }
            for r in result if r.get("lat") is not None and r.get("lng") is not None
        ]
        return JSONResponse(content=shops)
    except mysql.connector.Error as err:
        return JSONResponse(content={"error": f"Database error: {err}"}, status_code=500)
    except Exception as e:
        return JSONResponse(content={"error": f"An unexpected error occurred: {e}"}, status_code=500)
    finally:
        if cursor:
            cursor.close()

@app.post("/voice-search")
async def voice_search(audio: UploadFile = File(...)):
    try:
        client = speech.SpeechClient()
        content = await audio.read()
        audio_data = speech.RecognitionAudio(content=content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000,
            language_code="ja-JP"
        )
        response = client.recognize(config=config, audio=audio_data)
        if response.results:
            text = response.results[0].alternatives[0].transcript
            return {"text": text}
        else:
            return {"error": "音声からテキストを取得できませんでした。"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/search")
async def integrated_search(query: str, db: mysql.connector.MySQLConnection = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    results = {"gacha": [], "info": [], "board": []}
    try:
        cursor.execute("SELECT gacha_id, gacha_name FROM gacha WHERE gacha_name LIKE %s", (f"%{query}%",))
        results["gacha"] = cursor.fetchall()
        cursor.execute("SELECT store_id, store_name, image_path FROM info WHERE store_name LIKE %s", (f"%{query}%",))
        results["info"] = cursor.fetchall()
        cursor.execute("SELECT id, title, content FROM posts WHERE title LIKE %s OR content LIKE %s", (f"%{query}%", f"%{query}%"))
        results["board"] = cursor.fetchall()
        return {"success": True, "results": results}
    except Error as e:
        return JSONResponse(status_code=500, content={"error": "検索中にエラーが発生しました。"})
    finally:
        cursor.close()

@app.get("/search/board", response_class=HTMLResponse)
async def show_all_board(query: str, request: Request, db: mysql.connector.MySQLConnection = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, Title, Content FROM posts WHERE Title LIKE %s OR Content LIKE %s", (f"%{query}%", f"%{query}%"))
        board_results = cursor.fetchall()
        return templates.TemplateResponse("all_board.html", {"request": request, "query": query, "results": board_results})
    except Error as e:
        return HTMLResponse(content=f"<html><body><h1>エラーが発生しました。</h1><p>{e}</p></body></html>", status_code=500)
    finally:
        cursor.close()


@app.get("/search/gacha", response_class=HTMLResponse)
async def show_all_gacha(query: str, request: Request, db: mysql.connector.MySQLConnection = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT gacha_id, gacha_name FROM gacha WHERE gacha_name LIKE %s", (f"%{query}%",))
        gacha_results = cursor.fetchall()
        return templates.TemplateResponse("all_gacha.html", {"request": request, "query": query, "results": gacha_results})
    finally:
        cursor.close()

@app.get("/search/info", response_class=HTMLResponse)
async def show_all_info(query: str, request: Request, db: mysql.connector.MySQLConnection = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT store_id, store_name, image_path FROM info WHERE store_name LIKE %s", (f"%{query}%",))
        info_results = cursor.fetchall()
        return templates.TemplateResponse("all_info.html", {"request": request, "query": query, "results": info_results})
    finally:
        cursor.close()

# --- 즐겨찾기 ---
@app.post("/api/favorites", status_code=status.HTTP_201_CREATED)
def add_favorite_store(favorite_data: FavoriteStoreRequest, current_user: dict = Depends(get_current_user), db: MySQLConnection = Depends(get_db)):
    user_id = current_user["id"]
    cursor = db.cursor()
    try:
        query = "INSERT INTO favorite_store (user_id, store_id, store_name) VALUES (%s, %s, %s)"
        cursor.execute(query, (user_id, favorite_data.store_id, favorite_data.store_name))
        db.commit()
        return {"message": f"'{favorite_data.store_name}'을(를) 즐겨찾기에 추가했습니다."}
    except mysql.connector.Error as e:
        if e.errno == 1062:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 즐겨찾기에 추가된 가게입니다.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"데이터베이스 오류: {e}")
    finally:
        if cursor: cursor.close()

@app.delete("/api/favorites", status_code=status.HTTP_200_OK)
def remove_favorite_store(favorite_data: FavoriteStoreRequest, current_user: dict = Depends(get_current_user), db: MySQLConnection = Depends(get_db)):
    user_id = current_user["id"]
    cursor = db.cursor()
    try:
        query = "DELETE FROM favorite_store WHERE user_id = %s AND store_id = %s"
        cursor.execute(query, (user_id, favorite_data.store_id))
        db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="삭제할 즐겨찾기 정보를 찾을 수 없습니다.")
        return {"message": f"'{favorite_data.store_name}'을(를) 즐겨찾기에서 삭제했습니다."}
    except mysql.connector.Error as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"데이터베이스 오류: {e}")
    finally:
        if cursor: cursor.close()

# --- 마이페이지 ---
@app.get("/me")
def get_my_info(token: str = Depends(oauth2_scheme), db: mysql.connector.connection = Depends(get_db)):
    user = get_current_user_from_token(token, db)
    return {"id": user["id"], "nickname": user["nickname"], "email": user["email"]}

@app.post("/update-email")
def update_email(new_email: dict, token: str = Depends(oauth2_scheme), db: mysql.connector.connection = Depends(get_db)):
    user = get_current_user_from_token(token, db)
    cursor = db.cursor()
    try:
        cursor.execute("UPDATE gachaco_user SET email = %s WHERE id = %s", (new_email["new_email"], user["id"]))
        db.commit()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        cursor.close()

@app.delete("/delete-account")
def delete_account(token: str = Depends(oauth2_scheme), db: mysql.connector.connection = Depends(get_db)):
    user = get_current_user_from_token(token, db)
    cursor = db.cursor()
    try:
        cursor.execute("DELETE FROM gachaco_user WHERE id = %s", (user["id"],))
        db.commit()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        cursor.close()

@app.get("/api/user/favorites/stores", response_model=List[FavoriteStoreRequest])
def get_favorite_stores(current_user: dict = Depends(get_current_user), db: mysql.connector.connection = Depends(get_db)):
    user_id = current_user["id"]
    cursor = db.cursor(dictionary=True)
    try:
        query = "SELECT store_id, store_name FROM favorite_store WHERE user_id = %s"
        cursor.execute(query, (user_id,))
        return cursor.fetchall()
    except Error as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"データベースエラー: {e}")
    finally:
        if cursor: cursor.close()

@app.get("/my-liked-gachas")
def get_my_liked_gachas(token: str = Depends(oauth2_scheme), db: mysql.connector.connection = Depends(get_db)):
    user = get_current_user_from_token(token, db)
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT g.* FROM gacha AS g
            JOIN gacha_heart_log AS h ON g.gacha_id = h.gacha_id
            WHERE h.id = %s
        """, (user["id"],))
        return {"success": True, "gachas": cursor.fetchall()}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        cursor.close()

@app.get("/my-posts")
def get_my_posts(token: str = Depends(oauth2_scheme), db: mysql.connector.connection = Depends(get_db)):
    user = get_current_user_from_token(token, db)
    cursor = db.cursor(dictionary=True)
    try:
        # 이 쿼리는 이미 올바르게 post_id, title, created_at을 board 테이블에서 가져옵니다.
        cursor.execute("SELECT post_id, title, created_at FROM board WHERE user_id = %s ORDER BY created_at DESC", (user["id"],))
        return {"success": True, "posts": cursor.fetchall()}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        cursor.close()

@app.get("/my-commented-posts")
def get_my_commented_posts(token: str = Depends(oauth2_scheme), db: mysql.connector.connection = Depends(get_db)):
    user = get_current_user_from_token(token, db)
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                b.post_id,
                b.title,
                b.created_at,
                u.nickname AS author -- 'gachaco_user' 테이블에 'nickname' 컬럼이 있으므로 이것을 사용합니다.
            FROM
                comments c
            JOIN
                board b ON c.post_id = b.post_id
            JOIN
                gachaco_user u ON b.user_id = u.id
            WHERE
                c.user_id = %s -- 댓글을 단 사용자의 ID로 필터링합니다.
            GROUP BY -- 중복된 게시물을 제거하고, 각 필드를 명확히 지정합니다.
                b.post_id, b.title, b.created_at, u.nickname
            ORDER BY
                b.created_at DESC
        """, (user["id"],))
        return {"success": True, "posts": cursor.fetchall()}
    except Exception as e:
        # 실제 에러 메시지를 로그에 기록하여 디버깅에 활용하세요.
        print(f"Error in get_my_commented_posts: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        cursor.close()

@app.get("/my-liked-posts")
def get_my_liked_posts(token: str = Depends(oauth2_scheme), db: mysql.connector.connection = Depends(get_db)):
    user = get_current_user_from_token(token, db)
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                b.post_id,
                b.title,
                b.created_at,
                u.nickname AS author -- 'gachaco_user' 테이블에 'nickname' 컬럼이 있으므로 이것을 사용합니다.
            FROM
                post_likes pl
            JOIN
                board b ON pl.post_id = b.post_id
            JOIN
                gachaco_user u ON b.user_id = u.id
            WHERE
                pl.user_id = %s -- 좋아요를 누른 사용자의 ID로 필터링합니다.
            ORDER BY
                b.created_at DESC
        """, (user["id"],))
        return {"success": True, "posts": cursor.fetchall()}
    except Exception as e:
        # 실제 에러 메시지를 로그에 기록하여 디버깅에 활용하세요.
        print(f"Error in get_my_liked_posts: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        cursor.close()
        
@app.get("/gachainfopage")
def gachainfopage(request: Request):
    return templates.TemplateResponse("gachainfopage_jp.html", {"request": request})

@app.get("/gachanewpage")
def gachanewpage(request: Request):
    return templates.TemplateResponse("gachanewpage_jp.html", {"request": request})

@app.get("/gachalove")
def gachalove(request: Request):
    return templates.TemplateResponse("gachalove_jp.html", {"request": request})

#----------------인기가챠 상품 눌렀을때 가져오는 엔드포인트 ---------------------------------------------------------------
@app.get("/api/gacha/list")#  MYSQL에서 전체 가챠 상품들을 불러오는 API 임
def get_gacha_list(db: mysql.connector.connection = Depends(get_db)): #이 함수는 FASTAPI 백엔드에서 MYSQL에 저장된 모든 가챠 데이터를 JSON형태로 응답하는 API
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM gacha ORDER BY gacha_heart DESC")
    results = cursor.fetchall()
    cursor.close()

    # date 타입을 문자열로 변환
    for row in results:#-날짜(date-DB 컬럼)가 JSON으로 바로 못 보내서 isoformat()으로 문자열로 바꿨음.
        if 'gacha_date' in row and row['gacha_date']:
            row['gacha_date'] = row['gacha_date'].isoformat()  # 'YYYY-MM-DD' 형식 문자열로 변환
    return JSONResponse(content=results)


@app.get("/gachadetail/{id}")
def get_detail(request: Request, id: int):
    return templates.TemplateResponse("gachadetailpage_jp.html", {"request": request, "id": id})

#이건 그냥 HTML 파일만 반환.
#이 HTML 안에는 JS 파일(gachadetailpage_jp.js)이 연결돼 있어.
@app.get("/api/gacha/detail/{gacha_id}")
def get_gacha_detail(gacha_id: int, db: mysql.connector.connection = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM gacha WHERE gacha_id = %s", (gacha_id,))
    result = cursor.fetchone()
    cursor.close()

    if result is None:
        return JSONResponse(status_code=404, content={"message": "Not found"})
    
    if 'gacha_date' in result and result['gacha_date']:
        result['gacha_date'] = result['gacha_date'].isoformat()

    return JSONResponse(content=result) #gachadetailpage.js 로 json데이터 전송

#-- 가챠 인기페이지 찜버튼 눌렀을때 데이터 베이스 +1 하게 하기--------------------------------------------

@app.post("/api/gacha/heart/{gacha_id}")
def toggle_heart(gacha_id: int, authorization: str = Header(None), db: mysql.connector.connection = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        return JSONResponse(status_code=401, content={"error": "로그인이 필요합니다."})

    try:
        # JWT 토큰에서 사용자 ID 추출
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")  # 로그인한 사용자 ID
        if not user_id:
            raise JWTError("Invalid token")

        cursor = db.cursor(dictionary=True)

        # ✅ 찜 여부 확인 (id -> user_id)
        cursor.execute("SELECT * FROM gacha_heart_log WHERE id = %s AND gacha_id = %s", (user_id, gacha_id))
        already_liked = cursor.fetchone()

        if already_liked:
            # 찜 해제 → DB에서 삭제 + gacha_heart -1
            cursor.execute("DELETE FROM gacha_heart_log WHERE id = %s AND gacha_id = %s", (user_id, gacha_id))
            cursor.execute("UPDATE gacha SET gacha_heart = gacha_heart - 1 WHERE gacha_id = %s", (gacha_id,))
            db.commit()
            liked = False
        else:
            # 찜 추가 → DB에 저장 + gacha_heart +1
            cursor.execute("INSERT INTO gacha_heart_log (id, gacha_id) VALUES (%s, %s)", (user_id, gacha_id))
            cursor.execute("UPDATE gacha SET gacha_heart = gacha_heart + 1 WHERE gacha_id = %s", (gacha_id,))
            db.commit()
            liked = True

        cursor.close()
        return {"message": "하트 상태 토글 완료", "liked": liked}

    except JWTError:
        return JSONResponse(status_code=401, content={"error": "잘못된 토큰입니다."})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    
#---------------가챠 검색 api-----------------------------------------------------------
@app.get("/api/gacha/search")
def search_gacha(q: str = "", db: mysql.connector.connection = Depends(get_db)):
    try:
        cursor = db.cursor(dictionary=True)
        
        # 검색어가 비어있으면 전체 목록 반환
        if not q.strip():
            cursor.execute("SELECT * FROM gacha ORDER BY gacha_heart DESC")
        else:
            # gacha_name과 gacha_hash에서 검색
            search_query = f"%{q}%"
            cursor.execute(
                "SELECT * FROM gacha WHERE gacha_name LIKE %s OR gacha_hash LIKE %s ORDER BY gacha_heart DESC",
                (search_query, search_query)
            )
        
        results = cursor.fetchall()
        cursor.close()
        
        # date 타입을 문자열로 변환
        for row in results:
            if 'gacha_date' in row and row['gacha_date']:
                row['gacha_date'] = row['gacha_date'].isoformat()
        
        return JSONResponse(content=results)
        
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

#----------------새상품 가챠 목록 API (gacha_date 최신순)---------------------------------------------------------------
@app.get("/api/gacha/newlist") # 가챠 데이터를 최신순으로 정렬하여 반환
def get_gacha_newlist(db: mysql.connector.connection = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM gacha ORDER BY gacha_date DESC")
    results = cursor.fetchall() #인기페이지는 ORDER BY gacha_heart DESC
    cursor.close()

    # date 타입을 문자열로 변환
    for row in results:
        if 'gacha_date' in row and row['gacha_date']:
            row['gacha_date'] = row['gacha_date'].isoformat()  # 'YYYY-MM-DD' 형식 문자열로 변환
    
    return JSONResponse(content=results)
#------------------------------------------------------------------------------------------------
# gachapage.py에 추가할 API 엔드포인트
@app.get("/api/gacha/user-hearts")
def get_user_hearts(authorization: str = Header(None), db: mysql.connector.connection = Depends(get_db)):
    """로그인한 사용자가 좋아요한 가챠 목록을 반환"""
    if not authorization or not authorization.startswith("Bearer "):
        return JSONResponse(status_code=401, content={"error": "로그인이 필요합니다."})

    try:
        # JWT 토큰에서 사용자 ID 추출
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise JWTError("Invalid token")

        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT gacha_id FROM gacha_heart_log WHERE id = %s", (user_id,))
        results = cursor.fetchall()
        cursor.close()

        # 좋아요한 가챠 ID 목록만 반환
        liked_gacha_ids = [row['gacha_id'] for row in results]
        return JSONResponse(content={"liked_gacha_ids": liked_gacha_ids})

    except JWTError:
        return JSONResponse(status_code=401, content={"error": "잘못된 토큰입니다."})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    
@app.get("/api/favorites")
async def get_favorites(request: Request, db: mysql.connector.connection = Depends(get_db)):
    token = request.headers.get("Authorization")
    user_id = decode_token_and_get_user_id(token)
    if not user_id:
        return []
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT gi.gacha_id, gi.gacha_name, gi.gacha_date, gi.gacha_hash, gi.gacha_price, gi.gacha_description, gi.gacha_heart
        FROM gacha gi
        JOIN gacha_heart_log ghl ON gi.gacha_id = ghl.gacha_id
        WHERE ghl.user_id = %s
        """, (user_id,)
    )
    results = cursor.fetchall()
    return results

#-------------------백엔드에 JSON만 반환하는 API---------------------------------------------------------------
@app.get("/api/gachalove")
async def get_favorite_items(request: Request, db: mysql.connector.connection = Depends(get_db)):
    token = request.headers.get("Authorization")
    user_id = decode_token_and_get_user_id(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT g.* FROM gacha g
            JOIN gacha_heart_log h ON g.gacha_id = h.gacha_id
            WHERE h.id = %s
        """, (user_id,))
        
        favorites = cursor.fetchall()

        # ⚠️ json.dumps로 먼저 문자열로 변환하고 content에 넣는다
        json_data = json.dumps({"items": favorites}, default=str)
        return JSONResponse(content=json.loads(json_data), status_code=200)

    except Exception as e:
        print("DB Error:", e)
        raise HTTPException(status_code=500, detail="Database error")
    

    # --- 즐겨찾기 API 라우트 (가게 & 가챠) ---
# 공통 로직을 처리하는 내부 함수
async def _toggle_favorite(
    item_type: str,
    req_body: FavoriteRequest,
    user: dict,
    db: mysql.connector.connection,
    add: bool
):
    user_id_from_token = user["id"]
    # 💡 [디버깅 3] 찜 추가/삭제 시 어떤 데이터가 사용되는지 출력
    print(f"--- [찜 토글 실행] 타입: {item_type}, 유저 ID: '{user_id_from_token}', 아이템 ID: {req_body.id}, 추가?: {add} ---")

    # 💡 item_type에 따라 테이블과 컬럼 이름을 정확히 지정
    if item_type == 'store':
        table_name = "favorite_store"
        id_column = "store_id"
        name_column = "store_name"
        user_id_column = "user_id" # 가게 테이블의 사용자 ID 컬럼
    elif item_type == 'gacha':
        table_name = "gacha_heart_log" # 💡 기존에 사용하던 테이블 이름으로 수정
        id_column = "gacha_id"
        user_id_column = "id"         # 💡 가챠 테이블의 사용자 ID 컬럼
    else:
        raise HTTPException(status_code=400, detail="Invalid item type")

    try:
        cursor = db.cursor()
        user_id = user["id"]

        if add:
            if item_type == 'store':
                # 💡 가게의 경우, name을 포함하여 INSERT
                query = f"INSERT INTO {table_name} ({user_id_column}, {id_column}, {name_column}) VALUES (%s, %s, %s)"
                cursor.execute(query, (user_id, req_body.id, req_body.name))
            else: # 가챠의 경우, 이름 없이 ID만 INSERT
                query = f"INSERT INTO {table_name} ({user_id_column}, {id_column}) VALUES (%s, %s)"
                cursor.execute(query, (user_id, req_body.id))
            message = "즐겨찾기에 추가했습니다."
        else: # 삭제 로직
            query = f"DELETE FROM {table_name} WHERE {user_id_column} = %s AND {id_column} = %s"
            cursor.execute(query, (user_id, req_body.id))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="삭제할 즐겨찾기 정보를 찾을 수 없습니다.")
            message = "즐겨찾기에서 삭제했습니다."

        db.commit()
        return {"message": message}
    except mysql.connector.Error as e:
        if e.errno == 1062:
            raise HTTPException(status_code=409, detail="이미 즐겨찾기에 추가된 항목입니다.")
        raise HTTPException(status_code=500, detail=f"데이터베이스 오류: {e}")
    finally:
        if cursor: cursor.close()

# --- 실제 API 엔드포인트들 ---
@app.post("/api/favorites/store", status_code=status.HTTP_201_CREATED)
async def add_favorite_store(req: FavoriteRequest, user: dict = Depends(get_current_user), db: mysql.connector.connection = Depends(get_db)):
    """가게를 즐겨찾기에 추가"""
    return await _toggle_favorite('store', req, user, db, add=True)

@app.delete("/api/favorites/store", status_code=status.HTTP_200_OK)
async def remove_favorite_store(req: FavoriteRequest, user: dict = Depends(get_current_user), db: mysql.connector.connection = Depends(get_db)):
    """가게를 즐겨찾기에서 삭제"""
    return await _toggle_favorite('store', req, user, db, add=False)

@app.post("/api/favorites/gacha", status_code=status.HTTP_201_CREATED)
async def add_favorite_gacha(req: FavoriteRequest, user: dict = Depends(get_current_user), db: mysql.connector.connection = Depends(get_db)):
    """가챠를 즐겨찾기에 추가"""
    return await _toggle_favorite('gacha', req, user, db, add=True)

@app.delete("/api/favorites/gacha", status_code=status.HTTP_200_OK)
async def remove_favorite_gacha(req: FavoriteRequest, user: dict = Depends(get_current_user), db: mysql.connector.connection = Depends(get_db)):
    """가챠를 즐겨찾기에서 삭제"""
    return await _toggle_favorite('gacha', req, user, db, add=False)

# --- 즐겨찾기 상태 확인 라우트 ---
@app.get("/api/favorites/check/store")
def check_favorite_store_status(store_id: int, user: dict = Depends(get_current_user), db: mysql.connector.connection = Depends(get_db)):
    """현재 유저가 특정 가게를 즐겨찾기했는지 확인"""
    try:
        cursor = db.cursor()
        query = "SELECT EXISTS(SELECT 1 FROM favorite_store WHERE user_id = %s AND store_id = %s)"
        cursor.execute(query, (user["id"], store_id))
        is_favorited = bool(cursor.fetchone()[0])
        return {"is_favorite": is_favorited}
    finally:
        if 'cursor' in locals() and cursor: cursor.close()

@app.get("/api/favorites/gacha", response_model=List[dict])
def get_favorite_gachas(user: dict = Depends(get_current_user), db: mysql.connector.connection = Depends(get_db)):
    """ 현재 유저가 즐겨찾기한 모든 가챠의 ID 목록을 반환합니다. """
    try:
        user_id_from_token = user["id"]
        # 💡 [디버깅 1] 함수가 어떤 유저 ID로 호출되었는지 출력
        print(f"--- [찜 목록 조회 시작] 유저 ID: '{user_id_from_token}' ---")

        cursor = db.cursor(dictionary=True)
        query = "SELECT gacha_id FROM gacha_heart_log WHERE id = %s"
        cursor.execute(query, (user_id_from_token,))

        # 💡 [디버깅 2] DB에서 실행된 실제 쿼리문과 조회 결과 출력
        print(f"실행된 쿼리: {cursor.statement}")
        favorites = cursor.fetchall()
        print(f"조회된 데이터 ({len(favorites)}개): {favorites}")

        return favorites
    except mysql.connector.Error as e:
        print(f"조회 중 DB 오류 발생: {e}") # 💡 오류도 출력
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"데이터베이스 오류: {e}")
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()

# ----------- 게시판 API ------------

#미디어 uploads 파일에 저장
app.mount("/uploads", StaticFiles(directory=BASE_DIR / "static/uploads"), name="uploads")

# JWT 토큰을 헤더로 받아서 로그인 상태와 유저 정보를 반환하는 API
@app.get("/api/me/token")
def get_current_user_token(token: str = Depends(oauth2_scheme), db: mysql.connector.connection = Depends(get_db)):
    user = get_current_user_from_token(token, db)
    return {
        "logged_in": True,
        "user_id": user["id"],
        "nickname": user["nickname"],
        "email": user["email"]
    }


# 게시글 생성 API (텍스트 + 미디어 파일 업로드)
@app.post("/api/create-post")
async def create_post(
    title: str = Form(...),
    content: str = Form(...),
    tag: str = Form(...),
    media: List[UploadFile] = File(default=[]),
    current_user: dict = Depends(get_current_user),
    db: mysql.connector.connection = Depends(get_db_connection)
):
    user_id = current_user["id"]
    cursor = db.cursor()

    try:
        # posts 테이블에 저장 (post_id 자동 생성)
        cursor.execute(
            "INSERT INTO posts (title, content, tag, user_id) VALUES (%s, %s, %s, %s)",
            (title, content, tag, user_id)
        )
        post_id = cursor.lastrowid

        # board 테이블에도 post_id 포함해 저장
        cursor.execute(
            "INSERT INTO board (user_id, title, content, created_at, post_id) VALUES (%s, %s, %s, NOW(), %s)",
            (user_id, title, content, post_id)
        )

        # 업로드 디렉토리 설정
        upload_dir = os.path.join("static", "uploads")
        os.makedirs(upload_dir, exist_ok=True)

        # 파일 저장 및 DB 기록
        for file in media:
            ext = file.filename.split(".")[-1]
            filename = f"{uuid.uuid4().hex}.{ext}"
            save_path = os.path.join("static", "uploads", filename)
            public_url = f"/uploads/{filename}"

            with open(save_path, "wb") as f:
                f.write(await file.read())

            # post_media 테이블에 파일 정보 저장
            cursor.execute(
                "INSERT INTO post_media (post_id, media_type, media_url) VALUES (%s, %s, %s)",
                (post_id, file.content_type, public_url)
            )

        db.commit()
        return {"success": True, "message": "投稿が完了しました。", "post_id": post_id}

    except Exception as e:
        db.rollback()
        print("投稿保存エラー:", e)
        return {"success": False, "error": str(e)}

    finally:
        cursor.close()

#게시글 수정 API(수정)
@app.put("/api/update-post/{post_id}")
async def update_post(
    post_id: int = Path(...),
    title: str = Form(...),
    content: str = Form(...),
    tag: str = Form(...),
    media: Optional[str] = Form(default=None),
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("id"):
        raise HTTPException(status_code=401, detail="ログインが必要です。")

    db = get_db_connection()
    cursor = db.cursor()

    try:
        # 작성자 확인
        cursor.execute("SELECT user_id FROM posts WHERE id = %s", (post_id,))
        row = cursor.fetchone()
        if not row or row[0] != current_user["id"]:
            raise HTTPException(status_code=403, detail="修正権限がありません。")

        # posts 테이블 업데이트
        cursor.execute(
            "UPDATE posts SET title = %s, content = %s, tag = %s WHERE id = %s",
            (title, content, tag, post_id)
        )

        # board 테이블 업데이트 (post_id 기준)
        cursor.execute(
            "UPDATE board SET title = %s, content = %s WHERE post_id = %s",
            (title, content, post_id)
        )

        # 미디어 처리 (기존 로직 유지)
        if media:
            media_data = json.loads(media)
            cursor.execute("DELETE FROM post_media WHERE post_id = %s", (post_id,))

            upload_dir = os.path.join("static", "uploads")
            os.makedirs(upload_dir, exist_ok=True)

            for media_item in media_data:
                file_data = media_item.get('data', '')
                mime_type = media_item.get('type', 'image/png')

                if file_data.startswith('data:'):
                    try:
                        header, encoded = file_data.split(',', 1)
                        file_bytes = base64.b64decode(encoded)
                        ext = mime_type.split('/')[-1].split(';')[0]
                        filename = f"{uuid.uuid4()}.{ext}"
                        file_path = os.path.join(upload_dir, filename)

                        with open(file_path, 'wb') as f:
                            f.write(file_bytes)

                        media_url = f"/uploads/{filename}"

                        cursor.execute(
                            "INSERT INTO post_media (post_id, media_type, media_url) VALUES (%s, %s, %s)",
                            (post_id, mime_type, media_url)
                        )
                    except Exception as e:
                        print(f"メディアストレージエラー: {e}")
                        continue
                elif file_data.startswith('/uploads/'):
                    cursor.execute(
                        "INSERT INTO post_media (post_id, media_type, media_url) VALUES (%s, %s, %s)",
                        (post_id, mime_type, file_data)
                    )

        db.commit()
        return {"message": "投稿が修正されました。"}

    except Exception as e:
        db.rollback()
        print(f"投稿修正エラー: {e}")
        raise HTTPException(status_code=500, detail="投稿修正に失敗しました。")

    finally:
        cursor.close()
        db.close()



# 게시글 삭제 API(수정)
@app.delete("/api/delete-post/{post_id}")
async def delete_post(
    post_id: int = Path(...),
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("id"):
        raise HTTPException(status_code=401, detail="ログインが必要です。")

    db = get_db_connection()
    cursor = db.cursor()

    try:
        # 작성자 확인
        cursor.execute("SELECT user_id FROM posts WHERE id = %s", (post_id,))
        row = cursor.fetchone()
        if not row or row[0] != current_user["id"]:
            raise HTTPException(status_code=403, detail="削除権限がありません。")

        # 미디어 먼저 삭제
        cursor.execute("DELETE FROM post_media WHERE post_id = %s", (post_id,))

        # posts 삭제하면 ON DELETE CASCADE로 board 자동 삭제됨
        cursor.execute("DELETE FROM posts WHERE id = %s", (post_id,))

        db.commit()
        return {"message": "投稿が削除されました。"}

    except Exception as e:
        db.rollback()
        print(f"投稿削除エラー: {e}")
        raise HTTPException(status_code=500, detail="投稿削除に失敗しました。")

    finally:
        cursor.close()
        db.close()

# 게시글 목록 조회 (좋아요 수, 작성자 닉네임, 미디어 포함)
@app.get("/api/posts")
async def get_posts():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)  # ✅ 한 번만 선언
    try:
        cursor.execute("""
            SELECT id, user_id, title, content, created_at, tag
            FROM posts ORDER BY created_at DESC
        """)
        posts = cursor.fetchall()

        for post in posts:
            post["tag"] = post.get("tag", "")

            # ✅ 닉네임 조회
            cursor.execute("SELECT nickname FROM gachaco_user WHERE id = %s", (post["user_id"],))
            nickname_result = cursor.fetchone()
            post["author"] = nickname_result["nickname"] if nickname_result else "不明"

            # ✅ 좋아요 수 조회 (cursor2 제거)
            cursor.execute("SELECT COUNT(*) AS count FROM post_likes WHERE post_id = %s", (post["id"],))
            like_result = cursor.fetchone()
            post["like_count"] = like_result["count"] if like_result else 0

            # ✅ 미디어 조회
            cursor.execute("""
                SELECT media_type, media_url
                FROM post_media
                WHERE post_id = %s
                ORDER BY uploaded_at
            """, (post["id"],))
            media_results = cursor.fetchall()
            post["media"] = [
                {"type": media["media_type"], "data": media["media_url"]}
                for media in media_results
            ]

        return posts
    finally:
        cursor.close()
        db.close()



# 좋아요 수 조회
@app.get("/api/like-count/{post_id}")
async def like_count(post_id: int):
    db = get_db_connection()
    cursor = db.cursor()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM post_likes WHERE post_id = %s", (post_id,))
        (count,) = cursor.fetchone()
        return {"count": count}
    finally:
        cursor.close()
        db.close()


# 사용자의 좋아요 여부 확인
@app.get("/api/like-status/{post_id}")
async def like_status(post_id: int, current_user: dict = Depends(get_current_user)):
    if not current_user["id"]:
        return {"liked": False, "count": 0}
    
    db = get_db_connection()
    cursor = db.cursor()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM post_likes WHERE post_id = %s AND user_id = %s", (post_id, current_user["id"]))
        (user_liked,) = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) FROM post_likes WHERE post_id = %s", (post_id,))
        (total_count,) = cursor.fetchone()
        
        return {
            "liked": user_liked > 0,
            "count": total_count
        }
    finally:
        cursor.close()
        db.close()


# 좋아요 토글 (누르면 추가, 다시 누르면 제거)
@app.post("/api/toggle-like/{post_id}")
async def toggle_like(post_id: int, current_user: dict = Depends(get_current_user)):
    if not current_user["id"]:
        raise HTTPException(status_code=401, detail="ログインが必要です。")

    db = get_db_connection()
    cursor = db.cursor()
    cursor = db.cursor()

    try:
        cursor.execute("SELECT * FROM post_likes WHERE post_id = %s AND user_id = %s", (post_id, current_user["id"]))
        existing = cursor.fetchone()

        if existing:
            # 이미 좋아요 → 삭제
            cursor.execute("DELETE FROM post_likes WHERE post_id = %s AND user_id = %s", (post_id, current_user["id"]))
            db.commit()
            liked = False
        else:
            # 새 좋아요 추가
            cursor.execute("SELECT title FROM posts WHERE id = %s", (post_id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="投稿が存在しません。")
            post_title = row[0]
            cursor.execute("INSERT INTO post_likes (post_id, user_id, title) VALUES (%s, %s, %s)",
                            (post_id, current_user["id"], post_title))
            db.commit()
            liked = True

        # 좋아요 총합 반환
        cursor.execute("SELECT COUNT(*) FROM post_likes WHERE post_id = %s", (post_id,))
        (count,) = cursor.fetchone()

        return {
            "liked": liked,
            "count": count
        }
    finally:
        cursor.close()
        db.close()


# 댓글 생성 요청 모델 정의 (Pydantic)
class CommentCreate(BaseModel):
    content: str

# 댓글 생성 API
@app.post("/api/comments/{post_id}")
async def create_comment(
    post_id: int,
    comment: CommentCreate,
    current_user: dict = Depends(get_current_user)
):
    if not current_user["id"]:
        raise HTTPException(status_code=401, detail="ログインが必要です。")
    db = get_db_connection()
    cursor = db.cursor()
    cursor = db.cursor()
    content = comment.content
    try:
        # 게시글 존재 확인 (제목 가져오기)
        cursor.execute("SELECT title FROM posts WHERE id = %s", (post_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="この投稿は存在しません。")
        post_title = row[0]
        # 댓글 저장
        cursor.execute(
            "INSERT INTO comments (post_id, user_id, content, title) VALUES (%s, %s, %s, %s)",
            (post_id, current_user["id"], content, post_title)
        )
        db.commit()
        return {"message": "コメントが保存されました。"}
    finally:
        cursor.close()
        db.close()


# 게시글의 모든 댓글 조회 API
@app.get("/api/comments/{post_id}")
async def get_comments(post_id: int):
    db = get_db_connection()
    cursor = db.cursor()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT c.id, c.user_id, l.nickname, c.content, c.created_at, c.title
            FROM comments c
            JOIN gachaco_user l ON c.user_id = l.id
            WHERE c.post_id = %s
            ORDER BY c.created_at
        """, (post_id,))
        return cursor.fetchall()
    finally:
        cursor.close()
        db.close()


# 댓글 삭제 요청 모델 정의
class CommentDeleteRequest(BaseModel):
    comment_id: int

# 댓글 삭제 API
@app.delete("/api/comments")
def delete_comment(
    request: CommentDeleteRequest = Body(...),
    current_user: dict = Depends(get_current_user)
):
    comment_id = request.comment_id
    db = get_db_connection()
    cursor = db.cursor()
    try:
        # 댓글 작성자 본인인지 확인
        cursor.execute("SELECT user_id FROM comments WHERE id = %s", (comment_id,))
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="コメントが見つかりません。")
        if result[0] != current_user["id"]:
            raise HTTPException(status_code=403, detail="削除権限がありません。")
        # 댓글 삭제
        cursor.execute("DELETE FROM comments WHERE id = %s", (comment_id,))
        db.commit()
        return {"success": True, "message": "コメントが削除されました。"}
    finally:
        cursor.close()
        db.close()


@app.get("/gacha_board", response_class=HTMLResponse)
def serve_gacha_board(request: Request):
    return templates.TemplateResponse("gacha_board.html", {"request": request})

@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    return templates.TemplateResponse("settings.html", {"request": request})