// お気に入り商品 데이터

let currentPage = 1;
const itemsPerPage = 20;
let favoriteItems = [];
let currentItems = [...favoriteItems];

// 하트 버튼 토글
function toggleHeart(e, button, gachaId) {
    e.preventDefault();
    e.stopPropagation();

    const token = localStorage.getItem("accessToken"); 
    if (!token) {
        alert("お気に入り登録にはログインが必要です。");
        openLoginModal();
        return;
    }

    fetch(`/api/gacha/heart/${gachaId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(data => {
        if (!data) return;

        if (!data.liked) {
            // 찜 해제되었으면 화면에서도 제거
            button.closest('.gacha-item').remove();

            // 데이터에서도 제거
            favoriteItems = favoriteItems.filter(item => item.gacha_id !== gachaId);
            currentItems = currentItems.filter(item => item.gacha_id !== gachaId);

            // 다시 렌더링
            renderGachaItems();
        } else {
            // 혹시 다시 좋아요 추가되었을 경우 (이 페이지에서는 거의 없음)
            button.classList.add('liked');
            button.innerHTML = '❤️';
        }
    })
    .catch(err => {
        console.error('お気に入り登録に失敗:', err);
        alert('お気に入り登録の切り替えに失敗しました。');
    });
}

// 가차 아이템 렌더링
function renderGachaItems() {
    const grid = document.getElementById("gachaGrid");
    grid.innerHTML = "";

    if (currentItems.length === 0) {
        document.getElementById("emptyState").style.display = "block";
        document.getElementById("pagination").style.display = "none";
        return;
    } else {
        document.getElementById("emptyState").style.display = "none";
        document.getElementById("pagination").style.display = "flex";
    }

    // 페이지별 아이템만 렌더링
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = currentItems.slice(startIndex, endIndex);

    pageItems.forEach((item) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "gacha-item";

        itemDiv.innerHTML = `
            <a href="/gachadetail/${item.gacha_id}" class="gacha-link">
                <img src="/static/images/${item.gacha_id}.jpg" alt="${item.gacha_name}" class="gacha-image">
                <div class="gacha-info">
                    <h3 class="gacha-title">${item.gacha_name}</h3>
                    <p class="gacha-price">価格: ${item.gacha_price}円</p>
                </div>
            </a>
            <button class="heart-button liked" onclick="toggleHeart(event, this, ${item.gacha_id})">❤️</button>
        `;

        grid.appendChild(itemDiv);
    });

    updatePagination();
}

// 페이지네이션 업데이트
function updatePagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(currentItems.length / itemsPerPage);
    
    pagination.innerHTML = '';
    
    for (let i = 1; i <= Math.min(totalPages, 4); i++) {
        const button = document.createElement('button');
        button.className = `page-button ${i === currentPage ? 'active' : ''}`;
        button.textContent = i;
        button.onclick = () => changePage(i);
        pagination.appendChild(button);
    }
}

// 페이지 변경
function changePage(page) {
    currentPage = page;
    renderGachaItems();
}

// 검색 기능
document.querySelector('.search-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});
document.querySelector('.search-button').addEventListener('click', performSearch);

function performSearch() {
    const searchTerm = document.querySelector('.search-input').value.toLowerCase();
    if (searchTerm.trim()) {
        currentItems = favoriteItems.filter(item => 
            item.gacha_name.toLowerCase().includes(searchTerm)
        );
        currentPage = 1;
        renderGachaItems();
    } else {
        currentItems = [...favoriteItems];
        currentPage = 1;
        renderGachaItems();
    }
}

// 페이지 진입 시 찜 목록 불러오기 함수
async function fetchFavoriteItems() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        currentItems = [];
        renderGachaItems();
        return;
    }

    try {
        const res = await fetch('/api/gachalove', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!res.ok) throw new Error('Failed to fetch favorites');
        const data = await res.json();
        favoriteItems = data.items;
        currentItems = [...favoriteItems];
        currentPage = 1;
        renderGachaItems();
    } catch (err) {
        console.error(err);
        currentItems = [];
        renderGachaItems();
    }
}

// 페이지 로드 시 호출
document.addEventListener("DOMContentLoaded", () => {
    const loveTab = document.querySelector('a[href="/gachalove"]');
    if (loveTab) {
        loveTab.addEventListener("click", function(e) {
            e.preventDefault(); // 기본 이동 막기
            if (window.location.pathname === "/gachalove") {
                // 현재 경로가 같다면 새로고침
                window.location.reload();
            } else {
                // 경로가 다르면 원래대로 이동
                window.location.href = "/gachalove";
            }
        });
    }

    fetchFavoriteItems(); // 기존 코드
});



// 초기 렌더링 (빈 상태)
renderGachaItems();

