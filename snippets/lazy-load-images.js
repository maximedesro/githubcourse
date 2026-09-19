document.addEventListener('DOMContentLoaded', () => {
  const lazyImages = document.querySelectorAll('img[data-src]');

  const observer = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const img = entry.target;

        img.src = img.dataset.src;
        img.removeAttribute('data-src');

        observer.unobserve(img);
      });
    },
    {
      rootMargin: '400px 0px',
      threshold: 0,
    }
  );

  lazyImages.forEach((img) => observer.observe(img));
});
