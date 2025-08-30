// サムネイル選択
        function selectThumbnail(thumbnail) {
            // すべてのサムネイルからactiveクラスを削除
            document.querySelectorAll('.thumbnail').forEach(thumb => {
                thumb.classList.remove('active');
            });
            // クリックされたサムネイルにactiveクラスを追加
            thumbnail.classList.add('active');
        }


        // お気に入りに追加
        function addToCart() {
            alert('お気に入りに追加されました！ 💖');
        }
        
        // 페이지가 로드되면 실행
        document.addEventListener('DOMContentLoaded', () => {
          // 로그인 상태가 아니면 로그인 모달 닫기
            if (localStorage.getItem("isLoggedIn") !== "true") {
              closeLoginModal();
            } else {
              // 로그인 상태면 로그인 모달 닫고 로그인 상태 버튼 UI 업데이트
              closeLoginModal();
              updateAuthButtons();
            }
            // URL에서 ID 추출
            const pathParts = window.location.pathname.split('/');
            const gachaId = pathParts[pathParts.length - 1]; //ID 몇번 추출

            fetch(`/api/gacha/detail/${gachaId}`) //추출한id를 받아서 정보를 detail/{gacha_id}api로 보냄.
                .then(response => {
                    if (!response.ok) throw new Error('Network error');
                    return response.json();
                })
                ////////////////////////////////////////
                .then(data => {
                    // 데이터로 화면 업데이트 마지막 단계
                    document.querySelector('.product-title').textContent = data.gacha_name || 'タイトルなし';
                    document.querySelector('.product-price').textContent = `価格: ¥${data.gacha_price || 0}`;
                        // ❤️ 가격 밑에 하트 수 추가
                    const priceElem = document.querySelector('.product-price');
                    if (priceElem && typeof data.gacha_heart !== 'undefined') {
                        const heartElem = document.createElement('div');
                        heartElem.className = 'product-heart-count';
                        heartElem.textContent = `❤${data.gacha_heart}個`;
                        priceElem.insertAdjacentElement('afterend', heartElem);
                    }
                    document.querySelector('.product-description p').innerHTML = (data.gacha_description || '説明なし').replace(/\n/g, '<br>');
                    
                    // 이미지 업데이트
                    const mainImageContainer = document.querySelector('.main-image-container');
                    if (mainImageContainer) {
                        mainImageContainer.innerHTML = `
                            <img src="/static/images/${gachaId}.jpg" alt="${data.gacha_name}">
                        `;
                    }

                    // 출시일, 태그 업데이트 (있으면)
                    const releaseDateElem = document.querySelector('.product-meta > div:first-child .value');
                    if (releaseDateElem && data.gacha_date) releaseDateElem.textContent = data.gacha_date;

                    const tagElem = document.querySelector('.product-meta > div:nth-child(2) .value');
                    if (tagElem && data.gacha_hash) {
                        tagElem.textContent = data.gacha_hash.split(',').map(tag => `#${tag.trim()}`).join(' ');
                    }    
                })
                .catch(err => {
                    console.error(err);
                    alert('商品の情報を取得できませんでした。');
                });
        });