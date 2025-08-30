// rest.js - 検索およびその他の API 呼び出し関連関数

/* ===== 회원가입·로그인 모달 전용 스크립트 ===== */

/* ---------- 공통 메시지 ---------- */
function displayMessage(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    alert(message);
}

/* ---------- 모달 열기·닫기 ---------- */
function openLoginModal() { document.getElementById('loginModal').classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeLoginModal() { document.getElementById('loginModal').classList.remove('active'); document.body.style.overflow = 'auto'; }

function openSignupModal() {
    ['signup-id', 'signup-nickname', 'signup-password', 'signup-password-confirm', 'signup-email']
        .forEach(id => document.getElementById(id).value = '');
    document.getElementById('signupModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeSignupModal() { document.getElementById('signupModal').classList.remove('active'); document.body.style.overflow = 'auto'; }

function switchToSignup() { closeLoginModal(); setTimeout(openSignupModal, 100); }
function switchToLogin() { closeSignupModal(); setTimeout(openLoginModal, 100); }

function openFindIdModal() { document.getElementById('findIdModal').classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeFindIdModal() { document.getElementById('findIdModal').classList.remove('active'); document.body.style.overflow = 'auto'; }

function openResetPwModal() { document.getElementById('resetPwModal').classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeResetPwModal() { document.getElementById('resetPwModal').classList.remove('active'); document.body.style.overflow = 'auto'; }

/* ESC 키로 모달 닫기 */
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeLoginModal(); closeSignupModal(); closeFindIdModal(); closeResetPwModal(); }
});


// DOMContentLoaded 이벤트 리스너: 도큐먼트 로딩 후에 이벤트 핸들러 등록
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.value = ""; // 이 줄이 핵심!
        searchInput.addEventListener('keydown', function(event) {
            if (event.key === "Enter") {
                handleTextSearch();
            }
        });
    }
    // 텍스트 검색 버튼 클릭 시 검색 실행
    const searchButton = document.querySelector('.search-btn');
    if (searchButton) {
        searchButton.addEventListener('click', handleTextSearch);
    }

    // 음성 검색 버튼 클릭 시 음성 검색 실행
    const voiceSearchButton = document.querySelector('.voice-search-btn');
    if (voiceSearchButton) {
        voiceSearchButton.addEventListener('click', handleVoiceSearch);
    }

    // 모달 외부 클릭 시 닫기 (authModal.js의 로직을 유지)
    ['loginModal', 'signupModal', 'findIdModal', 'resetPwModal'].forEach(id => {
        const m = document.getElementById(id);
        if (!m) return;
        m.addEventListener('click', e => {
            if (e.target === m) {
                if (id === 'loginModal') closeLoginModal();
                else if (id === 'signupModal') closeSignupModal();
                else if (id === 'findIdModal') closeFindIdModal();
                else if (id === 'resetPwModal') closeResetPwModal();
            }
        });
    });

    // 페이지 로드 시 로그인 상태 확인 및 버튼 업데이트
    updateAuthButtons();

    /* ������ 여기 추가하면 됨 */
    const loveBtn = document.getElementById('gachaLoveButton');
    if (loveBtn) {
        loveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (localStorage.getItem('accessToken')) {
                window.location.href = "/gachalove";
            } else {
                openLoginModal();
            }
        });
    }
});


// 텍스트 검색 처리 함수
async function handleTextSearch() {
    const query = document.querySelector('.search-input').value;
    if (!query) {
        displayMessage("検索語を入力してください。", "warning");
        return;
    }

    // 검색 섹션 표시
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('searchResultSection').style.display = 'block';
    document.getElementById('searchResultTitle').innerText = `“${query}” 検索結果`;
    const body = document.getElementById('searchResultBody');
    body.innerHTML = `<p style="color:#888;">検索中...</p>`;

    try {
        const res = await fetch(`/search?query=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (!data.success) {
            body.innerHTML = `<p style="color:#888;">検索に失敗しました。</p>`;
            return;
        }

        const { gacha, info, board } = data.results;
        let html = '';

        // 가챠 정보
        const maxGachaItems = 4;
        if (gacha.length > 0) {
            html += `<h3 class="search-card-title">ガチャ</h3><div class="horizontal-scroll-container">`;

            gacha.slice(0, maxGachaItems).forEach(item => {
                // 이 부분을 수정합니다:
                const imageSrc = `/gacha-images/${item.gacha_id}.jpg`; // 이미지 경로를 /gacha-images/ 로 변경
                html += `
                    <div class="search-card gacha-card-small">
                        <a href="/gachadetail/${item.gacha_id}" class="search-card-link">
                            <div class="search-card-title">${item.gacha_name}</div>
                            <div class="search-card-content">ID: ${item.gacha_id}</div>
                            <img src="${imageSrc}" alt="${item.gacha_name}" style="width:100%; margin-top:10px;" onerror="this.onerror=null;this.src='/gacha-images/default.jpg';"> </a>
                    </div>
                `;
            });
            html += `</div>`;
        }

        // 가게 정보
        const maxInfoItems = 4;
        if (info.length > 0) {
            html += `<h3 class="search-card-title">店舗情報</h3><div class="horizontal-scroll-container">`;
            info.slice(0, maxInfoItems).forEach(store => {
                html += `
<div class="search-card info-card-small">

    <a href="/map?store_id=${store.store_id}" class="search-card-link">

        <div class="search-card-title">${store.store_name}</div>
        ${store.image_path ? `<img src="${store.image_path}" style="width:100%; margin-top:10px;"
            onerror="this.onerror=null;this.src='/static/info/default.jpg';">` : `<img src="/static/info/default.jpg"
            style="width:100%; margin-top:10px;">`}
    </a>
</div>
`;
            });
            html += `</div>`; // Close horizontal-scroll-container

            if (info.length > maxInfoItems) {
                html += `
                    <button class="more-btn" onclick="window.location.href='/search/info?query=${encodeURIComponent(query)}'">
                        店舗をもっと見る
                    </button>
                `;
            }
        }

        // 게시판 검색 결과
        const maxBoardItems = 3;

        if (board.length > 0) {
            html += `<h3 class="search-card-title">掲示板</h3><div class="search-results">`;

            board.slice(0, maxBoardItems).forEach(post => {
                html += `
                    <a href="/gacha_board?post=${post.id}" class="search-card-link board-card-small">               
                        <div class="search-card">
                            <div class="search-card-title">${post.title}</div>
                            <div class="search-card-content">${post.content}</div>
                        </div>
                    </a>
                `;
            });

            if (board.length > maxBoardItems) {
                html += `
                    <button class="more-btn" onclick="window.location.href='/search/board?query=${encodeURIComponent(query)}'">
                        掲示板をもっと見る
                    </button>
                `;
            }

            html += `</div>`;
        }

        // 아무 결과도 없을 때
        if (html === '') {
            html = `<p style="color:#888;">検索結果がありません。</p>`;
        }

        body.innerHTML = html;

    } catch (err) {
        body.innerHTML = `<p style="color:red;">サーバーエラー: ${err.message}</p>`;
    }
}


// 음성 검색 처리 함수
async function handleVoiceSearch() {
    try {
        // 마이크 권한을 요청
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks = [];

        // 오디오 데이터가 이용 가능해졌을 때 청크 저장
        mediaRecorder.ondataavailable = (event => {
            audioChunks.push(event.data);
        });

        // 녹음이 중지되었을 때 실행되는 로직
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // 오디오 청크를 Blob으로 변환
            const formData = new FormData();
            formData.append("audio", audioBlob); // FormData에 오디오 Blob 추가

            // 백엔드 API에 음성 데이터 전송
            const response = await fetch("/voice-search", {
                method: "POST",
                body: formData
            });

            const result = await response.json(); // 응답을 JSON으로 파싱

            if (result.text) { // 텍스트 변환 성공 시
                document.querySelector('.search-input').value = result.text; // 검색 입력 필드에 텍스트 설정
                handleTextSearch(); // 자동 검색 실행
            } else { // 텍스트 변환 실패 시
                displayMessage("音声認識に失敗しました: " + result.error, "error"); // 커스텀 메시지 사용
            }
        };

        mediaRecorder.start(); // 녹음 시작
        // 5초 후에 녹음 자동 중지
        setTimeout(() => {
            mediaRecorder.stop();
            displayMessage("音声認識が終了しました。", "info"); // 녹음 종료 메시지
        }, 5000);
        displayMessage("音声認識を開始します。5秒間話してください。", "info"); // 녹음 시작 메시지

    } catch (err) {
        displayMessage("マイクへのアクセスに失敗しました: " + err.message, "error"); // 마이크 접근 실패 처리
    }
}


// 로그인 처리 (authModal.js의 로그인 로직을 사용)
function handleLogin(event) {
    event.preventDefault();
    const id = document.getElementById('username').value.trim();
    const pw = document.getElementById('password').value.trim();
    if (!id || !pw) { displayMessage('IDまたはパスワードを入力してください', 'error'); return; }

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pw })
    })
        .then(res => res.ok ? res.json()
            : res.json().then(err => { throw new Error(err.error || '未知のサーバーエラー'); }))
        .then(data => {
            if (data.token && data.token_type === 'bearer') {
                localStorage.setItem('accessToken', data.token);
                localStorage.setItem('isLoggedIn', 'true');
                displayMessage('ログイン成功！', 'success');
                closeLoginModal();
                updateAuthButtons();
                location.reload();
            } else {
                displayMessage(data.error || 'ログイン失敗', 'error');
            }
        })
        .catch(err => displayMessage('サーバーエラー: ' + err.message, 'error'));
}

// 로그아웃 처리 (rest.js의 로직을 사용, 추가된 showMainContent와 mypageContent 숨김 포함)
function handleLogout() {
    localStorage.removeItem("accessToken"); // authModal.js와 일치
    localStorage.removeItem("isLoggedIn"); // authModal.js와 일치
    displayMessage("ログアウトしました。", "success");
    updateAuthButtons(); // 버튼 업데이트
    location.reload();
    // ✅ 메인 콘텐츠로 전환 (rest.js의 추가된 부분)
    showMainContent(); // 이 함수는 제공된 스크립트에는 없으므로, 필요하다면 추가 정의해야 합니다.
    // ✅ 마이페이지 강제 숨김 처리 (rest.js의 추가된 부분)
    document.getElementById('mypageContent').style.display = 'none';
}


// 인증 버튼 업데이트
function updateAuthButtons() {
    const authArea = document.querySelector('.auth-buttons');
    if (localStorage.getItem("isLoggedIn") === "true") {
        authArea.innerHTML = `<button class="btn btn-login" onclick="handleLogout()">ログアウト</button>`;
    } else {
        authArea.innerHTML = `
            <button class="btn btn-login" onclick="openLoginModal()">ログイン</button>
            <button class="btn btn-signup" onclick="openSignupModal()">新規登録</button>
        `;
    }
}


// 회원가입 처리 (rest.js의 로직을 사용)
let isIdChecked = false;
let isNicknameChecked = false;

function handleSignup(event) {
    event.preventDefault();

    const id = document.getElementById('signup-id').value.trim();
    const nickname = document.getElementById('signup-nickname').value.trim();
    const password = document.getElementById('signup-password').value;
    const passwordConfirm = document.getElementById('signup-password-confirm').value;
    const email = document.getElementById('signup-email').value.trim();

    // 중복 확인 안 했으면 차단
    if (!isIdChecked && !isNicknameChecked) {
        displayMessage('IDとニックネームの重複確認をしてください。', 'warning');
        return;
    }
    if (!isIdChecked) {
        displayMessage('IDの重複確認をしてください。', 'warning');
        return;
    }
    if (!isNicknameChecked) {
        displayMessage('ニックネームの重複確認をしてください。', 'warning');
        return;
    }

    if (password !== passwordConfirm) {
        displayMessage('パスワードが一致しません。', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('id', id);
    formData.append('pw', password);
    formData.append('email', email);
    formData.append('nickname', nickname);

    fetch("/signup", {
        method: "POST",
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                displayMessage('会員登録成功: ' + data.message, 'success');
                closeSignupModal();
                openLoginModal();
            } else if (data.error) {
                displayMessage('会員登録失敗: ' + data.error, 'error');
            } else {
                displayMessage('不明な会員登録エラーが発生しました。', 'error');
            }
        })
        .catch(error => {
            displayMessage('サーバーエラー: ' + error.message, 'error');
        });
}

// 중복 확인 (rest.js의 로직을 사용)
function checkDuplicate(type) {
    const value = type === 'id'
        ? document.getElementById('signup-id').value.trim()
        : document.getElementById('signup-nickname').value.trim();

    if (!value) {
        displayMessage(type === 'id' ? 'ユーザーIDを入力してください。' : 'ニックネームを入力してください。', 'warning');
        return;
    }

    fetch(`/check-duplicate?type=${type}&value=${encodeURIComponent(value)}`)
        .then(response => response.json())
        .then(data => {
            if (data.available) {
                displayMessage(`${type === 'id' ? 'ID' : 'ニックネーム'}は使用可能です！`, 'success');
                if (type === 'id') isIdChecked = true;
                else if (type === 'nickname') isNicknameChecked = true;
            } else {
                displayMessage(`${type === 'id' ? 'ID' : 'ニックネーム'}はすでに使われています。`, 'error');
                if (type === 'id') isIdChecked = false;
                else if (type === 'nickname') isNicknameChecked = false;
            }
        })
        .catch(error => {
            displayMessage('確認中にエラーが発生しました: ' + error.message, 'error');
        });
}

document.getElementById('signup-id').addEventListener('input', () =>
    { isIdChecked = false; });
document.getElementById('signup-nickname').addEventListener('input', () =>
    { isNicknameChecked = false; });


/* ---------- ID 찾기 ---------- */
// ID 찾기 처리 (authModal.js의 로직을 사용)
function handleFindId(event) {
    event.preventDefault();
    const email = document.getElementById('find-id-email').value.trim();
    const result = document.getElementById('find-id-result');

    // 결과 div를 보이게 하고 초기화
    result.classList.add('show');
    result.style.color = '#e91e63';
    result.textContent = '';

    if (!email) {
        result.textContent = 'メールアドレスを入力してください。';
        return;
    }

    // 로딩 표시
    result.textContent = '検索中...';
    result.style.color = '#666';

    const fd = new FormData();
    fd.append('email', email);

    fetch('/find-id', {
        method: 'POST',
        body: fd
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || 'HTTP Error: ' + response.status);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                result.style.color = '#4CAF50';
                result.textContent = `あなたのユーザーIDは: ${data.id} です。`;
            } else {
                result.style.color = '#e91e63';
                result.textContent = data.error || '該当するユーザーIDが見つかりません。';
            }
        })
        .catch(error => {
            result.style.color = '#e91e63';
            result.textContent = 'サーバーエラー: ' + error.message;
        });
}


/* ---------- 비밀번호 재설정 (단계 1~3 묶음) ---------- */
// 비밀번호 재설정 (authModal.js의 로직을 사용, API_BASE_URL 제거)
async function handleResetPw(event) {
    event.preventDefault();
    const id = document.getElementById('reset-id').value.trim();
    const email = document.getElementById('reset-email').value.trim();
    const res = await fetch('/send-reset-authcode', {
        method: 'POST',
        body: new URLSearchParams({ id, email })
    });
    const data = await res.json();
    const msg = document.getElementById('reset-pw-result');
    if (data.success) {
        msg.style.color = '#4CAF50';
        msg.textContent = '認証コードがメールで送信されました。';
        document.getElementById('reset-extra-fields').style.display = 'block';
    } else {
        msg.style.color = '#e91e63';
        msg.textContent = data.error || '送信に失敗しました。';
    }
}

async function handleResetConfirm() {
    const id = document.getElementById('reset-id').value.trim();
    const email = document.getElementById('reset-email').value.trim();
    const code = document.getElementById('reset-code').value.trim();
    const newpw = document.getElementById('new-pw').value;

    /* 1) 코드 검증 */
    const v = await fetch('/verify-reset-authcode', {
        method: 'POST',
        body: new URLSearchParams({ id, email, code })
    }).then(r => r.json());
    if (!v.success) {
        document.getElementById('reset-pw-result').textContent = v.error || '認証コードが正しくありません。';
        return;
    }

    /* 2) 비밀번호 변경 */
    const r = await fetch('/reset-pw', {
        method: 'POST',
        body: new URLSearchParams({ id, email, newpw })
    }).then(r => r.json());
    if (r.success) {
        alert('パスワードが正常に再設定されました。');
        // ✅ 입력칸 초기화
        document.getElementById('reset-code').value = '';
        document.getElementById('new-pw').value = '';
        document.getElementById('reset-id').value = '';
        document.getElementById('reset-email').value = '';
        document.getElementById('reset-extra-fields').style.display = 'none';
        document.getElementById('reset-pw-result').innerText = '';

        // ✅ 모달 닫기
        setTimeout(() => {
            closeResetPwModal();
            closeLoginModal();
        }, 100);
    } else {
        document.getElementById('reset-pw-result').textContent = r.error || '再設定に失敗しました。';
    }
}

// rest.js에 있었지만 authModal.js에서 더 포괄적으로 정의된 resetPw 함수는 제거.
// handleVerifyAuthCode, handleActualPasswordReset 함수는 authModal.js의 handleResetConfirm에 통합되었으므로 제거.


// --- 전역 함수 노출 (main.js에 통합되거나, main.js에서 호출될 경우) ---
// 이 함수들은 HTML에서 직접 호출되므로, window 객체에 등록해야 합니다.
Object.assign(window, {
    /* 모달 */
    openLoginModal, closeLoginModal, openSignupModal, closeSignupModal,
    switchToSignup, switchToLogin, openFindIdModal, closeFindIdModal,
    openResetPwModal, closeResetPwModal,
    /* 인증 */
    handleLogin, handleLogout, handleSignup, checkDuplicate,
    handleFindId, handleResetPw, handleResetConfirm,
    displayMessage,
    /* 검색 */
    handleTextSearch, handleVoiceSearch
});