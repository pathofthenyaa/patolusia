/* Neko UI Kit — FloatingToolPanel design lab. No Android bridge or external dependencies. */
(() => {
  const root = document.querySelector('#nfp-demo');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';
  const $ = (selector) => root.querySelector(selector);
  const stage = $('#nfp-stage');
  const editor = $('#nfp-editor');
  const gutter = $('#nfp-gutter');
  const info = $('#nfp-status');
  const note = $('#nfp-note');
  const search = $('#nfp-query');
  const replacement = $('#nfp-replacement');
  const lineNumber = $('#nfp-line');
  const fontNumber = $('#nfp-font');
  const searchRow = $('#nfp-replace-row');
  const count = $('#nfp-count');
  const panels = [...root.querySelectorAll('[data-nfp-panel]')];
  const menu = $('#nfp-menu');
  const catalog = $('#nfp-catalog');
  const catalogueList = $('#nfp-catalog-list');
  const defs = {
    format: [
      ['indent-less', '⇤', 'Usuń wcięcie'], ['indent-more', '⇥', 'Dodaj wcięcie'],
      ['comment', '//', 'Komentuj / odkomentuj'], ['duplicate', '⧉', 'Duplikuj wiersz'],
      ['line-up', '↑', 'Przenieś wiersz w górę'], ['line-down', '↓', 'Przenieś wiersz w dół'],
      ['uppercase', 'A', 'Wielkie litery'], ['lowercase', 'a', 'Małe litery'],
      ['trim', '⌫', 'Usuń końcowe spacje']
    ],
    shortcuts: [
      ['undo', '↶', 'Cofnij'], ['redo', '↷', 'Ponów'],
      ['symbols', '{}', 'Symbole'], ['search', '⌕', 'Znajdź'],
      ['preview', '◉', 'Podgląd Markdown'], ['replace', '⇆', 'Zamień'],
      ['goto', '→', 'Idź do wiersza'], ['font', 'A', 'Wielkość czcionki'],
      ['format', '⇥', 'Szybkie formatowanie']
    ]
  };
  const defaults = {
    format: defs.format.map((item) => item[0]),
    shortcuts: ['undo', 'redo', 'symbols', 'search', 'preview']
  };
  const state = {
    format: { ids: [...defaults.format], editing: false },
    shortcuts: { ids: [...defaults.shortcuts], editing: false }
  };
  let matches = [], matchIndex = -1, preview = false;
  let catalogKind = null;
  let history = [editor.value], historyIndex = 0;
  const say = (message) => { note.textContent = message; };
  function remember() {
    try {
      const saved = JSON.parse(localStorage.getItem('neko-floating-panels-v1') || 'null');
      if (!saved || typeof saved !== 'object') return;
      for (const kind of Object.keys(state)) {
        if (!Array.isArray(saved[kind])) continue;
        const allowed = new Set(defs[kind].map((x) => x[0]));
        state[kind].ids = [...new Set(saved[kind].filter((id) => typeof id === 'string' && allowed.has(id)))];
      }
    } catch (_) { /* Private browsing: configuration stays in memory. */ }
  }
  function persist() {
    try { localStorage.setItem('neko-floating-panels-v1', JSON.stringify({
      format: state.format.ids, shortcuts: state.shortcuts.ids
    })); } catch (_) { /* Optional demo persistence. */ }
  }
  function record() {
    const value = editor.value;
    if (history[historyIndex] === value) return;
    history = history.slice(0, historyIndex + 1);
    history.push(value);
    if (history.length > 90) history.shift();
    historyIndex = history.length - 1;
  }
  function lines() { return editor.value.split('\n'); }
  function syncEditor() {
    gutter.textContent = lines().map((_, i) => String(i + 1)).join('\n');
    const before = editor.value.slice(0, editor.selectionStart).split('\n');
    info.textContent = 'Wiersz ' + before.length + ', kol. ' + (before[before.length - 1].length + 1) + ' · UTF-8 · LF';
  }
  function activate(panel) {
    for (const item of panels) {
      item.classList.toggle('is-active', item === panel);
      item.classList.toggle('is-dim', item !== panel);
    }
  }
  function clampPanel(panel) {
    if (panel.hidden) return;
    const limitX = Math.max(5, stage.clientWidth - panel.offsetWidth - 5);
    const limitY = Math.max(29, stage.clientHeight - panel.offsetHeight - 5);
    panel.style.left = Math.max(5, Math.min(limitX, panel.offsetLeft)) + 'px';
    panel.style.top = Math.max(29, Math.min(limitY, panel.offsetTop)) + 'px';
  }
  function openPanel(name) {
    const panel = root.querySelector('[data-nfp-panel="' + name + '"]');
    if (!panel) return;
    panel.hidden = false;
    activate(panel);
    clampPanel(panel);
    if (name === 'search') updateCount();
    hideMenu();
  }
  function hideMenu() {
    menu.hidden = true;
    $('#nfp-edit-menu').setAttribute('aria-expanded', 'false');
  }
  function closeCatalog() {
    catalog.hidden = true;
    catalogKind = null;
  }
  function spin(kind, delta) {
    const target = kind === 'font' ? fontNumber : lineNumber;
    const min = kind === 'font' ? 8 : 1;
    const max = kind === 'font' ? 20 : Number.MAX_SAFE_INTEGER;
    const current = target.value.trim() === '' ? min : Number(target.value);
    target.value = String(Math.min(max, Math.max(min, (Number.isFinite(current) ? current : min) + delta)));
    if (kind === 'font') applyFont();
  }
  function applyFont() {
    const n = Number(fontNumber.value);
    if (!Number.isFinite(n)) return;
    const size = Math.max(8, Math.min(20, Math.round(n)));
    fontNumber.value = String(size);
    editor.style.fontSize = size + 'px';
    say('Wielkość czcionki: ' + size + ' px — zmieniona bez potwierdzenia.');
  }
  function gotoLine() {
    const n = Number(lineNumber.value), list = lines();
    if (!Number.isSafeInteger(n) || n < 1 || n > list.length || lineNumber.value === '') {
      say('Nie ma takiego wiersza. Dostępny zakres: 1–' + list.length + '.');
      return;
    }
    let start = 0;
    for (let i = 0; i < n - 1; i++) start += list[i].length + 1;
    editor.setSelectionRange(start, start);
    editor.scrollTop = Math.max(0, (n - 3) * 21);
    syncEditor();
    say('Przejście do wiersza ' + n + '. Panel nadal jest otwarty.');
  }
  function findMatches() {
    matches = [];
    const term = search.value.toLowerCase(), source = editor.value.toLowerCase();
    if (term) {
      let cursor = 0, at;
      while ((at = source.indexOf(term, cursor)) !== -1) {
        matches.push({ from: at, to: at + term.length });
        cursor = at + term.length;
      }
    }
    matchIndex = -1;
    updateCount();
  }
  function updateCount() {
    count.textContent = (matchIndex < 0 ? 0 : matchIndex + 1) + ' z ' + matches.length;
    for (const button of root.querySelectorAll('[data-nfp-nav], [data-nfp-replace-one], [data-nfp-replace-all]')) {
      button.disabled = matches.length === 0;
    }
  }
  function navigate(direction) {
    if (!matches.length) return;
    if (matchIndex < 0) matchIndex = direction > 0 ? 0 : matches.length - 1;
    else matchIndex = (matchIndex + direction + matches.length) % matches.length;
    updateCount();
    const match = matches[matchIndex];
    editor.setSelectionRange(match.from, match.to);
    editor.scrollTop = Math.max(0, (editor.value.slice(0, match.from).split('\n').length - 3) * 21);
    syncEditor();
    say('Trafienie ' + (matchIndex + 1) + ' z ' + matches.length + '.');
  }
  function changeSearchMode(replace) {
    openPanel('search');
    searchRow.hidden = !replace;
    clampPanel(root.querySelector('[data-nfp-panel="search"]'));
    say(replace ? 'Zamień — dwa kompaktowe wiersze.' : 'Znajdź — jeden kompaktowy wiersz.');
  }
  function replaceOne() {
    if (!matches.length) return;
    const m = matches[matchIndex < 0 ? 0 : matchIndex];
    editor.setRangeText(replacement.value, m.from, m.to, 'end');
    record();
    syncEditor();
    findMatches();
    say('Zamieniono jedno wystąpienie. Panel pozostał otwarty.');
  }
  function replaceAll() {
    if (!matches.length) return;
    const source = editor.value, number = matches.length;
    let text = '', from = 0;
    for (const m of matches) {
      text += source.slice(from, m.from) + replacement.value;
      from = m.to;
    }
    editor.value = text + source.slice(from);
    record();
    syncEditor();
    findMatches();
    say('Zamieniono ' + number + ' wystąpień. Panel pozostał otwarty.');
  }
  function formatCommand(id) {
    const start = editor.selectionStart, end = editor.selectionEnd;
    if (id === 'uppercase' || id === 'lowercase') {
      let a = start, b = end;
      if (a === b) {
        a = editor.value.lastIndexOf('\n', a - 1) + 1;
        const next = editor.value.indexOf('\n', b);
        b = next < 0 ? editor.value.length : next;
      }
      const old = editor.value.slice(a, b);
      editor.setRangeText(id === 'uppercase' ? old.toUpperCase() : old.toLowerCase(), a, b, 'select');
    } else {
      const list = lines();
      let first = editor.value.slice(0, start).split('\n').length - 1;
      let last = editor.value.slice(0, end).split('\n').length - 1;
      if (end > start && end > 0 && editor.value[end - 1] === '\n') last--;
      last = Math.max(first, last);
      if (id === 'indent-more' || id === 'indent-less' || id === 'comment' || id === 'trim') {
        for (let i = first; i <= last; i++) {
          if (id === 'indent-more') list[i] = '  ' + list[i];
          if (id === 'indent-less') list[i] = list[i].replace(/^(?: {1,2}|\t)/, '');
          if (id === 'comment') list[i] = /^(\s*)\/\/ ?/.test(list[i])
            ? list[i].replace(/^(\s*)\/\/ ?/, '$1')
            : list[i].replace(/^(\s*)/, '$1// ');
          if (id === 'trim') list[i] = list[i].replace(/[ \t]+$/, '');
        }
      }
      if (id === 'duplicate') list.splice(last + 1, 0, ...list.slice(first, last + 1));
      if (id === 'line-up' && first > 0) {
        const above = list.splice(first - 1, 1)[0];
        list.splice(last, 0, above);
      }
      if (id === 'line-down' && last < list.length - 1) {
        const below = list.splice(last + 1, 1)[0];
        list.splice(first, 0, below);
      }
      editor.value = list.join('\n');
      const pos = Math.min(start, editor.value.length);
      editor.setSelectionRange(pos, pos);
    }
    record();
    syncEditor();
    findMatches();
    const label = defs.format.find((x) => x[0] === id)?.[2] || id;
    say('Formatowanie: ' + label + '. Panel nadal jest otwarty.');
  }
  function renderKind(kind) {
    const track = root.querySelector('[data-nfp-track="' + kind + '"]');
    track.replaceChildren();
    for (const id of state[kind].ids) {
      const def = defs[kind].find((entry) => entry[0] === id);
      if (!def) continue;
      const item = document.createElement('div');
      item.className = kind === 'format' ? 'nfp-format-tool' : 'nfp-shortcut';
      item.dataset.id = id;
      if (kind === 'shortcuts' && id === 'preview' && preview) item.classList.add('is-preview');
      const action = document.createElement('button');
      action.type = 'button';
      action.textContent = def[1];
      action.title = state[kind].editing ? 'Przytrzymaj i przeciągnij, aby zmienić kolejność: ' + def[2] : def[2];
      action.setAttribute('aria-label', state[kind].editing ? def[2] + '. Przeciągnij ten przycisk, aby zmienić kolejność.' : def[2]);
      action.addEventListener('click', () => {
        if (state[kind].editing) return;
        if (kind === 'format') formatCommand(id);
        else shortcutCommand(id);
      });
      item.append(action);
      if (state[kind].editing) {
        item.classList.add('is-edit');
        // The visible tool button itself is the drag surface; no overlay handle.
        wireSort(action, item, track, kind);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'nfp-remove';
        remove.textContent = '×';
        remove.title = 'Usuń: ' + def[2];
        remove.setAttribute('aria-label', remove.title);
        remove.addEventListener('click', () => {
          state[kind].ids = state[kind].ids.filter((value) => value !== id);
          persist(); renderKind(kind);
        });
        item.append(remove);
      }
      track.append(item);
    }
    const formatEditing = state.format.editing;
    root.querySelector('[data-nfp-panel="format"]').classList.toggle('is-editing', formatEditing);
    $('[data-nfp-shortcut-edit]').textContent = state.shortcuts.editing ? '✓' : '✎';
    $('[data-nfp-shortcut-edit]').setAttribute('aria-pressed', String(state.shortcuts.editing));
    $('[data-nfp-shortcut-add]').hidden = !state.shortcuts.editing;
    $('[data-nfp-format-add]').hidden = !formatEditing;
    $('[data-nfp-format-done]').hidden = !formatEditing;
  }
  function wireSort(button, item, track, kind) {
    let dragging = null;
    let moved = false;
    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      dragging = event.pointerId;
      moved = false;
      try { button.setPointerCapture(event.pointerId); } catch (_) { /* Pointer may already have ended. */ }
      item.classList.add('nfp-dragging');
      button.classList.add('is-grabbing');
      event.preventDefault();
    });
    button.addEventListener('pointermove', (event) => {
      if (dragging !== event.pointerId) return;
      const rect = track.getBoundingClientRect();
      if (event.clientX < rect.left + 20) track.scrollLeft -= 12;
      if (event.clientX > rect.right - 20) track.scrollLeft += 12;
      const others = [...track.children].filter((child) => child !== item);
      const before = others.find((child) => {
        const bounds = child.getBoundingClientRect();
        return event.clientX < bounds.left + bounds.width / 2;
      });
      const previous = [...track.children].indexOf(item);
      if (before) track.insertBefore(item, before);
      else track.append(item);
      moved = moved || previous !== [...track.children].indexOf(item);
    });
    function finish(event) {
      if (event.pointerId !== dragging) return;
      dragging = null;
      item.classList.remove('nfp-dragging');
      button.classList.remove('is-grabbing');
      if (moved) saveOrder(kind, track);
    }
    button.addEventListener('pointerup', finish);
    button.addEventListener('pointercancel', finish);
    button.addEventListener('lostpointercapture', finish);
    button.addEventListener('keydown', (event) => {
      const delta = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
      if (!delta) return;
      event.preventDefault();
      const index = [...track.children].indexOf(item);
      const target = track.children[index + delta];
      if (!target) return;
      if (delta < 0) track.insertBefore(item, target);
      else track.insertBefore(target, item);
      saveOrder(kind, track);
      button.focus();
    });
  }
  function saveOrder(kind, track) {
    state[kind].ids = [...track.children].map((element) => element.dataset.id);
    persist();
    say('Zmieniono kolejność: ' + (kind === 'format' ? 'Szybkie formatowanie' : 'Pasek skrótów') + '.');
  }
  function editMode(kind, enabled) {
    state[kind].editing = enabled;
    if (kind === 'format') openPanel('format');
    renderKind(kind);
    if (!enabled) closeCatalog();
    say(enabled ? 'Tryb edycji: przeciągnij bezpośrednio przycisk, × usuwa, + dodaje.' : 'Zapisano kolejność i zakończono edycję.');
  }
  function showCatalog(kind) {
    catalogKind = kind;
    catalogueList.replaceChildren();
    if (kind === 'symbols') {
      $('#nfp-catalog-heading').textContent = 'Symbole';
      for (const pair of ['{}', '()', '[]', '<>', '""', "''"]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = pair;
        button.addEventListener('click', () => {
          const start = editor.selectionStart, end = editor.selectionEnd;
          const selected = editor.value.slice(start, end);
          editor.setRangeText(pair[0] + selected + pair[1], start, end, 'select');
          if (start === end) editor.setSelectionRange(start + 1, start + 1);
          else editor.setSelectionRange(start + 1, start + selected.length + 1);
          record(); syncEditor(); findMatches(); closeCatalog();
        });
        catalogueList.append(button);
      }
    } else {
      $('#nfp-catalog-heading').textContent = kind === 'format' ? 'Dodaj narzędzie formatowania' : 'Dodaj skrót';
      for (const entry of defs[kind]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = entry[1] + '  ' + entry[2];
        button.disabled = state[kind].ids.includes(entry[0]);
        button.addEventListener('click', () => {
          state[kind].ids.push(entry[0]);
          persist(); renderKind(kind); showCatalog(kind);
        });
        catalogueList.append(button);
      }
    }
    catalog.hidden = false;
    hideMenu();
  }
  function shortcutCommand(id) {
    if (id === 'search') changeSearchMode(false);
    else if (id === 'replace') changeSearchMode(true);
    else if (['goto', 'font', 'format'].includes(id)) openPanel(id);
    else if (id === 'symbols') showCatalog('symbols');
    else if (id === 'preview') {
      preview = !preview;
      const control = root.querySelector('[data-nfp-track="shortcuts"] [data-id="preview"]');
      control?.classList.toggle('is-preview', preview);
      say('Podgląd Markdown (demo): ' + (preview ? 'włączony' : 'wyłączony') + '.');
    } else if (id === 'undo' || id === 'redo') {
      const next = historyIndex + (id === 'undo' ? -1 : 1);
      if (next < 0 || next >= history.length) return;
      historyIndex = next; editor.value = history[next]; syncEditor(); findMatches();
      say(id === 'undo' ? 'Cofnięto zmianę.' : 'Ponowiono zmianę.');
    }
  }
  function attachDrag(panel) {
    for (const handle of panel.querySelectorAll('[data-nfp-handle]')) {
      let drag = null;
      handle.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: panel.offsetLeft, top: panel.offsetTop };
        handle.setPointerCapture(event.pointerId);
        event.preventDefault(); event.stopPropagation();
        activate(panel);
      });
      handle.addEventListener('pointermove', (event) => {
        if (!drag || drag.id !== event.pointerId) return;
        const maxX = Math.max(5, stage.clientWidth - panel.offsetWidth - 5);
        const maxY = Math.max(29, stage.clientHeight - panel.offsetHeight - 5);
        panel.style.left = Math.max(5, Math.min(maxX, drag.left + event.clientX - drag.x)) + 'px';
        panel.style.top = Math.max(29, Math.min(maxY, drag.top + event.clientY - drag.y)) + 'px';
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        handle.addEventListener(type, () => { drag = null; });
      }
    }
  }
  remember();
  for (const kind of Object.keys(state)) renderKind(kind);
  syncEditor(); findMatches(); activate(root.querySelector('[data-nfp-panel="search"]'));
  const measure = $('#nfp-measure');
  function measureField() {
    root.style.setProperty('--nfp-field', Math.ceil(measure.getBoundingClientRect().width + 14) + 'px');
    panels.forEach(clampPanel);
  }
  measureField();
  if (document.fonts?.ready) document.fonts.ready.then(measureField);
  root.querySelectorAll('[data-nfp-width]').forEach((button) => button.addEventListener('click', () => {
    const width = Number(button.dataset.nfpWidth);
    if (![320, 360, 412].includes(width)) return;
    root.style.setProperty('--nfp-w', width + 'px');
    root.querySelectorAll('[data-nfp-width]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    requestAnimationFrame(() => panels.forEach(clampPanel));
  }));
  stage.addEventListener('pointerdown', (event) => {
    const panel = event.target.closest('[data-nfp-panel]');
    activate(panel && !panel.hidden ? panel : null);
    if (!event.target.closest('.nfp-menu') && !event.target.closest('#nfp-edit-menu')) hideMenu();
    if (!event.target.closest('.nfp-catalog') && !event.target.closest('[data-nfp-catalog-open]')) closeCatalog();
  });
  editor.addEventListener('focus', () => activate(null));
  editor.addEventListener('input', () => { record(); syncEditor(); findMatches(); });
  editor.addEventListener('click', syncEditor);
  editor.addEventListener('keyup', syncEditor);
  for (const panel of panels) attachDrag(panel);
  // Long-pressing a line number opens the same floating formatting palette.
  // A short tap does nothing; scrolling/dragging cancels the pending gesture.
  let gutterPress = null;
  const cancelGutterPress = () => {
    if (gutterPress) clearTimeout(gutterPress.timer);
    gutterPress = null;
  };
  gutter.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    cancelGutterPress();
    const at = { x: event.clientX, y: event.clientY, id: event.pointerId, timer: null };
    at.timer = setTimeout(() => {
      if (gutterPress !== at) return;
      const row = Math.max(1, Math.min(lines().length, Math.floor((at.y - gutter.getBoundingClientRect().top + gutter.scrollTop - 9) / 21) + 1));
      openPanel('format');
      say('Długie przytrzymanie numeru wiersza ' + row + ' — otwarto Szybkie formatowanie.');
      gutterPress = null;
    }, 520);
    gutterPress = at;
  });
  gutter.addEventListener('pointermove', (event) => {
    if (gutterPress && gutterPress.id === event.pointerId && Math.hypot(event.clientX - gutterPress.x, event.clientY - gutterPress.y) > 9) cancelGutterPress();
  });
  for (const name of ['pointerup', 'pointercancel', 'pointerleave']) gutter.addEventListener(name, cancelGutterPress);
  root.querySelectorAll('[data-nfp-close]').forEach((button) => button.addEventListener('click', () => {
    const panel = root.querySelector('[data-nfp-panel="' + button.dataset.nfpClose + '"]');
    panel.hidden = true; activate(null);
    say('Zamknięto panel przez czerwony przycisk ×.');
  }));
  root.querySelectorAll('[data-nfp-open]').forEach((button) => button.addEventListener('click', () => {
    const name = button.dataset.nfpOpen;
    if (name === 'search') changeSearchMode(false);
    else if (name === 'replace') changeSearchMode(true);
    else openPanel(name);
  }));
  root.querySelectorAll('[data-nfp-step]').forEach((button) => button.addEventListener('click', () => {
    const [kind, value] = button.dataset.nfpStep.split(':');
    spin(kind, Number(value));
  }));
  fontNumber.addEventListener('change', applyFont);
  fontNumber.addEventListener('input', () => { if (fontNumber.value !== '') applyFont(); });
  $('[data-nfp-goto]').addEventListener('click', gotoLine);
  lineNumber.addEventListener('keydown', (event) => { if (event.key === 'Enter') gotoLine(); });
  search.addEventListener('input', findMatches);
  root.querySelectorAll('[data-nfp-nav]').forEach((button) => button.addEventListener('click', () => navigate(Number(button.dataset.nfpNav))));
  search.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault(); navigate(event.shiftKey ? -1 : 1);
  });
  replacement.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); replaceOne(); } });
  $('[data-nfp-replace-one]').addEventListener('click', replaceOne);
  $('[data-nfp-replace-all]').addEventListener('click', replaceAll);
  $('[data-nfp-format-add]').addEventListener('click', () => showCatalog('format'));
  $('[data-nfp-format-done]').addEventListener('click', () => editMode('format', false));
  $('[data-nfp-shortcut-edit]').addEventListener('click', () => editMode('shortcuts', !state.shortcuts.editing));
  $('[data-nfp-shortcut-add]').addEventListener('click', () => showCatalog('shortcuts'));
  $('[data-nfp-catalog-close]').addEventListener('click', closeCatalog);
  $('#nfp-edit-menu').addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    $('#nfp-edit-menu').setAttribute('aria-expanded', String(!menu.hidden));
    $('[data-nfp-menu-page="root"]').hidden = false;
    $('[data-nfp-menu-page="format"]').hidden = true;
  });
  $('[data-nfp-menu-next]').addEventListener('click', () => {
    $('[data-nfp-menu-page="root"]').hidden = true;
    $('[data-nfp-menu-page="format"]').hidden = false;
  });
  $('[data-nfp-menu-back]').addEventListener('click', () => {
    $('[data-nfp-menu-page="root"]').hidden = false;
    $('[data-nfp-menu-page="format"]').hidden = true;
  });
  $('[data-nfp-menu-edit]').addEventListener('click', () => { editMode('format', true); hideMenu(); });
  window.addEventListener('resize', () => { if (root.isConnected) panels.forEach(clampPanel); });
  say('Przesuwaj paski za uchwyt, edytuj tekst pod nimi i konfiguruj narzędzia przez Edycja → Szybkie formatowanie → Edytuj.');
})();
