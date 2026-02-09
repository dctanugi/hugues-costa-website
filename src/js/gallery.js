document.addEventListener("DOMContentLoaded", function () {
  const swiperEl = document.querySelector(".gallery-swiper");
  if (!swiperEl) return;

  const swiper = new Swiper(".gallery-swiper", {
    slidesPerView: 1,
    spaceBetween: 0,
    centeredSlides: true,
    loop: false,
    keyboard: {
      enabled: true,
      onlyInViewport: true,
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    on: {
      slideChange: function () {
        var counter = document.querySelector(".current-slide");
        if (counter) {
          counter.textContent = this.activeIndex + 1;
        }
      },
    },
  });
});
