/* ============================================
   CAREER PILOT — script.js
   ============================================ */

/* ── MOBILE MENU TOGGLE ── */
const menuBtn    = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');

menuBtn.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

/* Close mobile menu when a link is clicked */
function closeMenu() {
  mobileMenu.classList.remove('open');
}

/* ── CLOSE MENU ON OUTSIDE CLICK ── */
document.addEventListener('click', (e) => {
  if (!menuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
    mobileMenu.classList.remove('open');
  }
});

/* ── SMOOTH SCROLL FOR NAV LINKS ── */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

/* ── NAVBAR SHADOW ON SCROLL ── */
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (window.scrollY > 20) {
    nav.style.boxShadow = '0 2px 24px rgba(0,0,0,0.4)';
  } else {
    nav.style.boxShadow = 'none';
  }
});

/* ── FADE-IN ANIMATION ON SCROLL ── */
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity    = '1';
        entry.target.style.transform  = 'translateY(0)';
      }
    });
  },
  { threshold: 0.1 }
);

/* Apply fade-in to cards and steps */
document.querySelectorAll('.feat-card, .step, .audience-card, .plan').forEach(el => {
  el.style.opacity   = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});