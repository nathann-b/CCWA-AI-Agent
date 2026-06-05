// Hero Carousel
(function () {
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.carousel-dot');
  if (!slides.length) return;
  let cur = 0, timer;

  function goTo(n) {
    slides[cur].classList.remove('active');
    dots[cur] && dots[cur].classList.remove('active');
    cur = (n + slides.length) % slides.length;
    slides[cur].classList.add('active');
    dots[cur] && dots[cur].classList.add('active');
  }
  function start() { clearInterval(timer); timer = setInterval(() => goTo(cur + 1), 5000); }

  document.querySelector('.carousel-arrow.next')?.addEventListener('click', () => { goTo(cur + 1); start(); });
  document.querySelector('.carousel-arrow.prev')?.addEventListener('click', () => { goTo(cur - 1); start(); });
  dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); start(); }));
  start();
})();

// Mobile nav toggle
const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('nav.main-nav');
menuToggle?.addEventListener('click', function () {
  mainNav?.classList.toggle('open');
  this.textContent = mainNav?.classList.contains('open') ? '✕' : '☰';
});

// Mobile dropdown accordion
document.querySelectorAll('nav.main-nav ul li>a').forEach(link => {
  if (link.nextElementSibling?.classList.contains('dropdown')) {
    link.addEventListener('click', e => {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        const dd = link.nextElementSibling;
        dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
      }
    });
  }
});

// Calendar — builds June 2026
(function () {
  const grid = document.getElementById('cal-grid');
  if (!grid) return;
  const year = 2026, month = 5;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const td = new Date(); const isNow = td.getFullYear() === year && td.getMonth() === month;
  const holidays = { 19: 'Juneteenth — Office Closed' };
  const events = { 10: 'Board of Directors Meeting', 23: 'Water Conservation Workshop', 30: 'Rate Hearing — Public Notice' };

  for (let i = 0; i < firstDay; i++) {
    const c = document.createElement('div'); c.className = 'cal-day empty'; grid.appendChild(c);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const c = document.createElement('div'); c.className = 'cal-day'; c.textContent = d;
    if (isNow && d === td.getDate()) c.classList.add('today');
    if (holidays[d]) { c.classList.add('holiday'); c.title = holidays[d]; }
    if (events[d]) { c.classList.add('has-event'); c.title = events[d]; }
    grid.appendChild(c);
  }
})();

// Generic form submission handler
function initForm(id) {
  const form = document.getElementById(id);
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Submitting…';
    setTimeout(() => {
      const prev = form.querySelector('.form-success-msg');
      prev && prev.remove();
      form.insertAdjacentHTML('afterbegin',
        `<div class="info-box success-box form-success-msg">
          <span class="ib-icon">✓</span>
          <div>Your submission was received. We'll respond within 1–2 business days.</div>
        </div>`);
      form.reset();
      btn.disabled = false; btn.textContent = orig;
    }, 1400);
  });
}

initForm('contact-form');
initForm('report-form');
initForm('pay-form');

// Pay-option card selection
document.querySelectorAll('.pay-card').forEach(card => {
  card.addEventListener('click', function () {
    document.querySelectorAll('.pay-card').forEach(c => c.classList.remove('selected'));
    this.classList.add('selected');
  });
});

// Issue-type button selection
document.querySelectorAll('.issue-type-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.issue-type-btn').forEach(b => b.classList.remove('selected'));
    this.classList.add('selected');
    const typeInput = document.getElementById('issue-type-input');
    if (typeInput) typeInput.value = this.dataset.type || this.textContent.trim();
  });
});
