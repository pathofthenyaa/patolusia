import { buildAccentPalette, DEFAULT_ACCENT } from "./accent-palette.js";

const root = document.documentElement;
const themeButton = document.querySelector("#theme-btn");
const phone = document.querySelector("#phone-preview");
const accentInput = document.querySelector("#accent");
const dialog = document.querySelector("#sample-dialog");
const toast = document.querySelector("#toast");
const toastText = document.querySelector("#toast-text");
let toastTimer;

function applyTheme(theme) {
  const selected = theme === "dark" ? "dark" : "light";
  root.dataset.theme = selected;
  syncChoice("theme", selected);
  themeButton.setAttribute("aria-label", selected === "dark" ? "Włącz jasny motyw" : "Włącz ciemny motyw");
  themeButton.setAttribute("aria-pressed", String(selected === "dark"));
}
function applyAccent(input) {
  const palette = buildAccentPalette(input);
  accentInput.value = palette.selected.toLowerCase();
  root.style.setProperty("--accent-base", palette.tokens["--accent-base"]);
  root.style.setProperty("--accent-strong", palette.tokens["--accent-strong"]);
  root.style.setProperty("--accent-gradient-end", palette.tokens["--accent-gradient-end"]);
  root.style.setProperty("--accent-glow-light", palette.tokens["--accent-glow-light"]);
  root.style.setProperty("--accent-glow-dark", palette.tokens["--accent-glow-dark"]);
  root.style.setProperty("--accent-shadow-light", palette.tokens["--accent-shadow-light"]);
  root.style.setProperty("--accent-shadow-dark", palette.tokens["--accent-shadow-dark"]);
  root.style.setProperty("--accent-soft-light", palette.tokens["--accent-soft-light"]);
  root.style.setProperty("--accent-soft-dark", palette.tokens["--accent-soft-dark"]);
  root.style.setProperty("--accent-pressed-light", palette.tokens["--accent-pressed-light"]);
  root.style.setProperty("--accent-pressed-dark", palette.tokens["--accent-pressed-dark"]);
  root.style.setProperty("--accent-border-light", palette.tokens["--accent-border-light"]);
  root.style.setProperty("--accent-border-dark", palette.tokens["--accent-border-dark"]);
  root.style.setProperty("--primary", palette.tokens["--accent-base"]);
  root.style.setProperty("--primary-dark", palette.tokens["--accent-strong"]);
}
function showToast(message, type = "info") {
  clearTimeout(toastTimer);
  const kind = ["info", "success", "error"].includes(type) ? type : "info";
  toast.dataset.type = kind;
  toast.setAttribute("role", kind === "error" ? "alert" : "status");
  document.querySelector("#toast-symbol").setAttribute("href", kind === "success" ? "#i-check" : kind === "error" ? "#i-info" : "#i-info");
  toastText.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2300);
}
// Menu sa portalami w body: zawsze ponad zawartoscia i bez zmiany ukladu.
function restoreOverlay(menu) {
  const anchor = menu.__nekoAnchor;
  menu.hidden = true;
  menu.classList.remove("is-overlay");
  for (const name of ["top", "left", "width", "max-height"]) menu.style.removeProperty(name);
  if (anchor) anchor.append(menu);
  menu.__nekoAnchor = null;
  const trigger = document.querySelector(`[aria-controls="${menu.id}"]`);
  if (trigger) trigger.setAttribute("aria-expanded", "false");
}
function dismissMenus() {
  document.querySelectorAll(".context-menu.is-overlay").forEach(restoreOverlay);
  document.querySelectorAll(".context-menu:not([hidden])").forEach(menu => { menu.hidden = true; });
  document.querySelectorAll('.choice-trigger[aria-expanded="true"]').forEach(trigger => trigger.setAttribute("aria-expanded", "false"));
  document.querySelectorAll('.neko-app-menu__item[aria-expanded="true"]').forEach(trigger => trigger.setAttribute("aria-expanded", "false"));
}
function positionOverlay(menu, trigger, {choice = false, appBar = false} = {}) {
  const anchor = menu.parentElement;
  menu.__nekoAnchor = anchor;
  document.body.append(menu);
  menu.classList.add("is-overlay");
  menu.hidden = false;
  const rect = trigger.getBoundingClientRect();
  const margin = 8, gap = 6;
  const viewportWidth = window.innerWidth;
  const width = appBar ? Math.min(244, viewportWidth - margin * 2)
    : choice ? Math.min(Math.max(rect.width, 188), 280, viewportWidth - margin * 2)
    : Math.min(280, viewportWidth - margin * 2);
  const left = appBar && trigger.closest('.neko-app-menu__group--main')
    ? Math.max(margin, Math.min(rect.left, viewportWidth - width - margin))
    : Math.max(margin, Math.min(rect.right - width, viewportWidth - width - margin));
  menu.style.width = `${width}px`;
  menu.style.left = `${left}px`;
  const height = menu.scrollHeight;
  const below = window.innerHeight - rect.bottom - margin - gap;
  const above = rect.top - margin - gap;
  const openAbove = height > below && above > below;
  const desiredTop = openAbove ? rect.top - gap - height : rect.bottom + gap;
  menu.style.top = `${Math.max(margin, Math.min(desiredTop, window.innerHeight - margin - height))}px`;
  // Lista wyboru bez przewijania; menu akcji zachowuje awaryjny scroll dla dlugich list.
  if (!choice && height > window.innerHeight - margin * 2) {
    menu.style.maxHeight = `${window.innerHeight - margin * 2}px`;
    menu.style.top = `${margin}px`;
  }
  trigger.setAttribute("aria-expanded", "true");
}
function toggleMenu(id, trigger) {
  const menu = document.getElementById(id);
  if (!menu) return;
  const wasOpen = !menu.hidden;
  dismissMenus();
  if (!wasOpen) positionOverlay(menu, trigger);
}
function syncChoice(key, value) {
  const choice = document.querySelector(`[data-choice="${key}"]`);
  if (!choice) return;
  const menu = document.getElementById(choice.querySelector(".choice-trigger").getAttribute("aria-controls"));
  const option = [...menu.querySelectorAll("[data-value]")].find(item => item.dataset.value === String(value));
  if (!option) return;
  choice.querySelector(".choice-value").textContent = option.querySelector("span").textContent;
  menu.querySelectorAll("[data-value]").forEach(item => item.setAttribute("aria-checked", String(item === option)));
}
function toggleChoice(choice) {
  const trigger = choice.querySelector(".choice-trigger");
  const menu = document.getElementById(trigger.getAttribute("aria-controls"));
  const opening = menu.hidden;
  dismissMenus();
  if (!opening) return;
  positionOverlay(menu, trigger, {choice: true});
  menu.querySelector('[aria-checked="true"]')?.focus({preventScroll:true});
}
function selectChoice(choice, option) {
  const key = choice.dataset.choice;
  const value = option.dataset.value;
  if (key === "theme") applyTheme(value);
  else if (key === "width") setPreviewWidth(value);
  else syncChoice(key, value);
  dismissMenus();
  choice.querySelector(".choice-trigger").focus({ preventScroll: true });
}
function openDialog() {
  dismissMenus();
  if (!dialog.open) dialog.showModal();
}
function closeDialog() {
  if (dialog.open) dialog.close();
}
function setPreviewWidth(value) {
  const numeric = Number(value);
  if (![320, 360, 393, 412, 560].includes(numeric)) return;
  phone.style.setProperty("--preview-width", numeric + "px");
  syncChoice("width", String(numeric));
}

// Build 017 · Fix live font preview in the portaled application menu.
const appMenuDemo = document.querySelector('[data-app-menu-demo]');
let appMenuDocuments = [
  {id:1, name:'config.js', modified:false},
  {id:2, name:'notes.md', modified:true},
  {id:3, name:'index.html', modified:false}
];
let appMenuSelected = 2, appMenuNextId = 4;
let appMenuSyntax = 'markdown';
let appMenuFontSize = 14;
let appMenuPreviousPage = 'syntax';
const appMenuFontInput = document.getElementById('app-font-size');
function syncAppMenuFont() {
  // The menu is portaled to document.body when open, so it is no longer
  // a descendant of appMenuDemo. Always address its stable menu element.
  const menu = document.getElementById('app-menu-view');
  if (!menu) return;
  const summary = menu.querySelector('[data-app-font-summary]');
  const preview = menu.querySelector('[data-app-font-preview]');
  if (!summary || !preview) return;
  summary.textContent = appMenuFontSize + ' px';
  preview.style.fontSize = appMenuFontSize + 'px';
}
if (appMenuFontInput) {
  appMenuFontInput.addEventListener('input', () => {
    const n = Number(appMenuFontInput.value);
    if (appMenuFontInput.value !== '' && Number.isInteger(n) && n >= 8 && n <= 20) {
      appMenuFontSize = n;
      syncAppMenuFont();
    }
  });
  appMenuFontInput.addEventListener('change', () => {
    const n = Number(appMenuFontInput.value);
    appMenuFontSize = Math.max(8, Math.min(20, Number.isFinite(n) && appMenuFontInput.value !== '' ? Math.round(n) : appMenuFontSize));
    appMenuFontInput.value = String(appMenuFontSize);
    syncAppMenuFont();
  });
}
syncAppMenuFont();

// One dropdown hosts both pages; no second popup is created.
function setAppMenuPage(page, focus = true) {
  const menu = document.getElementById('app-menu-view');
  if (!menu) return;
  menu.querySelectorAll('[data-app-page]').forEach(panel => {
    panel.hidden = panel.dataset.appPage !== page;
  });
  if (page !== 'root') appMenuPreviousPage = page;
  menu.querySelectorAll('[data-app-submenu]').forEach(entry => {
    entry.setAttribute('aria-expanded', String(entry.dataset.appSubmenu === page));
  });
  menu.scrollTop = 0;
  if (!menu.hidden && menu.classList.contains('is-overlay')) {
    const trigger = appMenuDemo.querySelector('[data-app-menu="view"]');
    const rect = trigger.getBoundingClientRect();
    const height = menu.getBoundingClientRect().height;
    const margin = 8, gap = 6;
    const below = window.innerHeight - rect.bottom - margin - gap;
    const above = rect.top - margin - gap;
    const desired = height > below && above > below ? rect.top - gap - height : rect.bottom + gap;
    menu.style.top = String(Math.max(margin, Math.min(desired, window.innerHeight - margin - height))) + 'px';
  }
  if (focus && !menu.hidden) {
    const target = page === 'root'
      ? menu.querySelector('[data-app-submenu="' + appMenuPreviousPage + '"]')
      : menu.querySelector('[data-app-page="' + page + '"] [data-app-back]');
    target?.focus({preventScroll:true});
  }
}
function backFromAppSubmenu() {
  const menu = document.getElementById('app-menu-view');
  if (!menu || menu.hidden || ![...menu.querySelectorAll('[data-app-page]')].some(panel => !panel.hidden && panel.dataset.appPage !== 'root')) return false;
  setAppMenuPage('root');
  return true;
}

function syncAppMenuDocuments() {
  if (!appMenuDemo) return;
  appMenuDemo.querySelector('[data-app-count]').textContent = `Karty (${appMenuDocuments.length})`;
  appMenuDemo.querySelector('[data-app-current]').textContent = appMenuDocuments.find(d => d.id === appMenuSelected)?.name ?? 'Brak dokumentu';
  const list = document.getElementById('app-menu-tabs');
  list.replaceChildren();
  for (const doc of appMenuDocuments) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'menuitemradio');
    button.setAttribute('aria-checked', String(doc.id === appMenuSelected));
    button.dataset.appSwitch = String(doc.id);
    const dot = document.createElement('span');
    dot.className = doc.modified ? 'neko-app-dropdown__modified' : 'neko-app-dropdown__clean';
    dot.setAttribute('aria-hidden', 'true');
    const title = document.createElement('span');
    title.textContent = doc.name;
    const check = document.createElementNS('http://www.w3.org/2000/svg','svg');
    check.classList.add('neko-app-dropdown__check');
    check.innerHTML = '<use href="#i-check"/>';
    button.append(dot, title, check);
    list.append(button);
  }
}
function handleAppMenuClick(button) {
  if (!appMenuDemo) return false;
  if (button.matches('[data-app-menu]')) {
    const dropdown = document.getElementById(button.getAttribute('aria-controls'));
    const wasOpen = !dropdown.hidden;
    if (button.dataset.appMenu === 'view') setAppMenuPage('root', false);
    dismissMenus();
    if (!wasOpen) {
      positionOverlay(dropdown, button, {appBar:true});
    }
    return true;
  }
  if (button.matches('[data-app-submenu]')) {
    setAppMenuPage(button.dataset.appSubmenu);
    return true;
  }
  if (button.matches('[data-app-back]')) {
    setAppMenuPage('root');
    return true;
  }
  if (button.matches('[data-app-syntax]')) {
    appMenuSyntax = button.dataset.appSyntax;
    const menu = document.getElementById('app-menu-view');
    menu.querySelectorAll('[data-app-syntax]').forEach(option => {
      option.setAttribute('aria-checked', String(option.dataset.appSyntax === appMenuSyntax));
    });
    const label = button.children[1].textContent;
    menu.querySelector('[data-app-syntax-summary]').textContent = label;
    dismissMenus();
    showToast('Składnia: ' + label + ' (demonstracja)');
    return true;
  }
  if (button.matches('[data-app-new]')) {
    dismissMenus();
    if (appMenuDocuments.length >= 12) {
      showToast('Osiągnięto limit 12 kart (demo)', 'error');
      return true;
    }
    const id = appMenuNextId++;
    appMenuDocuments.push({id, name:`Nowa karta ${id}`, modified:false});
    appMenuSelected = id;
    syncAppMenuDocuments();
    showToast(`Utworzono: Nowa karta ${id} (demo)`);
    return true;
  }
  if (button.matches('[data-app-switch]')) {
    appMenuSelected = Number(button.dataset.appSwitch);
    syncAppMenuDocuments();
    dismissMenus();
    return true;
  }
  if (button.matches('[data-app-toggle]')) {
    button.setAttribute('aria-checked', String(button.getAttribute('aria-checked') !== 'true'));
    dismissMenus();
    showToast(`${button.querySelector('span').textContent}: ${button.getAttribute('aria-checked') === 'true' ? 'włączono' : 'wyłączono'} (demo)`);
    return true;
  }
  if (button.matches('[data-app-action]')) {
    dismissMenus();
    showToast(`${button.dataset.appAction} — przykład działania`);
    return true;
  }
  return false;
}
syncAppMenuDocuments();

themeButton.addEventListener("click", () => applyTheme(root.dataset.theme === "light" ? "dark" : "light"));
accentInput.addEventListener("input", event => applyAccent(event.target.value));
document.querySelector("#reset-accent").addEventListener("click", () => applyAccent(DEFAULT_ACCENT));

document.addEventListener("click", event => {
  const btn = event.target.closest("button");
  if (!btn) {
    if (!event.target.closest(".context-menu")) dismissMenus();
    return;
  }
  if (handleAppMenuClick(btn)) return;
  const choice = btn.closest(".choice");
  if (choice && btn.matches(".choice-trigger")) { toggleChoice(choice); return; }
  if (btn.matches(".choice-menu [data-value]")) {
    const owner = document.querySelector(`.choice [aria-controls="${btn.closest(".choice-menu").id}"]`)?.closest(".choice");
    if (owner) selectChoice(owner, btn);
    return;
  }
  if (btn.matches("[data-open-menu]")) {
    toggleMenu(btn.dataset.openMenu, btn);
    return;
  }
  if (btn.matches("[data-open-dialog]")) {
    openDialog();
    return;
  }
  if (btn.matches("[data-close-dialog]")) {
    closeDialog();
    return;
  }
  if (btn.matches("[data-confirm-dialog]")) {
    closeDialog();
    showToast("Zatwierdzono (demonstracja)", "success");
    return;
  }
  if (btn.matches("[data-toast]")) {
    dismissMenus();
    showToast(btn.dataset.toast, btn.dataset.toastType || "info");
    return;
  }
  if (btn.matches("[data-nav]")) {
    btn.closest(".bottom-nav").querySelectorAll("button").forEach(item => item.classList.remove("is-active"));
    btn.classList.add("is-active");
    showToast("Podgląd nawigacji: " + btn.dataset.nav);
    return;
  }
  if (btn.matches("[data-toggle-row]")) {
    btn.closest(".file-row").classList.toggle("is-selected");
    return;
  }
  if (btn.closest(".segmented")) {
    const group = btn.closest(".segmented");
    group.querySelectorAll("button").forEach(item => {
      const active = item === btn;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    return;
  }
  if (!btn.closest(".context-menu")) dismissMenus();
});

// Przy zmianie układu chowamy nakładkę, zamiast zostawiać ją w starej pozycji.
window.addEventListener("resize", dismissMenus);
window.addEventListener("scroll", event => {
  if (!event.target.closest?.(".choice-menu, .neko-app-dropdown")) dismissMenus();
}, true);
document.addEventListener("pointerdown", event => {
  if (!event.target.closest("[data-open-menu]") && !event.target.closest("[data-app-menu]") && !event.target.closest(".context-menu") && !event.target.closest(".choice-trigger")) dismissMenus();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (backFromAppSubmenu()) { event.preventDefault(); return; }
    dismissMenus();
    return;
  }
  const menu = event.target.closest(".choice-menu, .neko-app-dropdown");
  if (!menu) return;
  const items = [...menu.querySelectorAll(menu.classList.contains('neko-app-dropdown') ? 'button:not([disabled])' : '[data-value]')]
    .filter(item => !item.closest('[data-app-page][hidden]'));
  if (!items.length) return;
  const index = items.indexOf(document.activeElement);
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    items[(index + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus();
  } else if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    items[event.key === "Home" ? 0 : items.length - 1].focus();
  }
});
dialog.addEventListener("click", event => {
  if (event.target === dialog) closeDialog();
});
document.querySelector("#copy-code").addEventListener("click", async () => {
  const source = document.querySelector("#code-sample").textContent;
  try {
    await navigator.clipboard.writeText(source);
    showToast("Kod skopiowany");
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(document.querySelector("#code-sample"));
    selection.removeAllRanges();
    selection.addRange(range);
    showToast("Zaznaczono kod do skopiowania");
  }
});
document.querySelectorAll(".side-link").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".side-link").forEach(item => item.classList.remove("is-current"));
    link.classList.add("is-current");
  });
});
applyTheme("light");
applyAccent(DEFAULT_ACCENT);
setPreviewWidth("412");


// Build 005: native number input supports the keyboard; Neko buttons provide visible stepping.
function configureStepper(stepper) {
  const input = stepper.querySelector('input[type="number"]');
  const down = stepper.querySelector('[data-step="down"]');
  const up = stepper.querySelector('[data-step="up"]');
  if (!input || !down || !up) return;
  const bounds = () => ({min:input.min === '' ? -Infinity : Number(input.min),max:input.max === '' ? Infinity : Number(input.max)});
  const clamp = (number) => { const {min,max}=bounds();return Math.min(max,Math.max(min,number)); };
  const refresh = () => {
    const n = input.value === '' ? NaN : Number(input.value);
    const {min,max}=bounds();
    down.disabled = input.disabled || (Number.isFinite(n) && n <= min);
    up.disabled = input.disabled || (Number.isFinite(n) && n >= max);
  };
  const change = direction => {
    if (input.disabled) return;
    const {min,max}=bounds();
    const step = Number(input.step) > 0 ? Number(input.step) : 1;
    const current = input.value === '' || !Number.isFinite(Number(input.value)) ? (Number.isFinite(min) ? min : 0) : Number(input.value);
    const decimals = Math.min(10,(String(step).split('.')[1]||'').length);
    const next = clamp(Number((current + direction * step).toFixed(decimals)));
    if (next !== current || input.value === '') {
      input.value = String(next);
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    refresh();
  };
  down.addEventListener('click',()=>change(-1));
  up.addEventListener('click',()=>change(1));
  input.addEventListener('input',refresh);
  input.addEventListener('change',()=>{
    if(input.value !== '' && Number.isFinite(Number(input.value))) input.value = String(clamp(Number(input.value)));
    refresh();
  });
  refresh();
}
document.querySelectorAll('[data-stepper]').forEach(configureStepper);

// Build 011 · Tabs: trzy widoczne karty, lekkie nachodzenie, fade, snap 50%, języczki jako przyciski.
for (const widget of document.querySelectorAll('[data-tabs]')) {
  const viewport = widget.querySelector('.neko-tab-viewport');
  const tabs = [...viewport.querySelectorAll('[role="tab"]')];
  const prev = widget.querySelector('[data-tab-prev]');
  const next = widget.querySelector('[data-tab-next]');
  if (!tabs.length || !prev || !next) continue;

  const visible = Math.min(3, tabs.length);
  const maxPosition = Math.max(0, tabs.length - visible);
  const overlap = 9;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let position = 0;
  let targetPosition = 0;
  let activeIndex = 0;
  let width = 100;
  let pointer = null;
  let animation = 0;
  let ignoreClick = false;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  function render() {
    tabs.forEach((tab, i) => {
      const p = i - position;
      const shift = overlap * clamp(p, 0, 1);
      tab.style.left = `${p * width - shift}px`;
      tab.style.width = `${width + shift}px`;
      // Fade only the cards that enter/leave the three-tab viewport.
      const alpha = clamp(Math.min(1 + p, visible - p), 0, 1);
      tab.style.opacity = String(alpha);
      tab.style.visibility = alpha < .001 ? 'hidden' : 'visible';
      tab.style.pointerEvents = alpha < .55 ? 'none' : 'auto';
      tab.style.zIndex = String(i === activeIndex ? 40 : 20 - i);
    });
    prev.disabled = position < .01;
    next.disabled = position > maxPosition - .01;
  }

  function setActive(index, focus = false) {
    if (index < 0 || index >= tabs.length || tabs[index].disabled) return;
    activeIndex = index;
    tabs.forEach((tab, i) => {
      const selected = i === activeIndex;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel && widget.contains(panel)) panel.hidden = !selected;
    });
    if (focus) tabs[activeIndex].focus({preventScroll:true});
    render();
  }

  function stopAnimation() {
    if (animation) cancelAnimationFrame(animation);
    animation = 0;
  }

  function animateTo(target) {
    stopAnimation();
    target = clamp(target, 0, maxPosition);
    targetPosition = target;
    const from = position;
    const change = target - from;
    if (Math.abs(change) < .0001 || reducedMotion.matches) {
      position = target;
      render();
      return;
    }
    const started = performance.now();
    function frame(now) {
      const progress = clamp((now - started) / 270, 0, 1);
      position = from + change * (1 - Math.pow(1 - progress, 3));
      render();
      if (progress < 1) animation = requestAnimationFrame(frame);
      else { animation = 0; position = target; render(); }
    }
    animation = requestAnimationFrame(frame);
  }

  function ensureSelectedInView(target) {
    // There must always be an active tab within the visible trio after scrolling.
    const lo = target, hi = target + visible - 1;
    if (activeIndex < lo) setActive(lo);
    if (activeIndex > hi) setActive(hi);
  }

  function goTo(target) {
    target = clamp(target, 0, maxPosition);
    ensureSelectedInView(target);
    animateTo(target);
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      if (ignoreClick) return;
      setActive(i);
      const dest = clamp(i < position ? i : i > position + visible - 1 ? i - visible + 1 : Math.round(position), 0, maxPosition);
      animateTo(dest);
    });
  });

  // Języczki mają mały wygląd, ale cały przycisk o wysokości 54px przyjmuje dotyk.
  prev.addEventListener('click', () => goTo(targetPosition - 1));
  next.addEventListener('click', () => goTo(targetPosition + 1));

  viewport.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const current = event.target.closest('[role="tab"]');
    if (!current) return;
    event.preventDefault();
    let index = tabs.indexOf(current);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = tabs.length - 1;
    else index = clamp(index + (event.key === 'ArrowRight' ? 1 : -1), 0, tabs.length - 1);
    setActive(index, true);
    const dest = clamp(index < position ? index : index > position + visible - 1 ? index - visible + 1 : Math.round(position), 0, maxPosition);
    animateTo(dest);
  });

  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false) return;
    stopAnimation();
    pointer = {id:event.pointerId, x:event.clientX, y:event.clientY, original:position, moving:false, vertical:false};
  });
  viewport.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.moving && !pointer.vertical) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 7) { pointer.vertical = true; return; }
      if (Math.abs(dx) > 6) {
        pointer.moving = true;
        try { viewport.setPointerCapture(event.pointerId); } catch { /* no capture available */ }
      }
    }
    if (!pointer.moving || pointer.vertical) return;
    position = clamp(pointer.original - dx / width, 0, maxPosition);
    render();
  });
  function endPointer(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const wasDragged = pointer.moving && !pointer.vertical;
    pointer = null;
    if (wasDragged) {
      ignoreClick = true;
      setTimeout(() => { ignoreClick = false; }, 150);
    }
    // Round is the half-card threshold: >50% completes, <50% snaps back.
    const target = clamp(Math.round(position), 0, maxPosition);
    ensureSelectedInView(target);
    animateTo(target);
  }
  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);
  viewport.addEventListener('click', event => {
    if (ignoreClick) { event.preventDefault(); event.stopPropagation(); }
  }, true);

  const observer = new ResizeObserver(() => {
    width = Math.max(1, viewport.clientWidth / visible);
    render();
  });
  observer.observe(viewport);
  width = Math.max(1, viewport.clientWidth / visible);
  setActive(0);
  render();
  viewport.classList.add('is-ready');
}


// Build 020 — Full NekoEdytor screen. Self-contained UI prototype, not CodeMirror/SAF.
{
  const studio = document.getElementById('nke-studio');
  if (studio) {
    const viewport = studio.querySelector('[data-nke-tabs]');
    const editor = studio.querySelector('[data-nke-editor]');
    const gutter = studio.querySelector('[data-nke-lines]');
    const popup = studio.querySelector('[data-nke-popup]');
    const dialogLayer = studio.querySelector('[data-nke-dialog]');
    const notice = studio.querySelector('[data-nke-notice]');
    const previous = studio.querySelector('[data-nke-prev]');
    const following = studio.querySelector('[data-nke-next]');
    const count = studio.querySelector('[data-nke-count]');
    const caret = studio.querySelector('[data-nke-caret]');
    const state = studio.querySelector('[data-nke-state]');
    const syntaxLabel = studio.querySelector('[data-nke-syntax-label]');

    // All quick commands are also available from the upper menus.
    const shortcutCatalog=[
      {id:'new',label:'Nowa karta',icon:'plus',group:'Plik'},
      {id:'open',label:'Otwórz plik',icon:'folder',group:'Plik'},
      {id:'save',label:'Zapisz',icon:'save',group:'Plik'},
      {id:'saveas',label:'Zapisz jako…',icon:'file',group:'Plik'},
      {id:'close',label:'Zamknij kartę',icon:'close',group:'Plik'},
      {id:'preferences',label:'Preferencje',icon:'settings',group:'Plik'},
      {id:'undo',label:'Cofnij',icon:'undo',group:'Edycja'},
      {id:'redo',label:'Ponów',icon:'refresh',group:'Edycja'},
      {id:'search',label:'Znajdź i zamień',icon:'search',group:'Edycja'},
      {id:'line',label:'Przejdź do wiersza',icon:'goto',group:'Edycja'},
      {id:'indent',label:'Wcięcie',icon:'indent',group:'Edycja'},
      {id:'outdent',label:'Usuń wcięcie',icon:'outdent',group:'Edycja'},
      {id:'duplicate',label:'Duplikuj wiersz',icon:'duplicate',group:'Edycja'},
      {id:'up',label:'Przenieś wiersz w górę',icon:'line-up',group:'Edycja'},
      {id:'down',label:'Przenieś wiersz w dół',icon:'line-down',group:'Edycja'},
      {id:'uppercase',label:'Wielkie litery',icon:'type',group:'Edycja'},
      {id:'lowercase',label:'Małe litery',icon:'type',group:'Edycja'},
      {id:'trim',label:'Usuń końcowe spacje',icon:'trim',group:'Edycja'},
      {id:'format',label:'Formatuj JSON',icon:'code',group:'Edycja'},
      {id:'syntax',label:'Składnia',icon:'code',group:'Widok'},
      {id:'font',label:'Czcionka',icon:'type',group:'Widok'},
      {id:'wrap',label:'Zawijanie wierszy',icon:'wrap',group:'Widok'},
      {id:'fold',label:'Zwijanie bloków',icon:'fold',group:'Widok'},
      {id:'appearance',label:'Wygląd edytora',icon:'palette',group:'Widok'},
      {id:'preview',label:'Podgląd Markdown',icon:'eye',group:'Widok'},
      {id:'symbols',label:'Symbole',icon:'symbols',group:'Widok'},
      {id:'cards',label:'Karty',icon:'list',group:'Widok'},
      {id:'edit-shortcuts',label:'Edytuj pasek skrótów',icon:'edit',group:'Widok'}
    ];
    const shortcutById=new Map(shortcutCatalog.map(x=>[x.id,x]));
    const DEFAULT_SHORTCUTS=['undo','redo','symbols','search','preview'];
    const shortcutArea=studio.querySelector('[data-nke-shortcuts]');
    const shortcutRoot=shortcutArea.closest('.nke-shortcutbar');
    const shortcutAdd=studio.querySelector('[data-nke-shortcut-add]');
    const shortcutEdit=studio.querySelector('[data-nke-shortcut-edit]');
    let shortcuts=DEFAULT_SHORTCUTS.slice(),editingShortcuts=false;
    const symbols=[
      {text:'⇥',value:'  ',title:'Dwa odstępy'},
      {text:'{ }',value:'{}',title:'Nawiasy klamrowe',back:1},
      {text:'( )',value:'()',title:'Nawiasy okrągłe',back:1},
      {text:'[ ]',value:'[]',title:'Nawiasy kwadratowe',back:1},
      {text:'< >',value:'<>',title:'Nawiasy ostre',back:1},
      {text:'""',value:'""',title:'Cudzysłów podwójny',back:1},
      {text:"''",value:"''",title:'Apostrof',back:1},
      {text:'/',value:'/',title:'Ukośnik'},
      {text:';',value:';',title:'Średnik'},
      {text:':',value:':',title:'Dwukropek'},
      {text:'=',value:'=',title:'Znak równości'},
      {text:'_',value:'_',title:'Podkreślenie'},
      {text:'#',value:'#',title:'Krzyżyk'},
      {text:'@',value:'@',title:'Małpa'}
    ];
    function drawShortcuts(){
      shortcutArea.innerHTML=shortcuts.map(id=>{
        const item=shortcutById.get(id);if(!item)return '';
        return '<div class="nke-shortcut-item"><button type="button" data-nke-shortcut="'+id+'" title="'+clean(item.label)+'" aria-label="'+clean(item.label)+'">'+icon(item.icon)+'</button>'+
          (editingShortcuts?'<button type="button" class="nke-shortcut-remove" data-nke-remove="'+id+'" title="Usuń skrót" aria-label="Usuń skrót: '+clean(item.label)+'">×</button>':'')+'</div>';
      }).join('');
      shortcutRoot.classList.toggle('is-editing',editingShortcuts);
      shortcutAdd.hidden=!editingShortcuts;
      shortcutEdit.setAttribute('aria-pressed',String(editingShortcuts));
      shortcutEdit.title=editingShortcuts?'Zakończ edycję':'Edytuj pasek skrótów';
      shortcutEdit.setAttribute('aria-label',shortcutEdit.title);
      shortcutEdit.querySelector('use').setAttribute('href',editingShortcuts?'#i-check':'#i-edit');
    }
    function toggleShortcutEdit(next){
      editingShortcuts=!!next;
      if(!editingShortcuts&&menuName==='shortcuts')closeMenu();
      drawShortcuts();
    }
    function toggleShortcut(id){
      if(!shortcutById.has(id))return;
      shortcuts=shortcuts.includes(id)?shortcuts.filter(x=>x!==id):[...shortcuts,id];
      drawShortcuts();
    }
    const symbolButtons=()=>'<div class="nke-symbol-grid">'+symbols.map(x=>
      '<button type="button" data-nke-insert="'+clean(x.value)+'" data-nke-caret-back="'+(x.back||0)+'" title="'+clean(x.title)+'" aria-label="'+clean(x.title)+'">'+clean(x.text)+'</button>'
    ).join('')+'</div>';
    const MAX = 12, VISIBLE = 3, OVERLAP = 8;
    const icon = (name) => '<svg aria-hidden="true"><use href="#i-' + name + '"/></svg>';
    const clean = (value) => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
    let documents = [
      {id:1,name:'notes.md',syntax:'Markdown',dirty:false,text:'# NekoEdytor\n\n## Nowy interfejs\n\n- Górne menu aplikacji\n- Zakładki połączone z edytorem\n- Podmenu Składnia i Czcionka\n\nTo jest interaktywna makieta.\nMożesz edytować ten tekst.'},
      {id:2,name:'config.json',syntax:'JSON',dirty:true,text:'{\n  "application": "NekoEdytor",\n  "version": "0.4.0",\n  "theme": "Neko Style",\n  "tabs": 12,\n  "fontSize": 14\n}\n'},
      {id:3,name:'index.html',syntax:'HTML',dirty:false,text:'<!doctype html>\n<html lang="pl">\n<head>\n  <title>Neko</title>\n</head>\n<body>\n  <main>NekoEdytor</main>\n</body>\n</html>'},
      {id:4,name:'README.md',syntax:'Markdown',dirty:true,text:'# Projekt Neko\n\nPrzykładowy czwarty dokument.\nDłuższe nazwy i większa liczba\nkart służą do testowania układu.'}
    ];
    let active = 1, nextId = 5, menuName = null, subPage = null, fontSize = 14;
    let position = 0, tabWidth = 100, drag = null, anim = 0, suppressClick = false;
    let pendingClose = null, noticeTimer = 0, docTabs = [];
    const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
    const current = () => documents.find(d=>d.id===active);
    const maxPosition = () => Math.max(0,documents.length-VISIBLE);
    const displayName = (name) => name.length > 55 ? name.slice(0,52)+'…' : name;

    function showNotice(message) {
      clearTimeout(noticeTimer);
      notice.textContent=message;
      notice.hidden=false;
      noticeTimer=setTimeout(()=>{notice.hidden=true;},2200);
    }
    function updateStatus() {
      const doc = current();
      if(!doc)return;
      count.textContent='Karty ('+documents.length+')';
      syntaxLabel.textContent=doc.syntax;
      state.textContent=doc.dirty?'Zmodyfikowano':'Zapisano';
      const prefix = editor.value.slice(0,editor.selectionStart);
      const segments=prefix.split('\n');
      caret.textContent='Wiersz '+segments.length+' · Kol. '+(segments[segments.length-1].length+1);
      const lines=Math.max(1,editor.value.split('\n').length);
      gutter.textContent=Array.from({length:lines},(_,i)=>String(i+1)).join('\n');
      gutter.scrollTop=editor.scrollTop;
    }
    function paintTabs(){
      const max=maxPosition();
      position=clamp(position,0,max);
      docTabs.forEach((tab,i)=>{
        const p=i-position;
        const shift=OVERLAP*clamp(p,0,1);
        const alpha=clamp(Math.min(1,1+p,VISIBLE-p),0,1);
        tab.style.left=(p*tabWidth-shift)+'px';
        tab.style.width=(tabWidth+shift)+'px';
        tab.style.opacity=String(alpha);
        tab.style.visibility=alpha<.001?'hidden':'visible';
        tab.style.pointerEvents=alpha<.55?'none':'auto';
        const selected=documents[i]?.id===active;
        tab.classList.toggle('is-active',selected);
        tab.setAttribute('aria-selected',String(selected));
        tab.style.zIndex=String(selected?30:20-i);
      });
      previous.disabled=position<=.01;
      following.disabled=position>=max-.01;
    }
    function measureTabs(){tabWidth=Math.max(1,viewport.clientWidth/VISIBLE);paintTabs();}
    function animateTo(target){
      target=clamp(target,0,maxPosition());
      cancelAnimationFrame(anim);
      const start=performance.now(),from=position,difference=target-from;
      if(Math.abs(difference)<.001){position=target;paintTabs();return;}
      const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if(reduced){position=target;paintTabs();return;}
      const frame=now=>{
        const t=clamp((now-start)/230,0,1);
        position=from+difference*(1-(1-t)**3);
        paintTabs();
        if(t<1)anim=requestAnimationFrame(frame);
        else{anim=0;position=target;paintTabs();}
      };
      anim=requestAnimationFrame(frame);
    }
    function mountTabs(){
      viewport.replaceChildren();
      docTabs=documents.map(doc=>{
        const tab=document.createElement('div');
        tab.className='nke-tab';
        tab.setAttribute('role','tab');
        tab.dataset.nkeTabId=String(doc.id);
        tab.setAttribute('aria-label',doc.name+(doc.dirty?', niezapisane zmiany':''));
        tab.innerHTML=(doc.dirty?'<span class="nke-tab__dirty" aria-hidden="true"></span>':'')+
          '<button type="button" class="nke-tab__select" data-nke-activate="'+doc.id+'" title="'+clean(doc.name)+'"><span>'+clean(displayName(doc.name))+'</span></button>'+
          '<button type="button" class="nke-tab__close" data-nke-close="'+doc.id+'" aria-label="Zamknij '+clean(doc.name)+'" title="Zamknij">×</button>';
        viewport.append(tab);return tab;
      });
      position=clamp(position,0,maxPosition());
      measureTabs();
    }
    function refreshTabs(){mountTabs();if(menuName==='cards')drawMenu();}
    function selectDocument(id){
      if(!documents.some(doc=>doc.id===id))return;
      active=id;
      const doc=current();
      editor.value=doc.text;
      editor.scrollTop=0;
      studio.style.setProperty('--nke-font-size',fontSize+'px');
      const i=documents.findIndex(d=>d.id===id);
      if(i<Math.round(position))animateTo(i);
      else if(i>=Math.round(position)+VISIBLE)animateTo(i-VISIBLE+1);
      paintTabs();
      updateStatus();
    }
    function newDocument(){
      if(documents.length>=MAX){showNotice('Limit 12 kart');return;}
      const id=nextId++;
      documents.push({id,name:'Bez nazwy '+(id-4),syntax:'Zwykły tekst',dirty:false,text:''});
      mountTabs();
      selectDocument(id);
      closeMenu();
      showNotice('Utworzono nową kartę');
    }
    function saveDocument(doc){
      if(!doc)return;
      doc.dirty=false;
      refreshTabs();
      updateStatus();
      showNotice('Zapisano (makieta)');
    }
    function closeDocument(id){
      const index=documents.findIndex(d=>d.id===id);
      if(index<0)return;
      documents.splice(index,1);
      if(!documents.length){
        const n=nextId++;
        documents.push({id:n,name:'Bez nazwy '+(n-4),syntax:'Zwykły tekst',dirty:false,text:''});
      }
      if(active===id) active=documents[Math.min(index,documents.length-1)].id;
      position=clamp(position,0,maxPosition());
      mountTabs();
      selectDocument(active);
      closeMenu();
    }
    function requestClose(id){
      const doc=documents.find(d=>d.id===id);
      if(!doc)return;
      if(!doc.dirty){closeDocument(id);return;}
      pendingClose=id;
      studio.querySelector('[data-nke-dialog-label]').textContent=
        'Zamknąć „'+doc.name+'”? Dokument zawiera niezapisane zmiany.';
      closeMenu();
      dialogLayer.hidden=false;
      studio.querySelector('[data-nke-confirm="cancel"]').focus();
    }
    function setFontSize(value){
      const n=Number(value);
      if(!Number.isFinite(n))return;
      fontSize=clamp(Math.round(n),8,20);
      studio.style.setProperty('--nke-font-size',fontSize+'px');
      if(menuName==='view' && subPage==='font'){
        const input=popup.querySelector('[data-nke-font-input]');
        const sample=popup.querySelector('[data-nke-font-sample]');
        if(input)input.value=String(fontSize);
        if(sample)sample.style.fontSize=fontSize+'px';
        for(const b of popup.querySelectorAll('[data-nke-step]')) b.disabled=Number(b.dataset.nkeStep)<0?fontSize<=8:fontSize>=20;
      }
      updateStatus();
    }
    const menuRow=(label,action,iconName,right='',more='')=>
      '<button type="button" class="nke-poprow'+(iconName?'':' nke-poprow--plain')+'" '+action+'>'+(iconName?icon(iconName):'')+
      '<span class="nke-poprow__label">'+clean(label)+'</span>'+
      ((right||more)?'<span class="nke-poprow__tail">'+
        (right?'<span class="nke-poprow__hint">'+clean(right)+'</span>':'')+
        (more||'')+'</span>':'')+'</button>';
    function drawMenu(){
      if(!menuName)return;
      const row=(label,act,iconName,right='',more='')=>menuRow(label,act,iconName,right,more);
      let body='';
      if(menuName==='cards'){
        body=documents.map(doc=>'<div class="nke-popcard'+(doc.id===active?' is-current':'')+'">'+
          '<button type="button" class="nke-popcard__select" data-nke-card="'+doc.id+'" title="'+clean(doc.name)+'">'+
          '<span class="'+(doc.dirty?'nke-popcard__dot':'nke-popcard__space')+'" aria-hidden="true"></span>'+
          '<span class="nke-popcard__name">'+clean(doc.name)+'</span></button>'+
          '<button type="button" class="nke-popcard__close" data-nke-close="'+doc.id+'" aria-label="Zamknij '+clean(doc.name)+'">×</button></div>').join('');
      }else if(menuName==='file'){
        body=row('Otwórz plik','data-nke-cmd="open"','folder')+
          row('Zapisz','data-nke-cmd="save"','save')+
          row('Zapisz jako…','data-nke-cmd="saveas"','file')+
          row('Zamknij kartę','data-nke-cmd="close"','close')+
          '<div class="nke-pop-sep"></div>'+
          row('Preferencje','data-nke-cmd="preferences"','settings');
      }else if(menuName==='edit'){
        body=row('Cofnij','data-nke-cmd="undo"','undo')+
          row('Ponów','data-nke-cmd="redo"','refresh')+
          row('Znajdź i zamień','data-nke-cmd="search"','search')+
          row('Przejdź do wiersza','data-nke-cmd="line"','goto')+
          '<div class="nke-pop-sep"></div>'+
          row('Wcięcie','data-nke-cmd="indent"','indent')+
          row('Usuń wcięcie','data-nke-cmd="outdent"','outdent')+
          row('Duplikuj wiersz','data-nke-cmd="duplicate"','duplicate')+
          row('Przenieś wiersz w górę','data-nke-cmd="up"','line-up')+
          row('Przenieś wiersz w dół','data-nke-cmd="down"','line-down')+
          row('Wielkie litery','data-nke-cmd="uppercase"','type')+
          row('Małe litery','data-nke-cmd="lowercase"','type')+
          row('Usuń końcowe spacje','data-nke-cmd="trim"','trim')+
          '<div class="nke-pop-sep"></div>'+
          row('Formatuj JSON','data-nke-cmd="format"','code');
      }else if(menuName==='view'){
        if(!subPage){
          body=row('Składnia','data-nke-sub="syntax"','code',current().syntax,icon('chevron'))+
            row('Czcionka','data-nke-sub="font"','type',fontSize+' px',icon('chevron'))+
            '<div class="nke-pop-sep"></div>'+
            row('Zawijanie wierszy','data-nke-cmd="wrap"','wrap','',editor.wrap==='soft'?icon('check'):'')+
            row('Zwijanie bloków','data-nke-cmd="fold"','fold')+
            row('Podgląd Markdown','data-nke-cmd="preview"','eye')+
            row('Symbole','data-nke-sub="symbols"','symbols','',icon('chevron'))+
            row('Karty','data-nke-cmd="cards"','list')+
            '<div class="nke-pop-sep"></div>'+
            row('Wygląd edytora','data-nke-cmd="appearance"','palette')+
            row('Pasek skrótów','data-nke-sub="toolbar"','edit','',icon('chevron'));
        }else if(subPage==='syntax'){
          const langs=['Zwykły tekst','Markdown','JSON','JavaScript','TypeScript','HTML','CSS','XML','Python','Kotlin','Shell'];
          body=row('Widok','data-nke-back','back','Składnia')+'<div class="nke-pop-sep"></div>'+
            langs.map(name=>row(name,'data-nke-lang="'+clean(name)+'"',null,'',current().syntax===name?icon('check'):'' )).join('');
        }else if(subPage==='font'){
          body=row('Widok','data-nke-back','back','Czcionka')+'<div class="nke-pop-sep"></div>'+
            '<div class="nke-pop-font-row"><label for="nke-font-size">Rozmiar tekstu</label>'+
            '<div class="nke-pop-font-control"><div class="number-stepper">'+
            '<button class="stepper-button" type="button" data-nke-step="-1" aria-label="Zmniejsz czcionkę">'+icon('minus')+'</button>'+
            '<input id="nke-font-size" class="stepper-input" data-nke-font-input type="number" inputmode="numeric" min="8" max="20" step="1" value="'+fontSize+'">'+
            '<button class="stepper-button" type="button" data-nke-step="1" aria-label="Zwiększ czcionkę">'+icon('plus')+'</button>'+
            '</div><span class="nke-pop-font-unit">px</span></div></div>'+
            '<div class="nke-pop-font-preview" data-nke-font-sample style="font-size:'+fontSize+'px">Przykładowy tekst edytora</div>';
        }else if(subPage==='symbols'){
          body=row('Widok','data-nke-back','back','Symbole')+symbolButtons();
        }else if(subPage==='toolbar'){
          body=row('Widok','data-nke-back','back','Pasek skrótów')+
            '<div class="nke-pop-sep"></div>'+
            row('Edytuj pasek','data-nke-cmd="edit-shortcuts"','edit')+
            row('Przywróć domyślne','data-nke-cmd="reset-shortcuts"','refresh');
        }
      }else if(menuName==='symbols'){
        body='<div class="nke-popup-heading">Symbole</div>'+symbolButtons();
      }else if(menuName==='shortcuts'){
        body='<div class="nke-popup-heading">Wybierz skróty</div>'+
          ['Plik','Edycja','Widok'].map(group=>'<div class="nke-popup-heading">'+group+'</div>'+
            shortcutCatalog.filter(entry=>entry.group===group).map(entry=>
              '<button type="button" class="nke-poprow nke-shortcut-choice" data-nke-shortcut-toggle="'+entry.id+'" role="menuitemcheckbox" aria-checked="'+String(shortcuts.includes(entry.id))+'">'+icon(entry.icon)+
              '<span class="nke-poprow__label">'+clean(entry.label)+'</span><span class="nke-poprow__tail">'+
              (shortcuts.includes(entry.id)?icon('check'):'')+'</span></button>'
            ).join('')
          ).join('');
      }
      popup.innerHTML=body;
      popup.hidden=false;
      if(subPage==='font')setFontSize(fontSize);
      if(menuName==='view'&&subPage)popup.querySelector('[data-nke-back]')?.focus({preventScroll:true});
    }
    function openMenu(kind,trigger){
      if(menuName===kind){closeMenu();return;}
      closeMenu();menuName=kind;subPage=null;
      for(const b of studio.querySelectorAll('[data-nke-menu]'))
        b.setAttribute('aria-expanded',String(b===trigger));
      drawMenu();
      const rect=trigger.getBoundingClientRect(),scr=studio.getBoundingClientRect();
      const width=Math.min(248,studio.clientWidth-8);
      const fromBottom=!!trigger.closest('.nke-shortcutbar');
      popup.dataset.nkeAnchor=fromBottom?'bottom':'top';
      const ideal=kind==='cards'&&!fromBottom?studio.clientWidth-width-4:rect.left-scr.left;
      popup.style.left=clamp(ideal,4,studio.clientWidth-width-4)+'px';
    }
    function closeMenu(){
      menuName=null;subPage=null;popup.hidden=true;popup.removeAttribute('data-nke-anchor');popup.replaceChildren();
      studio.querySelectorAll('[data-nke-menu]').forEach(b=>b.setAttribute('aria-expanded','false'));
    }
    function action(name){
      if(name==='save'){saveDocument(current());closeMenu();return;}
      if(name==='new'){newDocument();return;}
      if(name==='close'){closeMenu();requestClose(active);return;}
      if(name==='cards'){closeMenu();openMenu('cards',studio.querySelector('[data-nke-menu="cards"]'));return;}
      if(name==='edit-shortcuts'){closeMenu();toggleShortcutEdit(true);return;}
      if(name==='reset-shortcuts'){shortcuts=DEFAULT_SHORTCUTS.slice();drawShortcuts();closeMenu();showNotice('Przywrócono skróty');return;}
      if(name==='format'){
        try{const pretty=JSON.stringify(JSON.parse(editor.value),null,2);editor.value=pretty;editor.dispatchEvent(new Event('input',{bubbles:true}));showNotice('Sformatowano JSON');}
        catch{showNotice('Niepoprawny JSON — bez zmian');}
      }else if(name==='wrap'){
        editor.wrap=editor.wrap==='soft'?'off':'soft';
        showNotice(editor.wrap==='soft'?'Zawijanie włączone':'Zawijanie wyłączone');
      }else if(name==='uppercase'||name==='lowercase'){
        const a=editor.selectionStart,b=editor.selectionEnd;
        if(a===b)showNotice('Zaznacz tekst');
        else{
          editor.setRangeText(name==='uppercase'?editor.value.slice(a,b).toLocaleUpperCase('pl'):editor.value.slice(a,b).toLocaleLowerCase('pl'),a,b,'select');
          editor.dispatchEvent(new Event('input',{bubbles:true}));
        }
      }else if(name==='trim'){
        editor.value=editor.value.replace(/[ \t]+(?=\r?$)/gm,'');editor.dispatchEvent(new Event('input',{bubbles:true}));
      }else if(name==='indent'||name==='outdent'){
        const a=editor.selectionStart,b=editor.selectionEnd;
        const start=editor.value.lastIndexOf('\n',a-1)+1,end=editor.value.indexOf('\n',b);
        const until=end<0?editor.value.length:end;
        const updated=editor.value.slice(start,until).split('\n').map(s=>name==='indent'?'  '+s:s.replace(/^ {1,2}/,'')).join('\n');
        editor.setRangeText(updated,start,until,'select');editor.dispatchEvent(new Event('input',{bubbles:true}));
      }else{
        showNotice((shortcutById.get(name)?.label||name)+' — demonstracja');
      }
      closeMenu();
    }
    editor.addEventListener('input',()=>{
      const doc=current();if(!doc)return;
      const first=!doc.dirty;
      doc.text=editor.value;doc.dirty=true;
      if(first)mountTabs();
      updateStatus();
    });
    editor.addEventListener('keyup',updateStatus);
    editor.addEventListener('click',updateStatus);
    editor.addEventListener('scroll',()=>{gutter.scrollTop=editor.scrollTop;});
    viewport.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.target.closest('[data-nke-close]'))return;
      cancelAnimationFrame(anim);
      // Keep native button click targeting for taps; capture only once a horizontal swipe begins.
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,from:position,moved:false,vertical:false};
    });
    viewport.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.id)return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(!drag.moved&&!drag.vertical){
        if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>7){drag.vertical=true;return;}
        if(Math.abs(dx)>6){
          drag.moved=true;
          try{viewport.setPointerCapture(event.pointerId);}catch{}
        }
      }
      if(!drag.moved||drag.vertical)return;
      position=clamp(drag.from-dx/tabWidth,0,maxPosition());paintTabs();
    });
    const finishSwipe=event=>{
      if(!drag||event.pointerId!==drag.id)return;
      const dragged=drag.moved&&!drag.vertical;drag=null;
      if(dragged){suppressClick=true;setTimeout(()=>{suppressClick=false;},90);}
      animateTo(Math.round(position));
    };
    viewport.addEventListener('pointerup',finishSwipe);
    viewport.addEventListener('pointercancel',finishSwipe);

    studio.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button)return;
      if(button.matches('[data-nke-menu]')){openMenu(button.dataset.nkeMenu,button);return;}
      if(button.matches('[data-nke-shortcut-edit]')){toggleShortcutEdit(!editingShortcuts);return;}
      if(button.matches('[data-nke-shortcut-add]')){openMenu('shortcuts',button);return;}
      if(button.matches('[data-nke-remove]')){toggleShortcut(button.dataset.nkeRemove);return;}
      if(button.matches('[data-nke-shortcut-toggle]')){
        const scroll=popup.scrollTop;toggleShortcut(button.dataset.nkeShortcutToggle);drawMenu();popup.scrollTop=scroll;return;
      }
      if(button.matches('[data-nke-shortcut]')){
        if(editingShortcuts){openMenu('shortcuts',button);return;}
        const cmd=button.dataset.nkeShortcut;
        if(cmd==='symbols'||cmd==='cards'){openMenu(cmd,button);return;}
        if(cmd==='syntax'||cmd==='font'){openMenu('view',button);subPage=cmd;drawMenu();return;}
        action(cmd);return;
      }
      if(button.matches('[data-nke-new]')){newDocument();return;}
      if(button.matches('[data-nke-prev]')){animateTo(Math.round(position)-1);return;}
      if(button.matches('[data-nke-next]')){animateTo(Math.round(position)+1);return;}
      if(button.matches('[data-nke-activate]')){if(!suppressClick)selectDocument(Number(button.dataset.nkeActivate));return;}
      if(button.matches('[data-nke-close]')){requestClose(Number(button.dataset.nkeClose));return;}
      if(button.matches('[data-nke-card]')){selectDocument(Number(button.dataset.nkeCard));closeMenu();return;}
      if(button.matches('[data-nke-sub]')){subPage=button.dataset.nkeSub;drawMenu();return;}
      if(button.matches('[data-nke-back]')){subPage=null;drawMenu();return;}
      if(button.matches('[data-nke-lang]')){current().syntax=button.dataset.nkeLang;updateStatus();closeMenu();return;}
      if(button.matches('[data-nke-step]')){setFontSize(fontSize+Number(button.dataset.nkeStep));return;}
      if(button.matches('[data-nke-cmd]')){action(button.dataset.nkeCmd);return;}
      if(button.matches('[data-nke-insert]')){
        const value=button.dataset.nkeInsert,start=editor.selectionStart;
        editor.focus();editor.setRangeText(value,start,editor.selectionEnd,'end');
        const back=Number(button.dataset.nkeCaretBack||0);
        if(back)editor.setSelectionRange(start+value.length-back,start+value.length-back);
        editor.dispatchEvent(new Event('input',{bubbles:true}));closeMenu();return;
      }
      if(button.matches('[data-nke-confirm]')){
        const outcome=button.dataset.nkeConfirm,id=pendingClose,doc=documents.find(d=>d.id===id);
        dialogLayer.hidden=true;pendingClose=null;
        if(outcome==='save'&&doc){doc.dirty=false;closeDocument(id);}
        else if(outcome==='discard')closeDocument(id);
      }
    });
    popup.addEventListener('input',event=>{
      if(!event.target.matches('[data-nke-font-input]'))return;
      const number=Number(event.target.value);
      if(event.target.value!==''&&Number.isInteger(number)&&number>=8&&number<=20){
        fontSize=number;studio.style.setProperty('--nke-font-size',number+'px');
        const sample=popup.querySelector('[data-nke-font-sample]');
        if(sample)sample.style.fontSize=number+'px';
        for(const b of popup.querySelectorAll('[data-nke-step]')) b.disabled=Number(b.dataset.nkeStep)<0?number<=8:number>=20;
      }
    });
    popup.addEventListener('change',event=>{
      if(event.target.matches('[data-nke-font-input]'))setFontSize(event.target.value||fontSize);
    });
    document.addEventListener('pointerdown',event=>{
      if(!studio.contains(event.target)){closeMenu();return;}
      if(!popup.hidden&&!event.target.closest('[data-nke-popup],[data-nke-menu]'))closeMenu();
    });
    document.addEventListener('keydown',event=>{
      if(event.key!=='Escape')return;
      if(!dialogLayer.hidden){dialogLayer.hidden=true;pendingClose=null;return;}
      if(menuName){
        if(subPage){subPage=null;drawMenu();}
        else closeMenu();
        event.stopPropagation();
      }
    });
    document.querySelectorAll('[data-nke-width]').forEach(button=>{
      button.addEventListener('click',()=>{
        const width=Number(button.dataset.nkeWidth);
        studio.style.setProperty('--nke-width',width+'px');
        studio.style.setProperty('--nke-height',({320:700,360:770,412:850}[width]||850)+'px');
        document.querySelectorAll('[data-nke-width]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
        requestAnimationFrame(measureTabs);
      });
    });
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(measureTabs).observe(viewport);
    mountTabs();selectDocument(active);setFontSize(14);drawShortcuts();
  }
}
