/* ============================================================
   LEVI EAGLE — Portfolio JS
   Features:
     - Light / Dark mode toggle (persisted in localStorage)
     - Lenis smooth scroll with momentum         (NEW)
     - IntersectionObserver scroll-reveal with staggered delays
     - Word-by-word section title reveals        (NEW)
     - Animated stat counters (count up from 0)  (NEW)
     - Cursor spotlight on glass cards           (NEW)
     - Language bar animation on scroll
     - Sticky nav scroll state
     - Active nav link highlighting
     - Mobile nav toggle
     - Cmd+K / Ctrl+K Command Palette
     - Toast notification system
   ============================================================ */

'use strict';

// ============================================================
// 1. THEME — Light / Dark
// ============================================================

const html         = document.documentElement;
const themeToggle  = document.getElementById('themeToggle');
const STORAGE_KEY  = 'le-theme';

function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

function toggleTheme() {
  const current = html.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

(function initTheme() {
  const saved  = localStorage.getItem(STORAGE_KEY);
  const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(saved || system);
})();

themeToggle.addEventListener('click', toggleTheme);


// ============================================================
// 2. LENIS — Smooth scroll with momentum
// ============================================================

const lenis = new Lenis({
  duration: 1.15,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});

function rafLoop(time) {
  lenis.raf(time);
  requestAnimationFrame(rafLoop);
}
requestAnimationFrame(rafLoop);

/** Smooth scroll to a target with nav offset */
function smoothScrollTo(target) {
  lenis.scrollTo(target, { offset: -80 });
}


// ============================================================
// 3. NAV — Scroll state + active link + mobile toggle
// ============================================================

const nav       = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Anchor links now route through Lenis
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    smoothScrollTo(target);
  });
});

const sections   = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navAnchors.forEach(a => a.classList.remove('active'));
      const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => sectionObserver.observe(s));


// ============================================================
// 4. WORD-BY-WORD TITLE REVEAL  (NEW)
//    Splits each .section-title into per-word spans wrapped in
//    overflow:hidden masks, so they slide up when revealed.
// ============================================================

function splitTitleIntoWords(el) {
  const fragments = [];
  let wordIndex = 0;

  el.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent.split(/(\s+)/).forEach(chunk => {
        if (!chunk) return;
        if (/^\s+$/.test(chunk)) {
          fragments.push(chunk);
        } else {
          fragments.push(
            `<span class="word-mask"><span class="word" style="--word-i:${wordIndex++}">${chunk}</span></span>`
          );
        }
      });
    } else if (node.nodeName === 'BR') {
      fragments.push('<br>');
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      fragments.push(node.outerHTML);
    }
  });

  el.innerHTML = fragments.join('');
  el.classList.add('split-words');
}

document.querySelectorAll('.section-title').forEach(splitTitleIntoWords);


// ============================================================
// 5. SCROLL REVEAL — IntersectionObserver for .fade-up
// ============================================================

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    const siblings = Array.from(entry.target.parentElement.children)
      .filter(el => el.classList.contains('fade-up'));
    const idx = siblings.indexOf(entry.target);

    const hasDelay = entry.target.style.getPropertyValue('--delay');
    if (!hasDelay) {
      entry.target.style.setProperty('--delay', `${idx * 0.08}s`);
    }

    entry.target.classList.add('visible');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-up').forEach(el => revealObserver.observe(el));


// ============================================================
// 6. ANIMATED STAT COUNTERS  (NEW)
//    Stats like "2+", "22", "5" count up from 0 with easeOutCubic
//    when they enter the viewport.
// ============================================================

function animateCounter(el) {
  const text = el.textContent.trim();
  const match = text.match(/^(\d+)(.*)$/);
  if (!match) return;

  const target   = parseInt(match[1], 10);
  const suffix   = match[2]; // preserves "+" / "%" / etc.
  const duration = 1400;
  const start    = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const t       = Math.min(elapsed / duration, 1);
    const eased   = 1 - Math.pow(1 - t, 3); // easeOutCubic
    el.textContent = Math.round(target * eased) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number').forEach(el => counterObserver.observe(el));


// ============================================================
// 7. CURSOR SPOTLIGHT ON GLASS CARDS  (NEW)
//    Radial gradient follows mouse position over each card.
// ============================================================

document.querySelectorAll('.stat-card.glass, .edu-card.glass, .contact-card.glass')
  .forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
  });


// ============================================================
// 8. LANGUAGE BARS — animate on scroll into view
// ============================================================

const langSection = document.querySelector('.languages');
if (langSection) {
  const langObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.lang-fill').forEach(bar => {
          bar.classList.add('animated');
        });
        langObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  langObserver.observe(langSection);
}


// ============================================================
// 9. TOAST NOTIFICATION SYSTEM
// ============================================================

const toastEl = document.getElementById('toast');
let toastTimer;

function showToast(message, duration = 2800) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration);
}


// ============================================================
// 10. COMMAND PALETTE
// ============================================================

const paletteOverlay = document.getElementById('paletteOverlay');
const paletteInput   = document.getElementById('paletteInput');
const paletteList    = document.getElementById('paletteList');
const paletteTrigger = document.getElementById('paletteTrigger');

let paletteOpen   = false;
let activeIndex   = -1;
let filteredItems = [];

function openPalette() {
  paletteOverlay.classList.add('open');
  paletteOverlay.setAttribute('aria-hidden', 'false');
  paletteInput.value = '';
  paletteOpen = true;
  activeIndex = -1;
  renderPalette('');
  requestAnimationFrame(() => paletteInput.focus());
}

function closePalette() {
  paletteOverlay.classList.remove('open');
  paletteOverlay.setAttribute('aria-hidden', 'true');
  paletteOpen = false;
  activeIndex = -1;
}

function renderPalette(query) {
  const q = query.toLowerCase().trim();
  const allItems = Array.from(paletteList.querySelectorAll('.palette-item'));

  filteredItems = allItems.filter(item => {
    const label = item.querySelector('.palette-item-label').textContent.toLowerCase();
    const hint  = item.querySelector('.palette-item-hint').textContent.toLowerCase();
    const match = !q || label.includes(q) || hint.includes(q);
    item.style.display = match ? '' : 'none';
    return match;
  });

  activeIndex = -1;
  allItems.forEach(i => i.classList.remove('active'));
}

function setActiveItem(index) {
  filteredItems.forEach(i => i.classList.remove('active'));
  if (index < 0 || index >= filteredItems.length) return;
  filteredItems[index].classList.add('active');
  filteredItems[index].scrollIntoView({ block: 'nearest' });
}

function executeAction(action) {
  closePalette();

  switch (action) {
    case 'toggle-theme':
      toggleTheme();
      showToast(html.getAttribute('data-theme') === 'dark' ? '🌙 Dark mode on' : '☀️ Light mode on');
      break;

    case 'download-resume':
      const link = document.createElement('a');
      link.href     = 'assets/Levi_Eagle_Resume.pdf';
      link.download = 'Levi_Eagle_Resume.pdf';
      link.click();
      showToast('📄 Downloading resume...');
      break;

    case 'copy-email':
      navigator.clipboard.writeText('levi.eagle11@gmail.com').then(() => {
        showToast('✓ Email copied to clipboard');
      }).catch(() => {
        showToast('Email: levi.eagle11@gmail.com');
      });
      break;

    case 'jump-experience':
      scrollToSection('experience');
      break;

    case 'jump-contact':
      scrollToSection('contact');
      break;
  }
}

function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  smoothScrollTo(target);
}

paletteInput.addEventListener('input', e => renderPalette(e.target.value));

paletteInput.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex = Math.min(activeIndex + 1, filteredItems.length - 1);
    setActiveItem(activeIndex);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex = Math.max(activeIndex - 1, 0);
    setActiveItem(activeIndex);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (activeIndex >= 0 && filteredItems[activeIndex]) {
      executeAction(filteredItems[activeIndex].dataset.action);
    } else if (filteredItems.length === 1) {
      executeAction(filteredItems[0].dataset.action);
    }
  } else if (e.key === 'Escape') {
    closePalette();
  }
});

paletteList.addEventListener('click', e => {
  const item = e.target.closest('.palette-item');
  if (item) executeAction(item.dataset.action);
});

paletteOverlay.addEventListener('click', e => {
  if (e.target === paletteOverlay) closePalette();
});

paletteTrigger.addEventListener('click', openPalette);

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    paletteOpen ? closePalette() : openPalette();
  }
  if (e.key === 'Escape' && paletteOpen) {
    closePalette();
  }
});
