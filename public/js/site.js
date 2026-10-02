// Behaviour for the public website: header, mobile menu and scroll-driven details.
(function () {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Header: solid background once the page scrolls ---
  // Switches to a light header while a light section sits beneath it.
  const header = document.querySelector('.site-header');
  if (header) {
    const lightSections = Array.from(document.querySelectorAll('.section--light, .section--mist, .program-body'));
    const update = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
      const line = header.offsetHeight / 2;
      const overLight = !root.classList.contains('menu-open') && lightSections.some((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= line && rect.bottom >= line;
      });
      header.classList.toggle('is-light', overLight && !isOverDarkChild(line));
    };
    // A dark block inside a light section (e.g. a program page's closing call to action)
    const isOverDarkChild = (line) => Array.from(document.querySelectorAll('.program-cta')).some((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top <= line && rect.bottom >= line;
    });
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  // --- Mobile menu ---
  const toggle = document.querySelector('.menu-toggle');
  if (toggle) {
    const setOpen = (open) => {
      root.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', () => setOpen(!root.classList.contains('menu-open')));
    document.querySelectorAll('.mobile-menu a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  // --- Reveal on scroll ---
  const revealables = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('is-visible'));
  }

  // --- Highlight list: the item nearest the middle of the screen is lit ---
  const highlightItems = Array.from(document.querySelectorAll('[data-highlight] li'));
  if (highlightItems.length) {
    const pick = () => {
      const middle = window.innerHeight / 2;
      let best = null;
      let bestDistance = Infinity;
      highlightItems.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - middle);
        if (distance < bestDistance) { bestDistance = distance; best = item; }
      });
      highlightItems.forEach((item) => item.classList.toggle('is-active', item === best));
    };
    pick();
    window.addEventListener('scroll', pick, { passive: true });
    window.addEventListener('resize', pick);
  }

  // --- Live campus clock (India Standard Time) ---
  const clocks = document.querySelectorAll('[data-clock]');
  if (clocks.length) {
    const format = new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
    });
    const tick = () => {
      const time = format.format(new Date()).toUpperCase();
      clocks.forEach((el) => { el.textContent = `${time} IST`; });
    };
    tick();
    setInterval(tick, 1000);
  }

  // --- Rotating words ---
  document.querySelectorAll('[data-rotate]').forEach((rotator) => {
    const words = Array.from(rotator.children);
    if (words.length < 2) return;
    let index = 0;
    words[0].classList.add('is-on');
    if (reduceMotion) return;
    setInterval(() => {
      words[index].classList.remove('is-on');
      index = (index + 1) % words.length;
      words[index].classList.add('is-on');
    }, 2200);
  });

  // --- Gentle parallax for collage images ---
  const parallax = Array.from(document.querySelectorAll('[data-parallax]'));
  if (parallax.length && !reduceMotion) {
    let ticking = false;
    const move = () => {
      const vh = window.innerHeight;
      parallax.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
        el.style.transform = `translateY(${(progress * Number(el.dataset.parallax)).toFixed(1)}px)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(move); ticking = true; }
    }, { passive: true });
    move();
  }
})();
