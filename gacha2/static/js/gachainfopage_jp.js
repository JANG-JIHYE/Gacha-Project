// gachainfopage_jp.js 수정된 버전

let currentPage = 1;
const itemsPerPage = 20;
let gachaItems = [];
let filteredItems = []; // 검색 결과를 저장할 배열
let userLikedGachas = new Set(); // 사용자가 좋아요한 가챠 ID들을 저장

function createMedal(index) {
    if (index === 0) return '<div class="medal gold">1</div>';
    if (index === 1) return '<div class="medal silver">2</div>';
    if (index === 2) return '<div class="medal bronze">3</div>';
    return '';
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

    fetch(`/api/gacha/heart/${gachaId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.liked) {
            button.classList.add('liked');
            button.innerHTML = '❤️';
            userLikedGachas.add(gachaId); // Set에 추가
        } else {
            button.classList.remove('liked');
            button.innerHTML = '🤍';
            userLikedGachas.delete(gachaId); // Set에서 제거
        }
    })
    .catch(err => {
        console.error('お気に入り登録に失敗:', err);
        alert('お気に入り登録の切り替えに失敗しました。');
    });
}

// 사용자가 좋아요한 가챠 목록을 서버에서 가져오는 함수
async function loadUserLikedGachas() {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        return; // 로그인하지 않은 경우 스킵
    }

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

//여기 에서 네모 목록이 만들어짐.
function renderGachaItems() {
    const grid = document.getElementById('gachaGrid');
    const itemsToRender = filteredItems.length > 0 ? filteredItems : gachaItems;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = itemsToRender.slice(startIndex, endIndex);

    grid.innerHTML = '';

    // 검색 결과가 없을 때 메시지 표시
    if (pageItems.length === 0) {
        grid.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 40px; color: #666;">該当する結果はありませんでした。</div>';
        return;
    }

    pageItems.forEach((item, index) => {
        const actualIndex = startIndex + index;
        const medalHTML = createMedal(actualIndex);
        
        // 사용자가 좋아요한 가챠인지 확인
        const isLiked = userLikedGachas.has(Number(item.gacha_id));
        const heartIcon = isLiked ? '❤️' : '🤍';
        const heartClass = isLiked ? 'heart-button liked' : 'heart-button';
        
        const gachaItem = document.createElement('a');
        gachaItem.href = `/gachadetail/${item.gacha_id}`;
        gachaItem.className = 'gacha-item';
        gachaItem.innerHTML = `
            <div class="gacha-image">
                ${medalHTML}
                <img src="/static/images/${item.gacha_id}.jpg" alt="${item.gacha_name}" />
                <button class="${heartClass}"
                    onclick="toggleHeart(event, this, ${item.gacha_id})">${heartIcon}</button>
            </div>
            <div class="gacha-info">
                <div class="gacha-title">${item.gacha_name}</div>
                <div class="gacha-price">¥${item.gacha_price}</div>
                
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
        // 검색어가 없으면 전체 목록으로 되돌리기
        filteredItems = [];
        currentPage = 1;
        renderGachaItems();
        updatePageButtons();
        return;
    }

    // 검색 API 호출
    fetch(`/api/gacha/search?q=${encodeURIComponent(searchTerm)}`)
        .then(response => response.json())
        .then(data => {
            filteredItems = data;
            currentPage = 1; // 검색 후 첫 페이지로 이동
            renderGachaItems();
            updatePageButtons();
        })
        .catch(error => {
            console.error('検索処理に失敗:', error);
            alert('検索中にエラーが発生しました');
        });
}

// ✅ 초기 데이터 로드 - 수정된 부분
document.addEventListener('DOMContentLoaded', async function () {
    function isLoggedIn() {
        return !!localStorage.getItem('accessToken');
    }

    // 1. 사용자 좋아요 목록 먼저 로드
    await loadUserLikedGachas();
    
    // 2. 가챠 목록 로드
    try {
        const response = await fetch("/api/gacha/list");
        const data = await response.json();
        gachaItems = data;
        
        // 3. 렌더링
        renderGachaItems();
    } catch (error) {
        console.error("商品リストの読み込みに失敗しました。:", error);
    }

    // 4. 좋아요 탭 클릭 이벤트
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


    // 5. 검색 이벤트 (추가된 부분 중복 방지용)
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-button');

    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
});
