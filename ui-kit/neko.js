import { buildAccentPalette, DEFAULT_ACCENT } from "./accent-palette.js";

const root = document.documentElement;
const themeSelect = document.querySelector("#theme-select");
const themeButton = document.querySelector("#theme-btn");
const widthSelect = document.querySelector("#preview-width");
const phone = document.querySelector("#phone-preview");
const accentInput = document.querySelector("#accent");
const dialog = document.querySelector("#sample-dialog");
const toast = document.querySelector("#toast");
const toastText = document.querySelector("#toast-text");
let toastTimer;

function applyTheme(theme) {
  const selected = theme === "dark" ? "dark" : "light";
  root.dataset.theme = selected;
  themeSelect.value = selected;
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
function showToast(message) {
  clearTimeout(toastTimer);
  toastText.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2300);
}
function dismissMenus() {
  document.querySelectorAll(".context-menu:not([hidden])").forEach(menu => { menu.hidden = true; });
}
function toggleMenu(id) {
  const menu = document.getElementById(id);
  if (!menu) return;
  const wasOpen = !menu.hidden;
  dismissMenus();
  menu.hidden = wasOpen;
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
}

themeSelect.addEventListener("change", event => applyTheme(event.target.value));
themeButton.addEventListener("click", () => applyTheme(root.dataset.theme === "light" ? "dark" : "light"));
widthSelect.addEventListener("change", event => setPreviewWidth(event.target.value));
accentInput.addEventListener("input", event => applyAccent(event.target.value));
document.querySelector("#reset-accent").addEventListener("click", () => applyAccent(DEFAULT_ACCENT));

document.addEventListener("click", event => {
  const btn = event.target.closest("button");
  if (!btn) {
    if (!event.target.closest(".context-menu")) dismissMenus();
    return;
  }
  if (btn.matches("[data-open-menu]")) {
    toggleMenu(btn.dataset.openMenu);
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
    showToast("Zatwierdzono (demonstracja)");
    return;
  }
  if (btn.matches("[data-toast]")) {
    dismissMenus();
    showToast(btn.dataset.toast);
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

document.addEventListener("pointerdown", event => {
  if (!event.target.closest("[data-open-menu]") && !event.target.closest(".context-menu")) dismissMenus();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") dismissMenus();
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
