# Neko UI Kit — katalog komponentów (wersja robocza)

**Status:** prototyp do odbioru na telefonie; **nie zatwierdzony kanon**. Kanonem pozostają faktyczny UI NekoGit oraz [NEKO_STYLE.md](../NEKO_STYLE.md) v1.1.

## Uruchomienie i publikacja

Strona jest statyczna, bez bundlera i zależności CDN. Można otworzyć lokalnie przez serwer HTTP albo udostępnić na GitHub Pages z katalogu \`/ui-kit\`.

W przypadku GitHub Pages publikowanych z gałęzi: GitHub pozwala wskazać katalog główny \`/\` lub \`/docs\`, **nie dowolny katalog \`/ui-kit\`**. Dlatego do publikacji bez przenoszenia plików należy użyć **GitHub Actions** publikującego \`ui-kit/\` jako artefakt Pages, albo docelowo wystawić stronę pod ścieżką \`/ui-kit/\` przy publikacji całego repo z root. Konfiguracji Pages **nie aktywowano automatycznie**.

Repozytorium: \`margoth-gh/NekoNaBoku\`.

## Pliki

- \`index.html\` — interaktywna galeria komponentów i podgląd telefonu.
- \`neko.css\` — wspólne tokeny oraz rodziny komponentów wzorowane na obecnym CSS NekoGit.
- \`neko.js\` — interakcje lokalne, przełącznik motywów, rozmiarów, menu, dialogu i demonstracyjne stany.
- \`accent-palette.js\` — **bezpośrednia kopia implementacji palety NekoGit**; w razie zmian kanonu porównać ze źródłem.

## Obecny zakres

Motywy jasny/ciemny, wybór akcentu, podgląd szerokości logicznej 320/360/393/412/560 px, ghost header buttons, round-action, orb actions, input/search, switch, segmented control, karty repo, lista plików, menu, dialog, toast, kody CSS/HTML oraz przykłady disabled/active/error.

Dane z ekranu demonstracyjnego są fikcyjne i wyraźnie oznaczone. Nie korzysta z kont, tokenów, usług GitHub ani danych prywatnych.

## Podstawa odtworzenia

Zweryfikowano kod \`margoth-gh/NekoGit\`:
- \`app/src/main/assets/styles.css\`;
- \`app/src/main/assets/index.html\` — oryginalne wektory SVG jako wzory;
- \`app/src/main/assets/accent-palette.js\`.

Pochodzenie komponentów: \`.icon-button\` 42px ghost, \`.round-action\` 44px, \`.action-orb\` 44px, \`.search-field\` 50px, \`.repo-card\`, \`.file-list\`, \`.context-menu\`, \`.modal-card\`, \`.switch\`, \`.segmented\`, \`.bottom-nav\`. Zastosowano wartości oraz hierarchię wizualną NekoGit w ograniczonym, niezależnym pokazie. Nie zmieniono NekoGit.

## Granice

Nie jest to pełna transplantacja NekoGit, nie zawiera natywnego mostka Android ani systemu produkcyjnych danych. Nie wprowadza zmian w UI innych aplikacji. Żaden komponent nie uzyskuje statusu **zatwierdzony** przed oceną właściciela na docelowym telefonie.

**Wymagana weryfikacja:** S24 Ultra (portrait), motywy Light/Dark, szerokość, klawiatura, dotyk, otwieranie i zamykanie warstw, kontrast i scroll. Rzeczywisty test urządzenia: **PENDING**.
