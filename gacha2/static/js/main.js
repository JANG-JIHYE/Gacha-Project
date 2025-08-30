// main.js 

// 메시지를 표시하는 함수 (alert 사용)
function displayMessage(message, type = 'info') {
    const safeType = (type ?? 'info').toUpperCase();
    const safeMessage = String(message);
    console.log(`[${safeType}] ${safeMessage}`);
    alert(safeMessage);
}

function openLoginModal() {
    document.getElementById('loginModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function openSignupModal() {
    // 檓淛幽咯?恨宥鐖悢 (饡撽羋?疙穹)
    document.getElementById('signup-id').value = '';
    document.getElementById('signup-nickname').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-password-confirm').value = '';
    document.getElementById('signup-email').value = '';
    document.getElementById('signupModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSignupModal() {
    document.getElementById('signupModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function switchToSignup() {
    closeLoginModal();
    setTimeout(() => openSignupModal(), 100);
}

function switchToLogin() {
    closeSignupModal();
    setTimeout(() => openLoginModal(), 100);
}

// 後咫扁奕扁宦扁孩糾?蜄抰咥姣垢奐怎扁肥儱虎鐨爸??
// function showMainContent() {
//     document.getElementById('mainContent').style.display = 'block';
//     document.getElementById('mypageContent').style.display = 'none';
//     document.getElementById('searchResultSection').style.display = 'none';
//     document.getElementById('settingsContent').style.display = 'none';  // ✅ 추가
// }

function showMainContent() {
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('mypageContent').style.display = 'none';
    document.getElementById('searchResultSection').style.display = 'none';
    document.getElementById('settingsContent').style.display = 'none';

    // ✅ 검색창 초기화
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.value = "";
    }

    if (window.location.hash === "#mypage") {
        history.replaceState(null, null, window.location.pathname);
    }
}

// ID?蜄徉?姚恨邵刳狗/雥疙虱
function openFindIdModal() {
    document.getElementById('findIdModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeFindIdModal() {
    document.getElementById('findIdModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// 巷姘恬?宥謖飶攄徉?姚恨邵刳狗/雥疙虱
function openResetPwModal() {
    document.getElementById('resetPwModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeResetPwModal() {
    document.getElementById('resetPwModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// ESC 垠?竺徉?姚恨邵雥疙虱
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeLoginModal();
        closeSignupModal();
        closeFindIdModal();
        closeResetPwModal();
    }
});


// ------------- 통합된 마이페이지 및 인증 관련 기능들 -------------

// 로그인 성공 시 호출될 함수 (handleLogin 함수 내에서 호출)
function handleLoginSuccess() {
    displayMessage("ログイン成功！", "success");
    localStorage.setItem("isLoggedIn", "true"); // 로그인 상태 저장
    updateAuthButtons(); // 인증 버튼 업데이트
    closeLoginModal(); // 로그인 모달 닫기
    showMainContent(); // 메인 콘텐츠 보여주기

    // ✅ 로그인 시 URL 해시 제거 (자동 마이페이지 진입 방지)
    history.replaceState(null, null, window.location.pathname);
}

// 로그인 실패 시 호출될 함수 (handleLogin 함수 내에서 호출)
function handleLoginFailure(message) {
    displayMessage(message, "error");
    localStorage.setItem("isLoggedIn", "false"); // 로그인 실패 시 상태 초기화
    updateAuthButtons(); // 인증 버튼 업데이트
}

// 인증 버튼 (로그인/회원가입 <-> 로그아웃/마이페이지) 업데이트
function updateAuthButtons() {
    const authButtonsDiv = document.getElementById('authButtons');
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true"; // 로컬 스토리지 확인

    authButtonsDiv.innerHTML = ''; // 기존 버튼 모두 제거

    if (isLoggedIn) {
        // 로그인 상태
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-signup'; // 로그아웃 버튼은 signup 스타일
        logoutBtn.textContent = 'ログアウト';
        logoutBtn.onclick = handleLogout;
        authButtonsDiv.appendChild(logoutBtn);

        const mypageBtn = document.createElement('button');
        mypageBtn.className = 'btn btn-login'; // 마이페이지 버튼은 login 스타일
        mypageBtn.textContent = 'マイページ';
        mypageBtn.onclick = showMyPage; // 마이페이지 섹션 보여주는 함수 호출
        authButtonsDiv.appendChild(mypageBtn);

    } else {
        // 로그아웃 상태 (기본)
        const loginBtn = document.createElement('button');
        loginBtn.className = 'btn btn-login';
        loginBtn.textContent = 'ログイン';
        loginBtn.onclick = openLoginModal;
        authButtonsDiv.appendChild(loginBtn);

        const signupBtn = document.createElement('button');
        signupBtn.className = 'btn btn-signup';
        signupBtn.textContent = '新規登録';
        signupBtn.onclick = openSignupModal;
        authButtonsDiv.appendChild(signupBtn);
    }
}

// 마이페이지 섹션 보여주기
function showMyPage() {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!isLoggedIn) {
        displayMessage("マイページにアクセスするにはログインしてください。", "info");
        openLoginModal();
        return;
    }
    document.getElementById('mainContent').style.display = 'none'; // 메인 콘텐츠 숨김
    document.getElementById('searchResultSection').style.display = 'none'; // 검색 결과 섹션 숨김
    document.getElementById('mypageContent').style.display = 'block'; // 마이페이지 섹션 보여주기
    document.getElementById('settingsContent').style.display = 'none'; // 설정창 숨기기
    // 마이페이지 섹션 로드 시 기본적으로 'profile' 섹션을 보여주도록 설정
    showMyPageSection('profile'); 
}

// 마이페이지 내부 섹션 전환
function showMyPageSection(section) {
    const sections = ['favorite', 'posts', 'comments', 'likes', 'profile'];
    sections.forEach(id => {
        const element = document.getElementById(`${id}-section`);
        if (element) {
            element.style.display = id === section ? 'block' : 'none';
        }
    });

    
    if (section === 'profile') {
        loadProfileInfo();
    }
}

function handleLogout() {
    localStorage.removeItem("isLoggedIn");
    displayMessage("ログアウトしました。", "success");
    updateAuthButtons();
    showMainContent();
    document.getElementById('mypageContent').style.display = 'none';

    // ✅ URL 해시 제거 (로그인 모달이 뜨는 원인 차단)
    history.replaceState(null, null, window.location.pathname);
}


// 페이지 로드 시 인증 버튼 상태 초기화
document.addEventListener('DOMContentLoaded', updateAuthButtons);


// 성恒?峒恨姘奕?度羋??邵俖刳 (HTML物芷臗懟嫓肩蘦盂虱芾爬羋)
// 기존 window. 함수들은 그대로 유지하고 위에 새로 추가된 함수들도 추가합니다.
window.displayMessage = displayMessage;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openSignupModal = openSignupModal;
window.closeSignupModal = closeSignupModal;
window.switchToSignup = switchToSignup;
window.switchToLogin = switchToLogin;
window.showMainContent = showMainContent;
window.openFindIdModal = openFindIdModal;
window.closeFindIdModal = closeFindIdModal;
window.openResetPwModal = openResetPwModal;
window.closeResetPwModal = closeResetPwModal;

// 새로 추가된 함수들
window.handleLoginSuccess = handleLoginSuccess;
window.handleLoginFailure = handleLoginFailure;
window.updateAuthButtons = updateAuthButtons;
window.showMyPage = showMyPage;
window.showMyPageSection = showMyPageSection; // 이름 변경: showSection -> showMyPageSection
window.handleLogout = handleLogout;

// ------------------------------- 마이페이지 ----------------------------------------------------

// const favoriteProducts = [
//     { image: 'https://via.placeholder.com/100', name: '商品A', price: 1200 },
//     { image: 'https://via.placeholder.com/100', name: '商品B', price: 950 },
//     { image: 'https://via.placeholder.com/100', name: '商品C', price: 780 }
// ];

// const favoriteShops = [
//     { name: '店舗A' },
//     { name: '店舗B' }
// ];

// function showFavoriteProducts() {
//     const container = document.getElementById('favorite-products');
//     const shopsContainer = document.getElementById('favorite-shops');
//     container.innerHTML = '';
//     container.className = 'favorite-products-container';
//     shopsContainer.style.display = 'none';
//     container.style.display = 'grid';

//     favoriteProducts.forEach(product => {
//         const item = document.createElement('div');
//         item.className = 'favorite-product-card';

//         item.innerHTML = `
//             <img src="${product.image}" alt="${product.name}" />
//             <div class="name">${product.name}</div>
//             <div class="price">価格: ¥${product.price}</div>
//         `;
//         container.appendChild(item);
//     });
// }

const favoriteProducts = [
    { image: 'https://via.placeholder.com/100', name: '商品A', price: 1200 },
    { image: 'https://via.placeholder.com/100', name: '商品B', price: 950 },
    { image: 'https://via.placeholder.com/100', name: '商品C', price: 780 }
];

const favoriteShops = [
    { name: '店舗A' },
    { name: '店舗B' }
];

/** '찜한 상품' 버튼을 눌렀을 때 실행되는 함수 */
function showMyFavoriteGachas() {
    const gachaContainer = document.getElementById("gacha-list-container");
    const shopsContainer = document.getElementById("favorite-shops-container");
    const token = localStorage.getItem("accessToken");

    shopsContainer.style.display = 'none';
    gachaContainer.style.display = 'grid';
    gachaContainer.innerHTML = "<p>リストを読み込み中...</p>";

    if (!token) {
        gachaContainer.innerHTML = "<p>お気に入り登録にはログインが必要です。</p>";
        return;
    }

    fetch("/my-liked-gachas", { headers: { "Authorization": `Bearer ${token}` } })
        .then(res => {
            if (!res.ok) throw new Error('認証に失敗したか、サーバーエラーが発生しました。');
            return res.json();
        })
        .then(data => {
            gachaContainer.innerHTML = "";
            if (data.success && data.gachas.length > 0) {
                data.gachas.forEach(gacha => {
                    const card = document.createElement('div');
                    card.className = 'gacha-card';
                    card.innerHTML = `
                        <div class="gacha-img-container">
                            <a href="/gachadetail/${gacha.gacha_id}">
                                <img src="${gacha.gacha_img_url || `/static/images/${gacha.gacha_id}.jpg`}" alt="${gacha.gacha_name}">
                            </a>
                            
                            <i class="fa-solid fa-heart favorite-gacha-heart active" onclick="removeFavoriteGacha(${gacha.gacha_id})"></i>
                        </div>
                        <p class="gacha-name">${gacha.gacha_name}</p>
                    `;
                    gachaContainer.appendChild(card);
                });
            } else {
                gachaContainer.innerHTML = "<p>該当する結果はありませんでした。</p>";
            }
        })
        .catch(err => {
            console.error("Error:", err);
            gachaContainer.innerHTML = "<p>お気に入りリストの読み込みに失敗しました。</p>";
        });
}

async function removeFavoriteGacha(gachaId) {
    if (!confirm("この商品をお気に入りから削除しますか。")) {
        return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
        alert('ログインが必要です。');
        return;
    }

    try {
        const response = await fetch('/api/favorites/gacha', {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ id: gachaId })
        });

        if (response.ok) {
            // 삭제 성공 시, 목록을 다시 불러와 화면을 새로고침합니다.
            showMyFavoriteGachas(); 
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || '削除処理中にエラーが発生しました。');
        }
    } catch (error) {
        console.error('Error removing gacha favorite:', error);
        alert(`エラー: ${error.message}`);
    }
}

/** '찜한 가게' 버튼을 눌렀을 때 실행되는 함수 */
function showMyFavoriteShops() {
    const gachaContainer = document.getElementById("gacha-list-container");
    const shopsContainer = document.getElementById("favorite-shops-container");
    const token = localStorage.getItem("accessToken");

    // 1. 다른 컨테이너를 확실히 숨기고, 자신을 보이게 합니다.
    gachaContainer.style.display = 'none';
    shopsContainer.style.display = 'grid'; // 가게 목록도 grid로 설정
    shopsContainer.innerHTML = "<p>リストを読み込み中...</p>";

    // 2. 토큰 확인
    if (!token) {
        shopsContainer.innerHTML = "<p>ログインが必要です。</p>";
        return;
    }

    // 3. 데이터 불러오기
    fetch("/api/user/favorites/stores", { headers: { "Authorization": `Bearer ${token}` } })
        .then(res => {
            if (!res.ok) throw new Error('認証に失敗したか、サーバーエラーが発生しました。');
            return res.json();
        })
        .then(data => {
            shopsContainer.innerHTML = ""; // 컨테이너 비우기
            if (Array.isArray(data) && data.length > 0) {
                // 4. 화면 그리기
                data.forEach(shop => {
                    const card = document.createElement('div');
                    card.className = 'favorite-shop-card';
                    card.textContent = shop.store_name;
                    card.onclick = () => {
                window.location.href = `/map?store_id=${shop.store_id}`;
            };
            
            shopsContainer.appendChild(card);
                });
            } else {
                shopsContainer.innerHTML = "<p>該当する結果はありませんでした。</p>";
            }
        })
        .catch(err => {
            console.error("Error:", err);
            shopsContainer.innerHTML = "<p>商品リストの読み込みに失敗しました。</p>";
        });
}

/**
 * 가게 즐겨찾기 상태를 토글(추가/삭제)하는 함수.
 */
async function toggleFavorite(starElement, store) {
    const token = localStorage.getItem('accessToken');
    if (!token) { alert('お気に入り機能はログイン後に利用できます。'); return; }

    const isAdding = !starElement.classList.contains('active');
    const method = isAdding ? 'POST' : 'DELETE';
    try {
        const response = await fetch('/api/favorites/store', {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ id: store.store_id, name: store.name })
        });
        if (response.ok) {
            starElement.classList.toggle('active');
            starElement.classList.toggle('fa-regular');
            starElement.classList.toggle('fa-solid');
        } else {
            throw new Error((await response.json()).detail || '処理中にエラーが発生しました。');
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        alert(`エラー: ${error.message}`);
    }
}    
 

const myPosts = [
    { title: '初めての投稿', author: '私', date: '2025-07-10' },
    { title: 'お気に入りガチャ紹介', author: '私', date: '2025-07-12' }
];

const myCommentedPosts = [
    { title: 'このガチャすごい！', author: 'ユーザーA', date: '2025-07-09' },
    { title: '設置場所について', author: 'ユーザーB', date: '2025-07-13' }
];

const myLikedPosts = [
    { title: '神引きしました', author: 'ユーザーC', date: '2025-07-08' },
    { title: 'レア出ました！', author: 'ユーザーD', date: '2025-07-11' }
];

function renderPostTable(containerId, data) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<p>表示する投稿がありません。</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'post-table';

    const thead = document.createElement('thead');
    let headerRow = '<tr><th>タイトル</th>';
    const hasAuthor = data[0].author !== undefined;
    if (hasAuthor) {
        headerRow += '<th>作成者</th>';
    }
    headerRow += '<th>日付</th></tr>';
    thead.innerHTML = headerRow;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.forEach(post => {
        const postDetailUrl = `/gacha_board?post=${post.id}`; 
        let rowHtml = `<td><a href="${postDetailUrl}">${post.title}</a></td>`; // 제목에 링크 적용
        if (hasAuthor) {
            rowHtml += `<td>${post.author}</td>`;
        }
        rowHtml += `<td>${post.date}</td>`;

        const row = document.createElement('tr');
        row.innerHTML = rowHtml;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    container.appendChild(table);
}

function showMyPosts() {
    renderPostTable('posts-section', myPosts);
}

function showMyCommentedPosts() {
    renderPostTable('comments-section', myCommentedPosts);
}

function showMyLikedPosts() {
    renderPostTable('likes-section', myLikedPosts);
}

// function loadProfileInfo() {
//     const token = localStorage.getItem("accessToken");
//     fetch("/me", {
//         headers: { Authorization: `Bearer ${token}` }
//     })
//     .then(res => res.json())
//     .then(data => {
//         document.getElementById("profile-id").innerText = data.id;
//         document.getElementById("profile-nickname").innerText = data.nickname;
//         document.getElementById("profile-email").value = data.email;
//         localStorage.setItem("profileId", data.id);
//     })
//     .catch(err => {
//         displayMessage("プロフィール読み込み失敗", "error");
//   });
// }

function loadProfileInfo() {
    const token = localStorage.getItem("accessToken");
    fetch("/me", {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("profile-id").innerText = data.id;
        document.getElementById("profile-nickname").innerText = data.nickname;
        document.getElementById("profile-email-text").textContent = data.email;
        localStorage.setItem("profileId", data.id);
    })
    .catch(err => {
        displayMessage("プロフィール読み込み失敗", "error");
    });
    }


function updateEmail() {
    const newEmail = document.getElementById("profile-email").value;
    const token = localStorage.getItem("accessToken");

    fetch("/update-email", {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ new_email: newEmail })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
        displayMessage("メールを更新しました。", "success");
        } else {
        displayMessage(data.error || "更新失敗", "error");
        }
    });
}

function sendPasswordResetCode() {
    const email = document.getElementById("profile-email").value;
    const id = localStorage.getItem("profileId");

    fetch("/send-reset-authcode", {
        method: "POST",
        body: new URLSearchParams({ email, id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
        displayMessage("認証コードを送信しました。", "success");
        document.getElementById("pw-verification").style.display = "block";
        } else {
        displayMessage(data.error, "error");
        }
    });
    }

function verifyAndResetPassword() {
    const id = localStorage.getItem("profileId");
    const authCode = document.getElementById("auth-code").value;
    const newPassword = document.getElementById("new-password").value;

    fetch("/verify-reset-authcode", {
        method: "POST",
        body: new URLSearchParams({
        id,
        code: authCode,
        new_password: newPassword
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
        displayMessage("パスワードを変更しました。", "success");
        document.getElementById("pw-verification").style.display = "none";
        } else {
        displayMessage(data.error, "error");
        }
    });
}

function showEmailEdit() {
    const emailInput = document.getElementById("email-edit-area");
    emailInput.style.display = "block";
    document.getElementById("profile-email-input").value = document.getElementById("profile-email-text").textContent;
}


function submitEmailChange() {
    const newEmail = document.getElementById("profile-email-input").value;
    const token = localStorage.getItem("accessToken");

    fetch("/update-email", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ new_email: newEmail })
    })
    .then(res => res.json())
    .then(data => {
    if (data.success) {
        document.getElementById("profile-email-text").textContent = newEmail;
        document.getElementById("email-edit-area").style.display = "none";
        displayMessage("メールを更新しました。", "success");
    } else {
        displayMessage(data.error || "更新失敗", "error");
    }
    });
}

    function openResetPwModalFromMyPage() {
    const id = localStorage.getItem("profileId");
    const email = document.getElementById("profile-email-text").textContent;

    document.getElementById("reset-id").value = id;
    document.getElementById("reset-email").value = email;

    openResetPwModal();
}

function deleteAccount() {
    const confirmed = confirm("本当にアカウントを削除しますか？この操作は取り消せません。");

    if (!confirmed) return;

    const token = localStorage.getItem("accessToken");

    fetch("/delete-account", {
    method: "DELETE",
    headers: {
        Authorization: `Bearer ${token}`
    }
    })
    .then(res => res.json())
    .then(data => {
    if (data.success) {
        displayMessage("アカウントが削除されました。", "success");
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("accessToken");
        // 페이지 새로고침 또는 메인화면으로 전환
        window.location.reload(); // 또는 showMainContent();
    } else {
        displayMessage(data.error || "削除に失敗しました。", "error");
    }
    });
}

function loadLikedGachas() {
    const token = localStorage.getItem("accessToken");
    const container = document.getElementById("gacha-list-container");
    const shopContainer = document.getElementById("favorite-shops");
    shopContainer.style.display = "none";

    fetch("/my-liked-gachas", {
    method: "GET",
    headers: {
        Authorization: `Bearer ${token}`
    }
    })
    .then(res => res.json())
    .then(data => {
    const container = document.getElementById("gacha-list-container");
    container.innerHTML = ""; // 기존 항목 제거

    if (data.success) {
        container.style.display = "block";
        if (data.gachas.length === 0) {
        // ✅ 찜한 상품이 없을 때 메시지 출력
        container.innerHTML = "<p>お気に入り商品がありません。</p>";
        } else {
        // ✅ 찜한 상품 목록 렌더링
        renderGachaList(data.gachas);
        }
    } else {
        displayMessage("お気に入り商品の取得に失敗しました", "error");
    }
    });
}

function renderGachaList(gachas) {
    const container = document.getElementById("gacha-list-container");
    container.innerHTML = "";
    container.style.display = "grid"; // ✅ grid로 명확하게 설정
    container.classList.add("favorite-products-container"); // ✅ 클래스 추가만

    gachas.forEach(gacha => {
        const card = document.createElement("div");
        card.className = "favorite-product-card";

        card.innerHTML = `
        <img src="${gacha.gacha_img_url || 'https://via.placeholder.com/160'}" alt="${gacha.gacha_name}">
        <div class="name">${gacha.gacha_name}</div>
        <div class="price">${gacha.gacha_price}円</div>
        `;
        container.appendChild(card);
    });
}




function showSettings() {
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('mypageContent').style.display = 'none';
    document.getElementById('searchResultSection').style.display = 'none';
    document.getElementById('settingsContent').style.display = 'block';
}

document.addEventListener("DOMContentLoaded", () => {
    const darkToggle = document.getElementById("darkModeToggle");
    const savedMode = localStorage.getItem("darkMode");

    // 기존 설정 적용
    if (savedMode === "on") {
        document.body.classList.add("dark-mode");
        darkToggle.checked = true;
    }

    if (darkToggle) {
        darkToggle.addEventListener("change", function () {
            if (darkToggle.checked) {
                document.body.classList.add("dark-mode");
                localStorage.setItem("darkMode", "on");
            } else {
                document.body.classList.remove("dark-mode");
                localStorage.setItem("darkMode", "off");
            }
        });
    }
});

//
function showMyPosts() {
    const token = localStorage.getItem("accessToken");

    fetch("/my-posts", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(data => {
        console.log("서버로부터 받은 응답 데이터:", data);

        if (data.success) {
            const formatted = data.posts.map(post => {
                return {
                    id: post.post_id, // 이 post.id 부분이 undefined인지 확인
                    title: post.title,
                    author: "私",
                    date: new Date(post.created_at).toLocaleDateString("ja-JP")
                };
            });

            renderPostTable("posts-section", formatted);
            document.getElementById('posts-section').style.display = 'block';

        } else {
            displayMessage(data.error || "投稿の取得に失敗しました。", "error");
        }
    })
    .catch(err => {
        displayMessage("投稿の取得中にエラーが発生しました。", "error");
    });
}

function showMyCommentedPosts() {
    const token = localStorage.getItem("accessToken");

    fetch("/my-commented-posts", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const formatted = data.posts.map(post => ({
                id: post.post_id,
                title: post.title,
                author: "私",
                date: new Date(post.created_at).toLocaleDateString("ja-JP")
            }));
            renderPostTable("comments-section", formatted);
        } else {
            displayMessage(data.error || "コメント投稿の取得に失敗しました。", "error");
        }
    })
    .catch(err => {
        console.error(err);
        displayMessage("コメント投稿の取得中にエラーが発生しました。", "error");
    });
}

function showMyLikedPosts() {
    const token = localStorage.getItem("accessToken");

    fetch("/my-liked-posts", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const formatted = data.posts.map(post => ({
                id: post.post_id,
                title: post.title,
                author: "私",
                date: new Date(post.created_at).toLocaleDateString("ja-JP")
            }));
            renderPostTable("likes-section", formatted);
        } else {
            displayMessage(data.error || "いいね投稿の取得に失敗しました。", "error");
        }
    })
    .catch(err => {
        console.error(err);
        displayMessage("いいね投稿の取得中にエラーが発生しました。", "error");
    });
}
    

document.addEventListener("DOMContentLoaded", () => {
    const goToMypage = localStorage.getItem("goToMypage");
    if (goToMypage === "true") {
        localStorage.removeItem("goToMypage");

        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
        if (isLoggedIn) {
            showMyPage();
        } else {
            openLoginModal(); // 로그인 안 되어 있으면 로그인 모달만 띄움
        }
    }
});

// 해시 변경 감지해서 마이페이지 보여주기
window.addEventListener("load", () => {
    if (window.location.hash === "#mypage") {
        showMyPage();
    }
});

window.addEventListener("hashchange", () => {
    if (window.location.hash === "#mypage") {
        showMyPage();
    }
});

//--------------------------------------------------------------------------

// function loadProfileInfo() {
//     const token = localStorage.getItem("accessToken");
//     fetch("/me", {
//         headers: { Authorization: `Bearer ${token}` }
//     })
//     .then(res => res.json())
//     .then(data => {
//         document.getElementById("profile-id").innerText = data.id;
//         document.getElementById("profile-nickname").innerText = data.nickname;
//         document.getElementById("profile-email-text").textContent = data.email;
//         localStorage.setItem("profileId", data.id);
//     })
//     .catch(err => {
//         displayMessage("プロフィール読み込み失敗", "error");
//     });
//     }

// function showEmailEdit() {
//     document.getElementById("email-edit-area").style.display = "block";
//     document.getElementById("profile-email-input").value = document.getElementById("profile-email-text").textContent;
// }

// function submitEmailChange() {
//     const newEmail = document.getElementById("profile-email-input").value;
//     const token = localStorage.getItem("accessToken");

//     fetch("/update-email", {
//         method: "POST",
//         headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`
//         },
//         body: JSON.stringify({ new_email: newEmail })
//     })
//     .then(res => res.json())
//     .then(data => {
//         if (data.success) {
//         document.getElementById("profile-email-text").textContent = newEmail;
//         document.getElementById("email-edit-area").style.display = "none";
//         displayMessage("メールを更新しました。", "success");
//         } else {
//         displayMessage(data.error || "更新失敗", "error");
//         }
//     });
// }


// function openResetPwModalFromMyPage() {
//     const id = localStorage.getItem("profileId");
//     const email = document.getElementById("profile-email-text").textContent;

//     document.getElementById("reset-id").value = id;
//     document.getElementById("reset-email").value = email;

//     openResetPwModal();
// }

// function deleteAccount() {
//     if (!confirm("本当にアカウントを削除しますか？この操作は取り消せません。")) return;

//     const token = localStorage.getItem("accessToken");

//     fetch("/delete-account", {
//         method: "DELETE",
//         headers: {
//         Authorization: `Bearer ${token}`
//         }
//     })
//     .then(res => res.json())
//     .then(data => {
//         if (data.success) {
//         displayMessage("アカウントが削除されました。", "success");
//         localStorage.removeItem("isLoggedIn");
//         localStorage.removeItem("accessToken");
//         window.location.reload();
//         } else {
//         displayMessage(data.error || "削除に失敗しました。", "error");
//         }
//     });
// }

// function loadLikedGachas() {
//     const token = localStorage.getItem("accessToken");
//     const container = document.getElementById("gacha-list-container");
//     const shopContainer = document.getElementById("favorite-shops");
//     shopContainer.style.display = "none";
    
//     fetch("/my-liked-gachas", {
//         method: "GET",
//         headers: {
//         Authorization: `Bearer ${token}`
//         }
//     })
//     .then(res => res.json())
//     .then(data => {
//         const container = document.getElementById("gacha-list-container");
//         container.innerHTML = ""; // 기존 항목 제거

//         if (data.success) {
//         container.style.display = "block";
//         if (data.gachas.length === 0) {
//             // ✅ 찜한 상품이 없을 때 메시지 출력
//             container.innerHTML = "<p>お気に入り商品がありません。</p>";
//         } else {
//             // ✅ 찜한 상품 목록 렌더링
//             renderGachaList(data.gachas);
//         }
//         } else {
//         displayMessage("お気に入り商品の取得に失敗しました", "error");
//         }
//     });
// }

// function renderGachaList(gachas) {
//     const container = document.getElementById("gacha-list-container");
//     container.innerHTML = "";
//     container.style.display = "grid"; // ✅ grid로 명확하게 설정
//     container.classList.add("favorite-products-container"); // ✅ 클래스 추가만

//     gachas.forEach(gacha => {
//         const card = document.createElement("div");
//         card.className = "favorite-product-card";

//         card.innerHTML = `
//         <img src="${gacha.gacha_img_url || 'https://via.placeholder.com/160'}" alt="${gacha.gacha_name}">
//         <div class="name">${gacha.gacha_name}</div>
//         <div class="price">${gacha.gacha_price}円</div>
//         `;
//         container.appendChild(card);
//     });
// }



// // 전역 등록
// window.showFavoriteProducts = showFavoriteProducts;
// window.showFavoriteShops = showFavoriteShops;
// window.showMyPosts = showMyPosts;
// window.showMyCommentedPosts = showMyCommentedPosts;
// window.showMyLikedPosts = showMyLikedPosts;