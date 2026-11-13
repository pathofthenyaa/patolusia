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

// Build 012 · Compact application menu demo. Actions are examples; existing source commands stay unchanged.
const appMenuDemo = document.querySelector('[data-app-menu-demo]');
let appMenuDocuments = [
  {id:1, name:'config.js', modified:false},
  {id:2, name:'notes.md', modified:true},
  {id:3, name:'index.html', modified:false}
];
let appMenuSelected = 2, appMenuNextId = 4;

function syncAppMenuDocuments() {
  if (!appMenuDemo) return;
  appMenuDemo.querySelector('[data-app-count]').textContent = `Kart (${appMenuDocuments.length})`;
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
    dismissMenus();
    if (!wasOpen) {
      positionOverlay(dropdown, button, {appBar:true});
    }
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
  if (!event.target.closest?.(".choice-menu")) dismissMenus();
}, true);
document.addEventListener("pointerdown", event => {
  if (!event.target.closest("[data-open-menu]") && !event.target.closest("[data-app-menu]") && !event.target.closest(".context-menu") && !event.target.closest(".choice-trigger")) dismissMenus();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") { dismissMenus(); return; }
  const menu = event.target.closest(".choice-menu, .neko-app-dropdown");
  if (!menu) return;
  const items = [...menu.querySelectorAll(menu.classList.contains('neko-app-dropdown') ? 'button:not([disabled])' : '[data-value]')];
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
