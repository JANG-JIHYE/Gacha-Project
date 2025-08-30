let currentSlide = 0;
const slides = document.querySelectorAll('.banner-slide');
const track = document.getElementById('bannerTrack');
const dots = document.querySelectorAll('.banner-dot');

function goToSlide(index) {
    currentSlide = index;
    const offset = -100 * index;
    if (track) track.style.transform = `translateX(${offset}%)`;
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    goToSlide(currentSlide);
}

setInterval(nextSlide, 5000); // 5초마다 슬라이드 전환