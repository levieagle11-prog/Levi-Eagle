/* ============================================================
   LEVI EAGLE — Portfolio JS
   Features:
     - Light / Dark mode toggle (persisted in localStorage)
     - IntersectionObserver scroll-reveal with staggered delays
     - Language bar animation on scroll
     - Sticky nav scroll state
     - Active nav link highlighting
     - Mobile nav toggle
     - Cmd+K / Ctrl+K Command Palette
       · Keyboard navigation (↑ ↓ Enter ESC)
       · Live search filter
       · Actions: toggle theme · download resume · copy email
                  jump to section
     - Toast notification system
   ============================================================ */

'use strict';

// ============================================================
// 1. THEME — Light / Dark
// ============================================================

const html         = document.documentElement;
const themeToggle  = document.getElementById('themeToggle');
const STORAGE_KEY  = 'le-theme';

/** Apply theme and persist it */
function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

/** Toggle between light and dark */
function toggleTheme() {
  const current = html.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

// Load saved preference (or system preference as fallback)
(function initTheme() {
  const saved  = localStorage.getItem(STORAGE_KEY);
  const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(saved || system);
})();

themeToggle.addEventListener('click', toggleTheme);


// ============================================================
// 2. NAV — Scroll state + active link + mobile toggle
// ============================================================

const nav       = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

// Scrolled class for border / shadow
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// Mobile hamburger toggle
navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Close mobile nav on link click
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Smooth scroll with nav offset
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// Active nav link on scroll
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
// 3. SCROLL REVEAL — IntersectionObserver for .fade-up
// ============================================================

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    // Stagger siblings within the same parent
    const siblings = Array.from(entry.target.parentElement.children)
      .filter(el => el.classList.contains('fade-up'));
    const idx = siblings.indexOf(entry.target);

    // Respect existing --delay on element, or calculate from sibling index
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
// 4. LANGUAGE BARS — animate on scroll into view
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
// 5. TOAST NOTIFICATION SYSTEM
// ============================================================

const toastEl = document.getElementById('toast');
let toastTimer;

/**
 * Show a toast message
 * @param {string} message — what to display
 * @param {number} duration — ms before auto-dismiss (default 2800)
 */
function showToast(message, duration = 2800) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration);
}


// ============================================================
// 6. COMMAND PALETTE
// ============================================================

const paletteOverlay = document.getElementById('paletteOverlay');
const paletteInput   = document.getElementById('paletteInput');
const paletteList    = document.getElementById('paletteList');
const paletteTrigger = document.getElementById('paletteTrigger');

let paletteOpen    = false;
let activeIndex    = -1;   // keyboard-navigated index
let filteredItems  = [];   // currently visible palette items

/** Open the command palette */
function openPalette() {
  paletteOverlay.classList.add('open');
  paletteOverlay.setAttribute('aria-hidden', 'false');
  paletteInput.value = '';
  paletteOpen = true;
  activeIndex = -1;
  renderPalette('');
  // Focus input after transition starts
  requestAnimationFrame(() => paletteInput.focus());
}

/** Close the command palette */
function closePalette() {
  paletteOverlay.classList.remove('open');
  paletteOverlay.setAttribute('aria-hidden', 'true');
  paletteOpen = false;
  activeIndex = -1;
}

/** Render (filter) palette items based on query */
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

  // Reset active highlight
  activeIndex = -1;
  allItems.forEach(i => i.classList.remove('active'));
}

/** Highlight item at index */
function setActiveItem(index) {
  filteredItems.forEach(i => i.classList.remove('active'));
  if (index < 0 || index >= filteredItems.length) return;
  filteredItems[index].classList.add('active');
  filteredItems[index].scrollIntoView({ block: 'nearest' });
}

/** Execute the action for a palette item */
function executeAction(action) {
  closePalette();

  switch (action) {
    case 'toggle-theme':
      toggleTheme();
      showToast(html.getAttribute('data-theme') === 'dark' ? '🌙 Dark mode on' : '☀️ Light mode on');
      break;

    case 'download-resume':
      // Trigger a real download of the resume PDF
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
        // Fallback for browsers without clipboard API
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

/** Smooth scroll to a section by ID */
function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - 80;
  window.scrollTo({ top, behavior: 'smooth' });
}

// Filter as user types
paletteInput.addEventListener('input', e => renderPalette(e.target.value));

// Keyboard navigation inside palette
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
      // Auto-select if only one result
      executeAction(filteredItems[0].dataset.action);
    }
  } else if (e.key === 'Escape') {
    closePalette();
  }
});

// Click on palette items
paletteList.addEventListener('click', e => {
  const item = e.target.closest('.palette-item');
  if (item) executeAction(item.dataset.action);
});

// Click overlay background to close
paletteOverlay.addEventListener('click', e => {
  if (e.target === paletteOverlay) closePalette();
});

// Palette trigger button in nav
paletteTrigger.addEventListener('click', openPalette);

// Global keyboard shortcut: Cmd+K / Ctrl+K
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    paletteOpen ? closePalette() : openPalette();
  }
  // Also close with ESC when palette is open
  if (e.key === 'Escape' && paletteOpen) {
    closePalette();
  }
});
