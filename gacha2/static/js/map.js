// =====================================================
// 1. 전역 변수 선언
// =====================================================
let map;
let allStores = [];
// 💡 activeMarkers와 currentOverlay는 initMap 안으로 이동합니다.


// =====================================================
// 2. Google Maps 스크립트 로딩 시작
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    const Maps_API_KEY = "AIzaSyA29PobZk6ETCgJNvEHUd5uvYjl_dHEeoE";
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${Maps_API_KEY}&language=ja&callback=initMap`;
    script.async = true;
    window.initMap = initMap;
    document.head.appendChild(script);
});


// =====================================================
// 3. 지도 초기화 함수 (모든 지도 관련 로직의 시작점)
// =====================================================
function initMap() {
    // 💡 지도 관련 변수와 함수, 클래스를 모두 initMap 안에 배치합니다.
    let activeMarkers = [];
    let currentOverlay = null;

    // --- 클래스 정의 ---
    class CustomOverlay extends google.maps.OverlayView {
        constructor(position, content) {
            super();
            this.position = position;
            this.div = document.createElement('div');
            this.div.className = 'custom-popup-container';
            this.div.innerHTML = content;
            this.div.addEventListener('click', e => e.stopPropagation());
        }
        onAdd() { this.getPanes().floatPane.appendChild(this.div); }
        onRemove() { if (this.div && this.div.parentNode) { this.div.parentNode.removeChild(this.div); this.div = null; } }
        draw() {
            const projection = this.getProjection();
            const point = projection.fromLatLngToDivPixel(this.position);
            if (point) {
                this.div.style.left = `${point.x}px`;
                this.div.style.top = `${point.y}px`;
                this.div.style.display = 'block';
            }
        }
    }

    function showStorePopup(store, marker) {
        if (currentOverlay) {
            currentOverlay.setMap(null); // 기존 정보창 닫기
        }
        map.panTo(marker.getPosition()); // 지도를 마커 위치로 부드럽게 이동
        map.panBy(0, -150); // 정보창이 가리지 않도록 지도 위치 미세 조정

        const imageSrc = store.image_path ? store.image_path : '/static/store_picture/default.jpg';
        const contentString = `<div class="popup-content-wrapper"><h4>${store.name}</h4>
            <img src="${imageSrc}" alt="${store.name} 写真">
            <p><strong>〒 </strong> ${store.address}</p>
            <p><strong>電話 </strong> ${store.phone_number}</p>
            <button class="details-button" onclick='window.showDetailsModal(${JSON.stringify(store).replace(/'/g, "\\'")})'>詳細を見る</button></div>`;
        
        const overlay = new CustomOverlay(marker.getPosition(), contentString);
        overlay.setMap(map);
        currentOverlay = overlay;
    }

    // --- 기능 함수 정의 ---
    function displayMarkers(storeList) {
        activeMarkers.forEach(marker => marker.setMap(null));
        activeMarkers = [];
        if (currentOverlay) currentOverlay.setMap(null);
        if (!storeList) return;

        storeList.forEach(store => {
            if (!store.coordinates || !store.coordinates.lat || !store.coordinates.lng) return;
            const storeIcon = { url: '/static/loc.png', scaledSize: new google.maps.Size(50, 50) };
            const marker = new google.maps.Marker({
                position: { lat: store.coordinates.lat, lng: store.coordinates.lng },
                map: map,
                title: store.name,
                icon: storeIcon
            });
            activeMarkers.push(marker);
            marker.addListener('click', () => {
                if (currentOverlay) currentOverlay.setMap(null);
                map.panTo(marker.getPosition());
                map.panBy(0, -150);
                const imageSrc = store.image_path ? store.image_path : '/static/store_picture/default.jpg';
                const contentString = `<div class="popup-content-wrapper"><h4>${store.name}</h4><img src="${imageSrc}" alt="${store.name} 写真"><p><strong>〒 </strong> ${store.address}</p><p><strong>電話 </strong> ${store.phone_number}</p><button class="details-button" onclick='window.showDetailsModal(${JSON.stringify(store).replace(/'/g, "\\'")})'>詳細を見る</button></div>`;
                const overlay = new CustomOverlay(marker.getPosition(), contentString);
                overlay.setMap(map);
                currentOverlay = overlay;
            });
        });
    }

    async function performSearch() {
        const searchInput = document.querySelector('.map-search-input');
        const keyword = searchInput.value.trim();
        const searchPopup = document.getElementById('search-popup');
        const searchResultsList = document.getElementById('search-results-list');
        if (!keyword) return;

        searchResultsList.innerHTML = '';
        try {
            const res = await fetch(`/api/search?query=${encodeURIComponent(keyword)}`);
            if (!res.ok) throw new Error('サーバーエラー');
            const shops = await res.json();
            if (!shops.length) {
                alert("該当する結果はありませんでした。");
                searchPopup.style.display = 'none';
                return;
            }
            displayMarkers(shops);
            if (shops[0].coordinates && shops[0].coordinates.lat && shops[0].coordinates.lng) {
                map.panTo({ lat: shops[0].coordinates.lat, lng: shops[0].coordinates.lng });
            }
            shops.forEach((shop) => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `<strong>${shop.name}</strong><br><small>${shop.address}</small><br><small>${shop.phone_number}</small>`;
                searchResultsList.appendChild(item);
                item.addEventListener('click', () => {
                    if (shop.coordinates && shop.coordinates.lat && shop.coordinates.lng) {
                        displayMarkers([shop]); 
                        map.panTo({ lat: shop.coordinates.lat, lng: shop.coordinates.lng });
                        map.setZoom(18);
                    }
                    window.showDetailsModal(shop);
                    searchPopup.style.display = 'none';
                });
            });
            searchPopup.style.display = 'block';
            document.getElementById('reset-map-btn').style.display = 'block';
        } catch (e) {
            console.error("検索中にエラー:", e);
            alert("検索中にエラーが発生しました。");
        }
    }

    function resetMap() {
        displayMarkers(allStores);
        document.querySelector('.map-search-input').value = '';
        document.getElementById('search-popup').style.display = 'none';
        if (currentOverlay) currentOverlay.setMap(null);
        document.getElementById('reset-map-btn').style.display = 'none';
    }

    // --- 메인 로직 실행 ---
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 17,
        center: { lat: 35.6812, lng: 139.7671 }
    });

    const currentLocationIcon = { url: '/static/now.png', scaledSize: new google.maps.Size(65, 65), anchor: new google.maps.Point(35, 35) };
    new google.maps.Marker({
        position: { lat: 35.6812, lng: 139.7671 },
        map: map,
        title: '現在地 (東京駅)',
        icon: currentLocationIcon,
        zIndex: 999
    });

    // 이벤트 리스너 설정
    document.querySelector('.map-search-button').addEventListener('click', performSearch);
    document.querySelector('.map-search-input').addEventListener('keydown', (e) => { if (e.key === "Enter") performSearch(); });
    document.getElementById('search-popup-close').addEventListener('click', () => { document.getElementById('search-popup').style.display = 'none'; });
    document.getElementById('reset-map-btn').addEventListener('click', resetMap);
    map.addListener('click', () => { if (currentOverlay) currentOverlay.setMap(null); });
    
    // 상세 정보 모달 관련 이벤트 설정
    const detailsModal = document.getElementById('details-modal');
    const closeBtn = document.getElementById('modal-close-btn');

    if (closeBtn) {
        closeBtn.addEventListener('click', window.closeDetailsModal);
    }
    if (detailsModal) {
        detailsModal.addEventListener('click', function (event) {
            if (event.target === detailsModal) {
                window.closeDetailsModal();
            }
        });
    }

    // 최초 데이터 로딩
    fetch('/api/stores')
        .then(response => response.ok ? response.json() : Promise.reject('ガチャショプリストの読み込みに失敗しました。'))
        .then(stores => {
            const formattedStores = stores.map(store => ({ ...store, coordinates: { lat: store.lat, lng: store.lng } }));
            allStores = formattedStores;
            displayMarkers(allStores); // displayMarkers 함수는 마커만 생성하고 activeMarkers 배열에 추가하는 역할
            
            // 1. URL에서 store_id를 읽어옵니다.
            const urlParams = new URLSearchParams(window.location.search);
            const storeIdFromUrl = urlParams.get('store_id');

            // 2. URL에 store_id가 있다면 해당 가게를 찾아 포커스를 맞춥니다.
            if (storeIdFromUrl) {
                const targetStore = allStores.find(s => s.store_id == storeIdFromUrl);
                
                // 마커 목록에서 해당 가게의 마커를 찾습니다.
                const targetMarker = activeMarkers.find(m => m.getTitle() === targetStore.name);

                if (targetStore && targetMarker) {
                    // 1초 뒤에 정보창을 띄워서 지도 로딩 후 자연스럽게 보이도록 합니다.
                    setTimeout(() => {
                        showStorePopup(targetStore, targetMarker);
                    }, 1000);
                }
            }
        })
        .catch(error => console.error('Error fetching initial stores:', error));
}

// =====================================================
// 5. 상세 모달 및 즐겨찾기 관련 함수들
// =====================================================

/**
 * 특정 가게의 상세 정보를 보여주는 모달을 생성하고 표시합니다.
 * @param {Object} store - 상세 정보를 표시할 가게 객체
 */
async function showDetailsModal(store) {
    const detailsModal = document.getElementById('details-modal');
    const modalBody = document.getElementById('modal-body');
    const imageSrc = store.image_path ? store.image_path : '/static/store_picture/default.jpg';

    modalBody.innerHTML = `
        <div class="modal-header">
            <img src="${imageSrc}" alt="${store.name} 写真" class="modal-store-img">
            <div class="modal-store-info">
                <h2>${store.name} <span id="favorite-star-container"></span></h2>
                <p class="info-line"><i class="fa-solid fa-map-marker-alt"></i><span><strong>〒 </strong> ${store.address}</span></p>
                <p class="info-line"><i class="fa-solid fa-phone"></i><span><strong>電話 </strong> ${store.phone_number}</span></p>
            </div>
        </div>
        <hr>
        <h3>設置中のガチャ一覧</h3>
        <div class="gacha-table-container" id="gacha-list-container"><p>ガチャ一覧を読み込み中...</p></div>`;

    detailsModal.classList.add('active');
    const token = localStorage.getItem('accessToken');

    // 가게 즐겨찾기 상태 확인 및 아이콘 업데이트
    const starContainer = document.getElementById('favorite-star-container');
    let isFavorite = false;
    if (token) {
        try {
            const response = await fetch(`/api/favorites/check/store?store_id=${store.store_id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) isFavorite = (await response.json()).is_favorite;
        } catch (error) { console.error("お気に入り登録状態の確認中にエラーが発生しました。:", error); }
    }
    starContainer.innerHTML = `<i class="${isFavorite ? 'fa-solid' : 'fa-regular'} fa-star favorite-star ${isFavorite ? 'active' : ''}" onclick='toggleFavorite(this, ${JSON.stringify(store).replace(/'/g, "\\'")})'></i>`;

    // 해당 가게의 가챠 목록 조회 및 표시
    try {
        let favoriteGachaIds = new Set();
        if (token) {
            try {
                const favResponse = await fetch('/api/favorites/gacha', { headers: { 'Authorization': `Bearer ${token}` } });
                if (favResponse.ok) {
                    const favoriteGachas = await favResponse.json();
                    favoriteGachaIds = new Set(favoriteGachas.map(fav => Number(fav.gacha_id)));
                }
            } catch (e) { console.error("お気に入りリストを読み込めませんでした。:", e); }
        }

        const gachasResponse = await fetch(`/api/stores/${store.store_id}/gachas`);
        if (!gachasResponse.ok) throw new Error('商品リストの読み込みに失敗しました。');
        
        const gachas = await gachasResponse.json();
        const container = document.getElementById('gacha-list-container');

        if (!gachas || gachas.length === 0) {
            container.innerHTML = '<p>この店舗に登録されたガチャはありません。</p>';
            return;
        }

        let tableHTML = '<table class="gacha-table">';
        for (let i = 0; i < gachas.length; i++) {
            if (i % 4 === 0) tableHTML += '<tr>';
            const gacha = gachas[i];
            const isGachaFavorite = favoriteGachaIds.has(gacha.gacha_id);
            const heartIconClass = isGachaFavorite ? 'fa-solid active' : 'fa-regular';
            const stockText = gacha.stock_quantity > 0 ? `在庫: ${gacha.stock_quantity}個` : '在庫切れ';
            const stockClass = gacha.stock_quantity > 0 ? '' : 'out-of-stock';
            const defaultImgSrc = '/static/gacha_picture/default_gacha.png';

            tableHTML += `
                <td>
                    <div class="gacha-img-container">
                        <a href="/gachadetail/${gacha.gacha_id}">
                            <img src="${gacha.img_url}" alt="${gacha.name}" onerror="this.onerror=null; this.src='${defaultImgSrc}';">
                        </a>
                        <i class="favorite-gacha-heart ${heartIconClass} fa-heart" onclick="toggleGachaFavorite(this, ${gacha.gacha_id}, '${gacha.name.replace(/'/g, "\\'")}')"></i>
                    </div>
                    <p class="gacha-name">${gacha.name}</p>
                    <p class="gacha-stock ${stockClass}">${stockText}</p>
                </td>`;
            if ((i + 1) % 4 === 0 || i === gachas.length - 1) {
                tableHTML += '</tr>';
            }
        }
        tableHTML += '</table>';
        container.innerHTML = tableHTML;
    } catch (error) {
        document.getElementById('gacha-list-container').innerHTML = '<p>エラー: ガチャ一覧を読み込めません。</p>';
        console.error('Error fetching gachas:', error);
    }
}

/**
 * 상세 정보 모달을 닫는 함수.
 */
function closeDetailsModal() {
    console.log("X 버튼 클릭됨! closeDetailsModal 함수가 실행되었습니다."); 
    document.getElementById('details-modal').classList.remove('active');
}

/**
 * 가챠 즐겨찾기 상태를 토글(추가/삭제)하는 함수.
 */
async function toggleGachaFavorite(heartElement, gachaId, gachaName) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        alert('お気に入り機能はログイン後に利用できます。');
        return;
    }

    const isAdding = !heartElement.classList.contains('active');
    const method = isAdding ? 'POST' : 'DELETE';
    try {
        const response = await fetch('/api/favorites/gacha', {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ id: gachaId, name: gachaName })
        });
        if (response.ok) {
            heartElement.classList.toggle('active');
            heartElement.classList.toggle('fa-regular');
            heartElement.classList.toggle('fa-solid');
        } else {
            throw new Error((await response.json()).detail || '処理中にエラーが発生しました。');
        }
    } catch (error) {
        console.error('Error toggling gacha favorite:', error);
        alert(`エラー: ${error.message}`);
    }
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
            // 💡 다시 name을 포함하여 전송
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