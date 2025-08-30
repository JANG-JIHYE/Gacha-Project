function showSection(section) {
  const sections = ['favorite', 'posts', 'comments', 'likes', 'profile'];
  sections.forEach(id => {
    document.getElementById(`${id}-section`).style.display = id === section ? 'block' : 'none';
  });
}

function handleLogout() {
  localStorage.removeItem("isLoggedIn");
  alert("ログアウトしました。");
  window.location.href = "/"; 
}