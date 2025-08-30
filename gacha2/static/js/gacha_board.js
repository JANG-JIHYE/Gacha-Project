// 전역 변수 선언
let posts = []; // 게시물 데이터를 저장할 배열 (API에서 가져옴)
let comments = {}; // 게시물별 댓글을 저장할 객체
let nextPostId = 3; // (로컬 더미 데이터용) 실제 API 사용 시 서버에서 관리
let uploadedFiles = []; // 현재 폼에서 선택/표시되는 미디어 파일 목록 (Base64 또는 URL)
let currentPostId = null; // 현재 상세 보기 중인 게시물 ID
let editingPostId = null; // 현재 수정 중인 게시물 ID
let isEditingPost = false; // 현재 게시물 수정 모드인지 여부
let currentUser = null; // 현재 로그인된 사용자 정보 (checkLoginStatus에서 설정)
let currentPage = 1;
const postsPerPage = 5; // 한 페이지에 표시할 게시물 수


 // alert 중복 방지 로직(추가)
(function () {
    const originalAlert = window.alert;
    let recentAlert = null;
    let lastAlertTime = 0;

    window.alert = function (msg) {
        const now = Date.now();

        // 1초 이내 동일 메시지면 무시
        if (msg === recentAlert && now - lastAlertTime < 1000) return;

        recentAlert = msg;
        lastAlertTime = now;

        originalAlert(msg);
    };
})();


// ✅ fetchPosts() 함수: 게시물 목록을 서버에서 가져와 UI를 업데이트합니다.
async function fetchPosts() {
    const token = localStorage.getItem("accessToken");

    try {
        const res = await fetch("/api/posts", {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${token}`,
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "Expires": "0"
            },
            credentials: "include"
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        // 받아온 게시물 데이터를 가공해서 posts 배열에 저장   
        posts = data.map(post => ({
            id: post.id,
            title: post.title,
            tag: post.tag || '',  // 태그(카테고리) 기본값 빈 문자열
            author: post.author,
            user_id: post.user_id, // ✅ 권한 비교용
            content: post.content,
            date: post.created_at ? post.created_at.split("T")[0] : '日付なし',
            like_count: Number.isFinite(Number(post.like_count)) ? Number(post.like_count) : 0,
            media: post.media || []
        }));

        // 게시물 목록 UI 업데이트
        updatePostList();
    } catch (error) {
        console.error("投稿リストの読み込み中にエラーが発生:", error);
    }
}


// ✅ DOMContentLoaded 이벤트: 문서 로드 시 모든 초기화 및 이벤트 리스너를 설정합니다.
//    이 블록은 `1234.js` 파일 내에서 단 한 번만 존재해야 합니다.
document.addEventListener("DOMContentLoaded", async function () {  // async 붙임
    console.log("DOMがロードされました。");

    // 게시물 작성 폼 미디어 업로드 이벤트 리스너
    const mediaUpload = document.getElementById('mediaUpload');
    if (mediaUpload) {
        mediaUpload.addEventListener('change', handleMediaUpload);
    }

    // 게시물 수정 폼 미디어 업로드 이벤트 리스너
    const editMediaUpload = document.getElementById('editMediaUpload');
    if (editMediaUpload) {
        editMediaUpload.addEventListener('change', handleEditMediaUpload);
    }

    // 로그인 상태 확인 및 UI 업데이트
    checkLoginStatus();

    // 모달 외부 클릭 시 닫기 이벤트 리스너 설정
    setupModalEvents();

    // 게시물 목록 초기 로드
    await fetchPosts();

    // --- 여기에 추가된 로직 ---
    // URL에서 postId를 확인하여 해당 게시물을 바로 엽니다.
     // --- 수정된 부분: fetchPosts 완료 후 postId 체크 및 처리 ---
    const urlParams = new URLSearchParams(window.location.search);
    const postIdFromUrl = urlParams.get('post');
    console.log('postIdFromUrl:', postIdFromUrl);  // 여기에 값 찍어보기
    if (postIdFromUrl) {
        const postToOpen = posts.find(p => String(p.id) === postIdFromUrl);
        if (postToOpen) {
            openPost(Number(postIdFromUrl));
        } else {
            console.warn(`초기 가져오기 후 ID ${postIdFromUrl}를 가진 게시물을 찾을 수 없습니다.`);
            closePost();
        }
    }
    // --- 추가된 로직 끝 ---

    window.addEventListener("popstate", (event) => {
        if (event.state && event.state.postId) {
            openPost(event.state.postId);
        } else {
            closePost();
        }
    });
});

document.addEventListener("DOMContentLoaded", async function () {
    console.log("DOMがロードされました。");

    // ✅ currentUser가 설정된 이후에 나머지 실행
    await checkLoginStatus();

    const mediaUpload = document.getElementById('mediaUpload');
    if (mediaUpload) {
        mediaUpload.addEventListener('change', handleMediaUpload);
    }

    const editMediaUpload = document.getElementById('editMediaUpload');
    if (editMediaUpload) {
        editMediaUpload.addEventListener('change', handleEditMediaUpload);
    }

    setupModalEvents();
    fetchPosts();  // 이제 currentUser 설정된 이후 실행됨
});



//내 게시물 조회(추가)
async function fetchMyPosts() {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("ログインが必要です。");
        return;
    }

    try {
        const res = await fetch("/my-posts", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (data.success) {
            console.log("📌 私の掲示文:", data.posts);
            // ✅ 여기서 data.posts를 화면에 표시하는 로직 작성
            // 예: 리스트 요소에 추가
            const myPostsList = document.getElementById("myPostsList");
            if (myPostsList) {
                myPostsList.innerHTML = "";
                data.posts.forEach(post => {
                    const li = document.createElement("li");
                    li.textContent = `${post.title} (${post.created_at})`;
                    myPostsList.appendChild(li);
                });
            }
        } else {
            alert(data.error || "私の投稿の読み込み中にエラーが発生しました");
        }
    } catch (err) {
        console.error("私の投稿の読み込み失敗:", err);
    }
}

// 게시물 작성 폼 관련 함수들
// ✅ showWriteForm() 함수: 새 게시물 작성 폼을 표시합니다.
function showWriteForm() {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("ログインが必要です。");
        openLoginModal();
        return;
    }

    const writeForm = document.getElementById('writeForm');
    if (writeForm) {
        writeForm.style.display = 'block';
        writeForm.scrollIntoView({ behavior: 'smooth' });
    }
}

// ✅ hideWriteForm() 함수: 새 게시물 작성 폼을 숨기고 초기화합니다.
function hideWriteForm() {
    const writeForm = document.getElementById('writeForm');
    if (writeForm) {
        writeForm.style.display = 'none';
    }

    // 폼 필드 초기화
    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
    document.getElementById('postTag').value = ''; // 태그 필드 초기화
    document.getElementById('mediaUpload').value = ''; // 파일 input 초기화
    document.getElementById('mediaPreview').innerHTML = ''; // 미리보기 영역 비우기

    uploadedFiles = []; // 업로드된 파일 배열 초기화
}

// ✅ handleMediaUpload() 함수: 새 게시물 폼에서 미디어 파일을 처리합니다.
function handleMediaUpload(event) {
    const files = Array.from(event.target.files);
    const mediaPreview = document.getElementById('mediaPreview');
    if (!mediaPreview) return;

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const mediaItem = document.createElement('div');
            mediaItem.className = 'media-item';

            let mediaElement;
            if (file.type.startsWith('image/')) {
                mediaElement = document.createElement('img');
                mediaElement.src = e.target.result; // Base64 데이터
                mediaElement.alt = file.name;
            } else if (file.type.startsWith('video/')) {
                mediaElement = document.createElement('video');
                mediaElement.src = e.target.result; // Base64 데이터
                mediaElement.controls = true;
            }

            const removeBtn = document.createElement('button');
            removeBtn.className = 'media-remove';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => {
                mediaItem.remove();
                uploadedFiles = uploadedFiles.filter(f => f.data !== e.target.result);
                console.log("📦 uploaded Filesから削除された (新しい文章):", uploadedFiles);
            };

            if (mediaElement) {
                mediaItem.appendChild(mediaElement);
                mediaItem.appendChild(removeBtn);
                mediaPreview.appendChild(mediaItem);
            }

            // Base64 포함된 미디어 객체 저장
            uploadedFiles.push({
                name: file.name,
                type: file.type,
                data: e.target.result
            });
            console.log("📦 uploaded Filesに追加された (新しい文):", uploadedFiles);
        };
        reader.readAsDataURL(file); // 파일을 Base64로 읽음
    });
}

// ✅ submitPost() 함수: 새 게시물 작성 폼을 제출합니다.
async function submitPost() {
    const token = localStorage.getItem("accessToken");
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const tag = document.getElementById('postTag').value;
    const mediaInput = document.getElementById('mediaUpload'); // <input type="file" id="mediaUpload">

    if (!title || !content || !tag) {
        alert('タイトル、内容、カテゴリを入力してください。');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('tag', tag);

    const files = mediaInput.files;
    for (let i = 0; i < files.length; i++) {
        formData.append('media', files[i]);  // 이 부분 중요: 실제 파일 객체를 append
    }

    try {
        const response = await fetch('/api/create-post', {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert('投稿が完了しました！');
            hideWriteForm();
            fetchPosts(); // 새 게시글 목록 다시 불러오기
        } else {
            alert(result.error || '投稿に失敗しました。');
        }
    } catch (error) {
        console.error('投稿中エラー:', error);
        alert('投稿中にサーバーエラーが発生しました。');
    }
}

// 게시물 상세 보기 관련 함수들
// ✅ openPost() 함수: 게시물 상세 보기를 표시합니다.
function openPost(postId) {
    isEditingPost = false;  // ✅ 글 열 때 항상 보기 모드로 시작(추가)
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    currentPostId = postId;

    history.pushState({ postId: postId }, "", `?post=${postId}`); //뒤로가기 버튼 누르면 게시판 목록으로 넘어감(추가)

    //댓글 영역 표시 여부 제어(추가)
    const commentSection = document.querySelector('.comments-section');
    if (commentSection) {
        commentSection.style.display = isEditingPost ? 'none' : 'block';
    }

    // ✅ 좋아요 버튼 먼저 설정
    const likeButton = document.querySelector('#postDetail .like-button');
    const likeCountSpan = likeButton?.querySelector('.like-count');


    if (likeButton) {
        likeButton.dataset.postId = post.id;

        loadLikeStatus(post.id, likeButton);
    }

    if (likeCountSpan) {
        likeCountSpan.textContent = post.like_count ?? 0;
    }

    // ✅ 게시글 상세 페이지에 게시글 정보를 표시하는 함수
    // 제목, 작성자, 날짜, 내용을 상세 보기 영역에 설정
    document.getElementById('postDetailTitle').textContent = post.title;
    document.getElementById('postDetailAuthor').textContent = `${post.author}`;
    document.getElementById('postDetailDate').textContent = `${post.date}`;
    document.getElementById('postDetailText').textContent = post.content;


    // 게시글 목록과 페이지네이션 숨기기
    document.getElementById('postList').style.display = 'none';
    const pagination = document.querySelector('.pagination');
    if (pagination) pagination.style.display = 'none';
    // 상세 보기 영역 보이기
    const postDetail = document.getElementById('postDetail');
    postDetail.style.display = 'block';

    // ✅ 첨부된 이미지나 동영상 미디어를 상세 페이지에 표시
    const detailMedia = document.getElementById('postDetailMedia');
    if (detailMedia) {     // 미디어가 있을 경우 처리             
        detailMedia.innerHTML = '';    // 기존 미디어 요소 초기화
        if (post.media && post.media.length > 0) {
            post.media.forEach(media => {
                let mediaElement;
                if (media.type.startsWith('image/')) {   // 이미지인 경우 <img> 요소 생성
                    mediaElement = document.createElement('img');
                    mediaElement.src = media.data;
                    mediaElement.alt = media.name || 'image';
                } else if (media.type.startsWith('video/')) {   // 비디오인 경우 <video> 요소 생성   
                    mediaElement = document.createElement('video');
                    mediaElement.src = media.data;
                    mediaElement.controls = true;
                }
                if (mediaElement) {    // 생성된 미디어 요소를 페이지에 추가
                    detailMedia.appendChild(mediaElement);
                }
            });
        }
    }

    loadComments(postId);  // ✅ 해당 게시글의 댓글 목록 불러오기
}

// ✅ closePost() 함수: 게시물 상세 보기를 닫습니다.
function closePost() {
    document.getElementById('postDetail').style.display = 'none';
    document.getElementById('postList').style.display = 'block';
    const pagination = document.querySelector('.pagination');
    if (pagination) pagination.style.display = 'flex';

    history.pushState({}, "", location.pathname); //추가
}

// ✅ updatePostList() 함수: 게시물 목록 UI를 새로 그립니다.
function updatePostList() {
    const postList = document.getElementById('postList');
    if (!postList) return;

    postList.innerHTML = ''; // 기존 목록 비우기

    // 🔥 페이지네이션 적용
    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const currentPosts = posts.slice(startIndex, endIndex);

    // 현재 페이지의 게시물만 표시
    currentPosts.forEach(post => {
        const postItem = document.createElement('div');
        postItem.className = 'post-item';
        postItem.onclick = () => openPost(post.id);

        postItem.innerHTML = `
            <div class="post-header">
                <h3 class="post-title">
                    ${post.tag ? `<span class="post-tag">[${post.tag}]</span>` : ''}
                    ${post.title}
                </h3>
                <span class="post-date">${post.date}</span>
            </div>
            <div class="post-meta">
                <span class="post-author">${post.author}</span>
            </div>
            <div class="post-preview">
                ${post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content}
            </div>
        `;

        postList.appendChild(postItem);
    });

    renderPagination(); // 페이지네이션 렌더링
}
// ✅ 페이지네이션(페이지 버튼) 렌더링 함수
function renderPagination() {
    const pagination = document.querySelector('.pagination');
    if (!pagination) return; // pagination 요소가 없으면 함수 종료

    // 전체 페이지 수 계산 (전체 게시글 수 / 페이지당 게시글 수)
    const totalPages = Math.ceil(posts.length / postsPerPage);


    // 페이지네이션 영역 보이기 및 초기화
    pagination.style.display = 'flex';
    pagination.innerHTML = '';       //처음부터 여기까지(추가) 추가기능: 게시글이 없으면 페이지네이션 자체가 안 보임, 게시글이 있으면 prev, 1, 2, 3, next 버튼이 동적으로 생성

    // ◀️ 이전 페이지 버튼 생성
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn prev-btn';
    prevBtn.textContent = '前のページ';
    prevBtn.disabled = currentPage === 1; // 첫 페이지일 경우 비활성화
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;    // 현재 페이지를 하나 줄이고
            updatePostList(); // 게시글 목록 업데이트
        }
    };
    pagination.appendChild(prevBtn); // 이전 버튼을 페이지네이션에 추가

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'page-btn';
        if (i === currentPage) pageBtn.classList.add('active');  // 현재 페이지 버튼은 강조 (active 클래스 추가)
        pageBtn.textContent = i; // 버튼에 페이지 번호 표시
        pageBtn.onclick = () => {
            currentPage = i; // 클릭한 페이지로 이동
            updatePostList();
        };
        pagination.appendChild(pageBtn); // 페이지 번호 버튼 추가
    }
    // ▶️ 다음 페이지 버튼 생성
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn next-btn';
    nextBtn.textContent = '次のページ';
    nextBtn.disabled = currentPage === totalPages; //마지막 페이지일 경우 비활성화
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            updatePostList();
        }
    };
    pagination.appendChild(nextBtn);  // 다음 버튼을 페이지네이션에 추가
}


// 댓글 관련 함수들 (기존 코드 유지)
function loadComments(postId) {
    const commentsList = document.getElementById('commentsList');
    if (!commentsList) return;

    commentsList.innerHTML = '';

    // ✅ 서버에서 댓글 데이터 가져오기
    fetch(`/api/comments/${postId}`, {
        method: 'GET',
        credentials: 'include'
    })
        .then(res => res.json())
        .then(data => {
            comments[postId] = data;

            data.forEach(comment => {
                // 💡 서버에서 받은 필드를 화면용 필드에 매핑
                comment.author = comment.nickname;
                comment.date = comment.created_at?.split("T")[0] || "日付なし";

                const commentElement = createCommentElement(comment);
                commentsList.appendChild(commentElement);
            });
        })
        .catch(error => {
            console.error("コメント読み込み失敗:", error);
            alert("コメントの読み込みに失敗しました");
        });
}


function createCommentElement(comment) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment-item';

    const canDelete =
        currentUser &&
        comment.user_id &&
        String(currentUser.user_id).trim() === String(comment.user_id).trim(); // 정확히 비교

    const deleteButtonHtml = canDelete
        ? `<button class="btn-comment-delete" onclick="deleteComment(${comment.id})">削除</button>`
        : '';

    commentDiv.innerHTML = `
        <div class="comment-header">
            <span class="comment-author">${comment.author}</span>
            <div class="comment-actions">
                <span class="comment-date">${comment.date}</span>
                ${deleteButtonHtml}
            </div>
        </div>
        <div class="comment-text">${comment.content}</div>
    `;

    return commentDiv;
}

function submitComment() {
    const content = commentContent.value;
    const token = localStorage.getItem("accessToken");

    if (!currentUser) {
        alert('ログインが必要です。');
        openLoginModal();
        return;
    }

    fetch(`/api/comments/${currentPostId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            content: content
        }),
        credentials: "include"
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert("エラー: " + data.error);
                return;
            }
            alert("コメントが投稿されました！");
            commentContent.value = "";
            loadComments(currentPostId); // 최신 댓글 다시 불러오기
        })
        .catch(err => {
            alert("コメントの投稿中にエラーが発生しました。");
            console.error(err);
        });
}

function deleteComment(commentId) {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("ログインが必要です。");
        openLoginModal();
        return;
    }

    if (!confirm("コメントを削除しますか？")) return;
    fetch("/api/comments", {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ comment_id: commentId }),
        credentials: "include"
    })
        .then(res => {
            if (!res.ok) throw new Error("コメント削除失敗");
            return res.json();
        })
        .then(data => {
            if (data.success) {
                alert("コメントが削除されました。");
                loadComments(currentPostId); // 최신 댓글 다시 불러오기
            } else {
                alert("削除できません: " + (data.error || "不明なエラー"));
            }
        })
        .catch(err => {
            alert("削除中にエラーが発生しました。");
            console.error(err);
        });
}

// 좋아요 기능
function toggleLike(button, postId) {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("ログインが必要です。");
        openLoginModal();
        return;
    }

    fetch(`/api/toggle-like/${postId}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        },
        credentials: "include"
    })
        .then(res => {
            if (!res.ok) {
                throw new Error('Network response was not ok');
            }
            return res.json();
        })
        .then(data => {
            // ✅ 좋아요 수 업데이트
            const likeCountSpan = button.querySelector(".like-count");
            if (likeCountSpan) {
                likeCountSpan.textContent = data.count ?? 0;
            }

            // ✅ 하트 아이콘 상태 업데이트
            const heartSpan = button.querySelector(".heart-icon");
            if (heartSpan) {
                heartSpan.textContent = data.liked ? "❤️" : "🤍";
            }
        })
        .catch(err => {
            console.error("いいね失敗", err);
        });
}

function loadLikeCount(postId, button) {
    fetch(`/api/like-count/${postId}`)
        .then(res => res.json())
        .then(data => {
            const countSpan = button.querySelector(".like-count");
            if (countSpan) {
                countSpan.textContent = data.count;
            }
        });
}

function loadLikeStatus(postId, button) {
    const token = localStorage.getItem("accessToken");

    // 1. 좋아요 수는 무조건 먼저 가져오기
    fetch(`/api/like-count/${postId}`)
        .then(res => res.json())
        .then(data => {
            const countSpan = button.querySelector(".like-count");
            if (countSpan) {
                countSpan.textContent = data.count ?? 0;
            }
        });

    // 2. 로그인 상태 확인 → 로그인 유저면 하트 상태도 가져옴
    if (token) {
        fetch(`/api/like-status/${postId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            credentials: "include"
        })
            .then(res => {
                if (!res.ok) throw new Error("権限なしまたは失敗");
                return res.json();
            })
            .then(data => {
                const heartSpan = button.querySelector('.heart-icon');
                if (heartSpan) {
                    heartSpan.textContent = data.liked ? '❤️' : '🤍';  // ✅ 상태 기억
                }
            })
            .catch(err => {
                console.warn("ハートステータス照会失敗:", err);
            });
    } else {
        // 비회원자: 무조건 핑크하트
        const heartSpan = button.querySelector('.heart-icon');
        if (heartSpan) {
            heartSpan.textContent = '❤️';
        }
    }
}

// 게시물 수정 폼 관련 함수들
// ✅ showEditForm() 함수: 수정 폼을 표시합니다.
function showEditForm(post) {
    isEditingPost = true; //(추가)
    const editForm = document.getElementById('editForm');
    if (editForm) {

        // 상세보기 닫기 (댓글 포함한 영역 사라짐)(추가)
        const postDetail = document.getElementById('postDetail');
        if (postDetail) postDetail.style.display = 'none';

        // 수정 폼 열기(추가)
        const editForm = document.getElementById('editForm');
        if (editForm) editForm.style.display = 'block';

        // 기존 게시글의 텍스트 정보 설정
        document.getElementById('editTitle').value = post.title || '';
        document.getElementById('editContent').value = post.content || '';
        document.getElementById('editTag').value = post.tag || '';

        // ✅ 기존 이미지 정보를 uploadedFiles 배열에 설정
        if (post.media && Array.isArray(post.media)) {
            uploadedFiles = post.media.map(media => ({
                data: media.data, // base64 포함한 data URL
                type: media.type, // image/png 등
                name: media.name || '' // 선택적으로 name도 보존
            }));

            // ✅ 미리보기에도 표시 (선택사항)
            const preview = document.getElementById('editMediaPreview');
            preview.innerHTML = '';
            uploadedFiles.forEach(file => {
                const mediaItem = document.createElement('div');
                mediaItem.className = 'media-item';

                let mediaElement;
                if (file.type.startsWith('image/')) {
                    mediaElement = document.createElement('img');
                    mediaElement.src = file.data;
                    mediaElement.alt = file.name || 'image';
                } else if (file.type.startsWith('video/')) {
                    mediaElement = document.createElement('video');
                    mediaElement.src = file.data;
                    mediaElement.controls = true;
                }

                const removeBtn = document.createElement('button');
                removeBtn.className = 'media-remove';
                removeBtn.innerHTML = '×';
                removeBtn.onclick = () => {
                    mediaItem.remove();
                    uploadedFiles = uploadedFiles.filter(f => f.data !== file.data);
                    console.log("📦 修正中にメディアが削除:", uploadedFiles);
                };

                if (mediaElement) {
                    mediaItem.appendChild(mediaElement);
                    mediaItem.appendChild(removeBtn);
                    preview.appendChild(mediaItem);
                }
            });
        } else {
            uploadedFiles = [];
        }

        isEditingPost = true;
        editingPostId = post.id;

        editForm.style.display = 'block';
        editForm.scrollIntoView({ behavior: 'smooth' });
    }
}

// ✅ handleEditMediaUpload() 함수: 수정 폼에서 미디어 파일을 처리합니다.
function handleEditMediaUpload(event) {
    const files = Array.from(event.target.files);
    const mediaPreview = document.getElementById('editMediaPreview'); // 수정 폼의 미리보기 영역 ID
    if (!mediaPreview) return;

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const mediaItem = document.createElement('div');
            mediaItem.className = 'media-item';

            let mediaElement;
            if (file.type.startsWith('image/')) {
                mediaElement = document.createElement('img');
                mediaElement.src = e.target.result; // Base64 데이터
                mediaElement.alt = file.name;
            } else if (file.type.startsWith('video/')) {
                mediaElement = document.createElement('video');
                mediaElement.src = e.target.result; // Base64 데이터
                mediaElement.controls = true;
            }

            const removeBtn = document.createElement('button');
            removeBtn.className = 'media-remove';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => {
                mediaItem.remove();
                uploadedFiles = uploadedFiles.filter(f => f.data !== e.target.result);
                console.log("📦 uploaded Filesから削除された (修正):", uploadedFiles);
            };

            if (mediaElement) {
                mediaItem.appendChild(mediaElement);
                mediaItem.appendChild(removeBtn);
                mediaPreview.appendChild(mediaItem);
            }

            // uploadedFiles 배열에 새롭게 선택된 파일의 Base64 데이터 추가
            uploadedFiles.push({
                name: file.name,
                type: file.type,
                data: e.target.result // Base64 데이터
            });
            console.log("📦 uploadedFilesに新しいファイルが追加された (修正):", uploadedFiles);
        };
        reader.readAsDataURL(file); // 파일을 Base64로 읽음
    });
}

// ✅ editPost() 함수: 게시물 수정 폼을 열고 기존 데이터를 채웁니다.
function editPost(postId) {
    editingPostId = parseInt(postId);
    isEditingPost = true;

    const post = posts.find(p => String(p.id) === String(postId));
    if (!post) {
        alert('投稿が見つかりません');
        return;
    }

    // 로그인 확인
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("ログインが必要です。");
        openLoginModal();
        return;
    }

    if (!currentUser || String(currentUser.user_id) !== String(post.user_id)) {
        alert("この投稿を編集できるのは作成者のみです。");
        return;
    }

    // 제목, 내용, 태그 채우기
    document.getElementById('editTitle').value = post.title || '';
    document.getElementById('editContent').value = post.content || '';
    document.getElementById('editTag').value = post.tag || '';

const preview = document.getElementById('editMediaPreview');
preview.innerHTML = '';
uploadedFiles = [];

if (post.media && Array.isArray(post.media)) {
    post.media.forEach(media => {
        const mediaItem = document.createElement('div');
        mediaItem.className = 'media-item'; // ✅ 통일된 스타일 사용

        const mediaUrl = media.media_url || media.data || '';
        let mediaElement;
        if (media.type.startsWith('image/')) {
            mediaElement = document.createElement('img');
            mediaElement.src = mediaUrl;
            mediaElement.alt = media.name || 'image';
        } else if (media.type.startsWith('video/')) {
            mediaElement = document.createElement('video');
            mediaElement.src = mediaUrl;
            mediaElement.controls = true;
        }

        const removeBtn = document.createElement('button');
        removeBtn.className = 'media-remove'; // ✅ 동일한 버튼
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => {
            mediaItem.remove();
            uploadedFiles = uploadedFiles.filter(f => f.data !== mediaUrl);
            console.log("📦 編集時 メディア削除:", uploadedFiles);
        };

        if (mediaElement) {
            mediaItem.appendChild(mediaElement);
            mediaItem.appendChild(removeBtn);
            preview.appendChild(mediaItem);
        }

        uploadedFiles.push({
            name: media.name || 'uploaded',
            type: media.type || 'image/png',
            data: mediaUrl // base64 또는 서버 URL
        });
    });
}
    console.log("📦 編集時初期 uploadedFiles (既存 + 新規):", uploadedFiles);

    showEditForm(post);
}

// ✅ 게시물 수정 폼을 숨기고 초기화하는 함수
function hideEditForm() {
    isEditingPost = false;  //(추가)
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.style.display = 'none'; // 수정 폼 숨기기(추가)
    
    // 상세보기 다시 열기(추가)
    const postDetail = document.getElementById('postDetail');
    if (postDetail) postDetail.style.display = 'block';
    }

    // 폼 필드 초기화
    document.getElementById('editTitle').value = '';
    document.getElementById('editContent').value = '';
    document.getElementById('editTag').value = '';
    document.getElementById('editMediaUpload').value = '';

    const mediaPreview = document.getElementById('editMediaPreview');
    if (mediaPreview) {
        mediaPreview.innerHTML = ''; // 미디어 미리보기 영역 비우기
    }

    uploadedFiles = []; // 업로드된 파일 배열 초기화
    editingPostId = null; // 수정 중인 게시물 ID 초기화
    isEditingPost = false; // 수정 모드 상태 초기화
}

// ✅ updatePost() 함수: 게시물 수정 폼을 제출합니다.
async function updatePost() {
    const title = document.getElementById('editTitle').value;
    const content = document.getElementById('editContent').value;
    const tag = document.getElementById('editTag').value;


    if (!title || !content) {
        alert('タイトルと内容を入力してください。');
        return;
    }
    if (!tag) {
        alert('カテゴリを選択してください。');
        return;
    }


    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('tag', tag);

    if (uploadedFiles) {
        const validMedia = uploadedFiles.filter(file => file.data);
        formData.append('media', JSON.stringify(validMedia)); // ✅ 빈 배열도 전송(추가)
    }

    try {
        const token = localStorage.getItem("accessToken");
        const response = await fetch(`/api/update-post/${editingPostId}`, {
            method: 'PUT',
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData,
            credentials: 'include'
        });

        const result = await response.json();

        //updatePost() 성공 시 수정 모드 종료(추가)
        if (result.success) {
            alert("投稿が修正されました！");
            hideEditForm(); // ✅ 수정 모드 종료 & 상세보기 복귀
            fetchPosts();
        }


        if (result.error) {
            alert(result.error);
        } else {
            // 🔥 editingPostId를 미리 저장해두기
            const savedEditingPostId = editingPostId;
            const savedCurrentPostId = currentPostId;

            console.log("修正前 posts:", posts);
            console.log("editingPostId:", savedEditingPostId, "タイプ:", typeof savedEditingPostId);
            console.log("currentPostId:", savedCurrentPostId, "タイプ:", typeof savedCurrentPostId);

            alert('記事が修正されました！');
            hideEditForm(); // 이 함수가 editingPostId를 null로 만듦

            await fetchPosts(); // 서버에서 최신 게시물 목록을 다시 가져옴

            // 🔥 저장된 ID를 사용해서 게시물 찾기
            const updatedPost = posts.find(p => p.id === savedEditingPostId);

            // 상세 보기 중이었다면 업데이트된 내용을 다시 표시
            if (savedCurrentPostId === savedEditingPostId && updatedPost) {
                // 상세 보기 화면 업데이트
                document.getElementById('postDetailTitle').textContent = updatedPost.title;
                document.getElementById('postDetailText').textContent = updatedPost.content;

                // 미디어 업데이트
                const detailMedia = document.getElementById('postDetailMedia');
                if (detailMedia) {
                    detailMedia.innerHTML = '';
                    if (updatedPost.media && updatedPost.media.length > 0) {
                        updatedPost.media.forEach(media => {
                            let mediaElement;
                            if (media.type.startsWith('image/')) {
                                mediaElement = document.createElement('img');
                                mediaElement.src = media.data;
                                mediaElement.alt = media.name || 'image';
                            } else if (media.type.startsWith('video/')) {
                                mediaElement = document.createElement('video');
                                mediaElement.src = media.data;
                                mediaElement.controls = true;
                            }
                            if (mediaElement) {
                                detailMedia.appendChild(mediaElement);
                            }
                        });
                    }
                }
            }

            console.log("修正後 posts:", posts);
            console.log("修正された掲示物:", updatedPost);
        }
    } catch (error) {
        console.error('エラー:', error);
        alert('投稿の修正中にエラーが発生しました。');
    }
}
// ✅ 게시글 삭제 함수
function deletePost(postId) {
    const token = localStorage.getItem("accessToken");
    if (!token) {  // 로그인 여부 확인
        alert("ログインが必要です。");
        openLoginModal();
        return;
    }
    // 현재 로그인 사용자가 게시물 작성자와 같은지 확인
    if (!confirm("投稿を削除しますか？")) return;

    // 삭제 요청 보내기
    fetch(`/api/delete-post/${postId}`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${token}`
        },
        credentials: "include"
    })
        .then(async res => {
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 403) { // 삭제 실패 시
                    alert("作成者のみ削除できます");
                } else {
                    alert("投稿の削除に失敗しました。");
                }
                throw new Error(data.detail || "削除失敗");
            } // 삭제 성공 시
            alert("投稿が削除されました。"); // 상세 보기 닫기
            closePost();
            fetchPosts();
        })
        .catch(err => {  // "게시글 삭제 오류"
            console.error("投稿削除エラー:", err);
            // 이미 alert 처리되었기 때문에 여기선 추가로 알림 필요 없음
        });

}
// 토큰여부로 로그인 체크(추가)
async function checkLoginStatus() {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        currentUser = null;
        console.log("🔓 非ログイン状態です。");
        return;
    }

    try {
        const res = await fetch("/api/me/token", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            credentials: "include"
        });

        if (!res.ok) throw new Error("認証トークンの確認に失敗しました");

        const data = await res.json();
        currentUser = {
            user_id: data.user_id,
            nickname: data.nickname,
            email: data.email
        };
    } catch (err) {
        console.error("❌ ログイン状態確認失敗:", err);
        currentUser = null;
    }
}

//로그인/회원가입 모달 창 외부를 클릭했을 때 닫히도록 처리(추가)
function setupModalEvents() {
    document.addEventListener('click', function (event) {
        const loginModal = document.getElementById("loginModal");
        const signupModal = document.getElementById("signupModal");

        if (loginModal && loginModal.style.display === "block" && !loginModal.contains(event.target)) {
            loginModal.style.display = "none";
        }

        if (signupModal && signupModal.style.display === "block" && !signupModal.contains(event.target)) {
            signupModal.style.display = "none";
        }
    });
}



