let currentPage = 1;
const itemsPerPage = 20;
let gachaItems = [];
let filteredItems = []; // 검색 결과를 저장할 배열
let userLikedGachas = new Set(); // 로그인한 유저가 찜한 가챠 목록

// 로그인 여부 체크 함수 추가
function isLoggedIn() {
    return !!localStorage.getItem('accessToken');
}

function toggleHeart(e, button, gachaId) {
    e.preventDefault();
    e.stopPropagation();

    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("お気に入り登録にはログインが必要です。");
        openLoginModal();
        return;
    }

    const isLiked = button.classList.contains('liked');

    fetch(`/api/gacha/heart/${gachaId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(data => {
        if (isLiked) {
            button.classList.remove('liked');
            button.innerHTML = '🤍';
            userLikedGachas.delete(gachaId);
        } else {
            button.classList.add('liked');
            button.innerHTML = '❤️';
            userLikedGachas.add(gachaId);
        }
    })
    .catch(err => {
        console.error('찜 토글 실패:', err);
        alert('エラーが発生しました。');
    });
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

function renderGachaItems() {
    const grid = document.getElementById('gachaGrid');
    const itemsToRender = filteredItems.length > 0 ? filteredItems : gachaItems;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = itemsToRender.slice(startIndex, endIndex);

    grid.innerHTML = '';

    if (pageItems.length === 0) {
        grid.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 40px; color: #666;">검색 결과가 없습니다.</div>';
        return;
    }

    const loggedIn = isLoggedIn();

    pageItems.forEach((item) => {
        let heartHTML = '';
       
            const isLiked = userLikedGachas.has(Number(item.gacha_id));
            const heartIcon = isLiked ? '❤️' : '🤍';
            const heartClass = isLiked ? 'heart-button liked' : 'heart-button';
            heartHTML = `<button class="${heartClass}" onclick="toggleHeart(event, this, ${item.gacha_id})">${heartIcon}</button>`;
        
        
        const gachaItem = document.createElement('a');
        gachaItem.href = `/gachadetail/${item.gacha_id}`;
        gachaItem.className = 'gacha-item';
        gachaItem.innerHTML = `
            <div class="gacha-image">
                <img src="/static/images/${item.gacha_id}.jpg" alt="${item.gacha_name}" />
                ${heartHTML}
            </div>
            <div class="gacha-info">
                <div class="gacha-title">${item.gacha_name}</div>
                <div class="gacha-price">¥${item.gacha_price}</div>
                <div class="gacha-date">発売日: ${formatDate(item.gacha_date)}</div>
            </div>
        `;
        grid.appendChild(gachaItem);
    });
}

function changePage(page) {
    currentPage = page;
    updatePageButtons();
    renderGachaItems();
}

function updatePageButtons() {
    document.querySelectorAll('.page-button').forEach((btn, index) => {
        btn.classList.toggle('active', index + 1 === currentPage);
    });
}

document.querySelector('.search-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});
document.querySelector('.search-button').addEventListener('click', performSearch);

function performSearch() {
    const searchTerm = document.querySelector('.search-input').value.trim();

    if (!searchTerm) {
        filteredItems = [];
        currentPage = 1;
        renderGachaItems();
        updatePageButtons();
        return;
    }

    fetch(`/api/gacha/search?q=${encodeURIComponent(searchTerm)}`)
        .then(response => response.json())
        .then(data => {
            filteredItems = data;
            currentPage = 1;
            renderGachaItems();
            updatePageButtons();
        })
        .catch(error => {
            console.error('検索中にエラー:', error);
            alert('検索中にエラーが発生しました。');
        });
}

// ✅ 좋아요한 가챠 목록 불러오기 (로그인한 경우에만)
async function loadUserLikedGachas() {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
        const response = await fetch('/api/gacha/user-hearts', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            userLikedGachas = new Set(data.liked_gacha_ids.map(Number));
        }
    } catch (error) {
        console.error('お気に入りリストの読み込みに失敗しました。:', error);
    }
}

// ✅ 초기 데이터 로딩 및 좋아요 탭 버튼 이벤트 추가
document.addEventListener('DOMContentLoaded', async function () {
    await loadUserLikedGachas();

    fetch("/api/gacha/newlist")
        .then(response => response.json())
        .then(data => {
            gachaItems = data;
            renderGachaItems();
            updateAuthButtons(); // 로그인 상태 버튼 갱신
        })
        .catch(error => {
            console.error("商品リストの読み込みに失敗しました。:", error);
        });

    // 좋아요 탭 버튼 클릭 이벤트 추가
const loveBtn = document.getElementById('gachaLoveButton');
if (loveBtn) {
    loveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (isLoggedIn()) {
            window.location.href = "/gachalove";
        } else {
            alert("お気に入り登録にはログインが必要です。");
            openLoginModal(); // 로그인 모달 열기
        }
    });
}
});
