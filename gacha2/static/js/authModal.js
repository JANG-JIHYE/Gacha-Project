/* ===== 회원가입·로그인 모달 전용 스크립트 ===== */

/* ---------- 공통 메시지 ---------- */
function displayMessage(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    alert(message);
}

/* ---------- 모달 열기·닫기 ---------- */
function openLoginModal() { document.getElementById('loginModal').classList.add('active'); document.body.style.overflow='hidden'; }
function closeLoginModal(){ document.getElementById('loginModal').classList.remove('active'); document.body.style.overflow='auto'; }

function openSignupModal() {
    ['signup-id','signup-nickname','signup-password','signup-password-confirm','signup-email']
      .forEach(id=>document.getElementById(id).value='');
    document.getElementById('signupModal').classList.add('active');
    document.body.style.overflow='hidden';
}
function closeSignupModal(){ document.getElementById('signupModal').classList.remove('active'); document.body.style.overflow='auto'; }

function switchToSignup(){ closeLoginModal(); setTimeout(openSignupModal,100); }
function switchToLogin() { closeSignupModal(); setTimeout(openLoginModal,100); }

function openFindIdModal() { document.getElementById('findIdModal').classList.add('active'); document.body.style.overflow='hidden'; }
function closeFindIdModal(){ document.getElementById('findIdModal').classList.remove('active'); document.body.style.overflow='auto'; }

function openResetPwModal(){ document.getElementById('resetPwModal').classList.add('active'); document.body.style.overflow='hidden'; }
function closeResetPwModal(){ document.getElementById('resetPwModal').classList.remove('active'); document.body.style.overflow='auto'; }

/* ESC 키로 모달 닫기 */
document.addEventListener('keydown', e=>{
    if(e.key==='Escape'){ closeLoginModal(); closeSignupModal(); closeFindIdModal(); closeResetPwModal(); }
});

/* ---------- 로그인 ---------- */
function handleLogin(event){
    event.preventDefault();
    const id=document.getElementById('username').value.trim();
    const pw=document.getElementById('password').value.trim();
    if(!id||!pw){ displayMessage('IDまたはパスワードを入力してください','error'); return; }

    fetch('/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id,pw})
    })
    .then(res=>res.ok ? res.json()
                     : res.json().then(err=>{throw new Error(err.error||'未知のサーバーエラー');}))
    .then(data=>{
        if(data.token && data.token_type==='bearer'){
            localStorage.setItem('accessToken',data.token);
            localStorage.setItem('isLoggedIn','true');
            displayMessage('ログイン成功！','success');
            closeLoginModal();
            updateAuthButtons();
        }else{
            displayMessage(data.error||'ログイン失敗','error');
        }
    })
    .catch(err=>displayMessage('サーバーエラー: '+err.message,'error'));
}

/* ---------- 로그아웃 ---------- */
function handleLogout(){
    localStorage.removeItem('accessToken');
    localStorage.removeItem('isLoggedIn');
    displayMessage('ログアウトしました','info');
    updateAuthButtons();
}

/* ---------- 인증 버튼 표시 ---------- */
function updateAuthButtons(){
    const area=document.querySelector('.auth-buttons');
    if(localStorage.getItem('isLoggedIn')==='true'){
        area.innerHTML='<button class="btn btn-login" onclick="handleLogout()">ログアウト</button>';
    }else{
        area.innerHTML=`<button class="btn btn-login" onclick="openLoginModal()">ログイン</button>
                        <button class="btn btn-signup" onclick="openSignupModal()">新規登録</button>`;
    }
}

/* ---------- 회원가입 ---------- */
// function handleSignup(event){
//     event.preventDefault();
//     const id=document.getElementById('signup-id').value.trim();
//     const nickname=document.getElementById('signup-nickname').value.trim();
//     const pw=document.getElementById('signup-password').value;
//     const pw2=document.getElementById('signup-password-confirm').value;
//     const email=document.getElementById('signup-email').value.trim();

//     if(pw!==pw2){ displayMessage('パスワードが一致しません。','error'); return; }

//     const fd=new FormData();
//     fd.append('id',id); fd.append('pw',pw);
//     fd.append('email',email); fd.append('nickname',nickname);

//     fetch('/signup',{method:'POST',body:fd})
//       .then(r=>r.json())
//       .then(d=>{
//           if(d.message){
//               displayMessage('会員登録成功: '+d.message,'success');
//               closeSignupModal(); openLoginModal();
//           }else{
//               displayMessage('会員登録失敗: '+(d.error||'不明なエラー'),'error');
//           }
//       })
//       .catch(e=>displayMessage('サーバーエラー: '+e.message,'error'));
// }

// /* ---------- 중복 확인 ---------- */
// function checkDuplicate(type){
//     const value=type==='id'
//         ? document.getElementById('signup-id').value.trim()
//         : document.getElementById('signup-nickname').value.trim();
//     if(!value){ displayMessage(type==='id'?'ユーザーIDを入力してください。':'ニックネームを入力してください。','warning'); return; }

//     fetch(`/check-duplicate?type=${type}&value=${encodeURIComponent(value)}`)
//       .then(r=>r.json())
//       .then(d=>{
//           if(d.available) displayMessage((type==='id'?'ID':'ニックネーム')+'は使用可能です！','success');
//           else            displayMessage((type==='id'?'ID':'ニックネーム')+'はすでに使われています。','error');
//       })
//       .catch(e=>displayMessage('確認中にエラー: '+e.message,'error'));
// }
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

let isIdChecked = false;
let isNicknameChecked = false;

// 重複確認
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



document.getElementById('signup-id').addEventListener('input', () => {
    isIdChecked = false;
});
document.getElementById('signup-nickname').addEventListener('input', () => {
    isNicknameChecked = false;
});
/* ---------- ID 찾기 ---------- */
function handleFindId(event){
    event.preventDefault();
    const email = document.getElementById('find-id-email').value.trim();
    const result = document.getElementById('find-id-result');
    
    // 결과 div를 보이게 하고 초기화
    result.classList.add('show'); // 이 부분이 핵심!
    result.style.color = '#e91e63';
    result.textContent = '';
    
    if(!email){ 
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
async function handleResetPw(event){
    event.preventDefault();
    const id=document.getElementById('reset-id').value.trim();
    const email=document.getElementById('reset-email').value.trim();
    const res=await fetch('/send-reset-authcode',{
        method:'POST',
        body:new URLSearchParams({id,email})
    });
    const data=await res.json();
    const msg=document.getElementById('reset-pw-result');
    if(data.success){
        msg.style.color='#4CAF50';
        msg.textContent='認証コードがメールで送信されました。';
        document.getElementById('reset-extra-fields').style.display='block';
    }else{
        msg.style.color='#e91e63';
        msg.textContent=data.error||'送信に失敗しました。';
    }
}

async function handleResetConfirm(){
    const id=document.getElementById('reset-id').value.trim();
    const email=document.getElementById('reset-email').value.trim();
    const code=document.getElementById('reset-code').value.trim();
    const newpw=document.getElementById('new-pw').value;

    /* 1) 코드 검증 */
    const v=await fetch('/verify-reset-authcode',{
        method:'POST',
        body:new URLSearchParams({id,email,code})
    }).then(r=>r.json());
    if(!v.success){
        document.getElementById('reset-pw-result').textContent=v.error||'認証コードが正しくありません。';
        return;
    }

    /* 2) 비밀번호 변경 */
    const r=await fetch('/reset-pw',{
        method:'POST',
        body:new URLSearchParams({id,email,newpw})
    }).then(r=>r.json());
    if(r.success){
        alert('パスワードが正常に再設定されました。');
        closeResetPwModal(); closeLoginModal();
    }else{
        document.getElementById('reset-pw-result').textContent=r.error||'再設定に失敗しました。';
    }
}

/* ---------- DOMContentLoaded: 버튼/모달 초기화 ---------- */
document.addEventListener('DOMContentLoaded', () => {
    /* Enter 검색키·음성검색 등 (기존 페이지와 충돌 없는 부분) */
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', e => e.key === 'Enter' && handleTextSearch?.());
    }
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleTextSearch);
    }

    /* 모달 외 클릭 시 닫기 */
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

    updateAuthButtons();

    /* 🔥 여기 추가하면 됨 */
    const loveBtn = document.getElementById('gachaLoveButton');
    if (loveBtn) {
        loveBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (localStorage.getItem('accessToken')) {
                window.location.href = "/gachalove";
            } else {
                openLoginModal();
            }
        });
    }
});

/* ---------- 외부에서 호출할 함수 노출 ---------- */
Object.assign(window,{
    /* 모달 */
    openLoginModal,closeLoginModal,openSignupModal,closeSignupModal,
    switchToSignup,switchToLogin,openFindIdModal,closeFindIdModal,
    openResetPwModal,closeResetPwModal,
    /* 인증 */
    handleLogin,handleLogout,handleSignup,checkDuplicate,
    handleFindId,handleResetPw,handleResetConfirm,
    displayMessage
});
