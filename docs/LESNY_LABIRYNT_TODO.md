# Leśny Labirynt — TODO

Nowe zmiany uporządkowane od najprostszych do najtrudniejszych. Ocena trudności jest wstępna i zależy od obecnej implementacji.

## Łatwe

- [x] **Przycisk przy wilku:** zmienić etykietę „Zatwierdź” na „Skaczę”.
- [x] **Dialogi:** stosować przycisk „Dalej” i wyłączyć zamykanie okien kliknięciem poza nimi.
- [x] **Dialog ze zwierzęciem posiadającym klucz:** zaczynać wypowiedź od „Dam ci klucz, jeśli…”.
- [x] **Sterowanie strzałkami na klawiaturze:** umożliwić poruszanie chłopcem za pomocą klawiszy strzałek (↑ ↓ ← →), obok dotychczasowego sterowania.

## Średnie

- [x] **Groźniejszy wilk:** zmienić jego wygląd, zachowując stylistykę odpowiednią dla dzieci.
- [x] **Ikona rozmowy:** gdy gracz stanie obok przyjaznego zwierzęcia, wyświetlać przy nim małą chmurkę z symbolem rozmowy.
- [x] **Ścieżki:** usunąć ostre granice i zastosować łagodniejsze, rozmyte przejścia do otoczenia.

## Trudne

- [x] **Zwierzęta w FPV:** naprawić pozycję i orientację obiektów; zwierzęta mają pozostawać nieruchome w świecie podczas obracania widoku.
- [x] **Model przedmiotów i plecaka:** unikatowe egzemplarze przedmiotów, limit 2 egzemplarzy, podgląd, liczniki i odkładanie do skrzyni.
- [x] **Skrzynki przy ścieżkach:** jedna skrzynka może zawierać kilka przedmiotów; można zabierać je pojedynczo i częściowo opróżniać skrzynkę.
- [x] **Oddawanie przedmiotów zwierzętom:** możliwość oddania tylko posiadanego przedmiotu; zużycie jednego egzemplarza, jednorazowa nagroda.
- [x] **Swobodne odkrywanie:** przedmioty można zbierać przed poznaniem potrzeb zwierząt.
- [x] **Generator rozmieszczenia skrzynek:** wymagane przedmioty zawsze osiągalne przed bramami, których odblokowanie od nich zależy.
- [x] **Walidator przechodniości:** automatyczne testy dostępności przedmiotów, liczby egzemplarzy i możliwych kolejności zadań.
- [x] **Spójny stan gry:** skrzynki, plecak, ukończone zadania i bramy; obsługa widoku mapy i FPV.

## Sugerowana kolejność

1. Teksty przycisków i dialogów.
2. Sterowanie strzałkami.
3. Ikona rozmowy.
4. Poprawka FPV (ważny błąd istniejącej mechaniki).
5. Wygląd wilka i ścieżek.
6. Model przedmiotów, skrzynki i plecak.
7. Oddawanie przedmiotów zwierzętom.
8. Generator rozmieszczenia i walidator możliwości ukończenia gry.

> Uwaga: kolejność wdrożenia uwzględnia również znaczenie poprawek, dlatego błąd FPV warto naprawić przed niektórymi zmianami wizualnymi.

## Specyfikacja mechaniki

Szczegóły: [`LESNY_LABIRYNT_SPEC_SKRZYNKI_PLECAK.md`](LESNY_LABIRYNT_SPEC_SKRZYNKI_PLECAK.md).

**Ustalenia:** skrzynka może zawierać wiele przedmiotów; każdy egzemplarz ma jedno zastosowanie i znika po oddaniu; swobodne odkrywanie; limit 2 egzemplarzy i możliwość odkładania do skrzyni; brak niedostępnych wymaganych przedmiotów.

## Stan wdrożenia — 2026-10-17

Pola zaznaczone oznaczają wdrożenie w kodzie. Reguły i stan UI sprawdzono w Node z atrapą DOM, a grafikę mapy i FPV na rastrach SVG. Kontrola rzeczywistego układu, dotyku i telefonu pozostaje otwarta w T03 z powodu niedostępnego zarządzanego podglądu. Stan przygody trwa w pamięci; projekt nie posiada zapisu gry.
