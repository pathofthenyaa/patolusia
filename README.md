# Mini Gry v2.6 — Go Edition

- Widoczny numer wersji na pasku głównym: Mini Gry v2.6.
- Ekran główny: Opcje → Pobierz aktualizację.
  Przycisk wyrejestrowuje service workera, usuwa tylko cache `mini-gry-*` i przeładowuje stronę z parametrem omijającym stary dokument. localStorage z zapisami gier pozostaje.
- Service worker używa network-first/no-store dla plików aplikacji, usuwa stare cache przy aktywacji i przejmuje klientów od razu.
- Rejestracja SW używa updateViaCache:none.
- Go Edition: plansza Go została przebudowana na Canvas + pozycjonowanie kamieni w pikselach na podstawie rzeczywistego rozmiaru planszy.
- Siatka i kamienie korzystają z tej samej zmierzonej geometrii.
- Plansza przerysowuje się po zmianie rozmiaru okna/orientacji.
