# Przegląd kodu i lista TODO — Adam w lesie

Data: **2026-10-16**  
Repozytorium: `miszqr/lesny-labirynt`  
Przeglądana wersja: [`71aa236c8f438b712c8ff2f81a72b5f87d7718ab`](https://github.com/miszqr/lesny-labirynt/commit/71aa236c8f438b712c8ff2f81a72b5f87d7718ab), gałąź `main`.

Raport opisuje stan tego commita. Nie oznacza, że poniższe TODO zostały wdrożone. Przegląd obejmował `index.html`, `maze.js`, README, opis architektury i ADR-y. Zgodność lokalnych plików z GitHubem potwierdzono przez porównanie identyfikatorów blobów Git.

## Aktualizacja T02 / R1 — 2026-10-16

Naprawiono kolejność w `move()`: pełny komunikat bramy jest ustawiany przed `showEvent()`, więc `positionBubble()` mierzy już docelową treść. Pozostałe reguły bramy i rozmów nie zostały zmienione.

Dodano `tests/gate-bubble.test.cjs`, uruchamiany przez `node --test tests/gate-bubble.test.cjs`. Wszystkie 24 przypadki przeszły: trzy rozmiary kontenera, cztery narożniki, z kluczem i bez klucza. Test sprawdza pomiar pełnego komunikatu, granice dymka po zwiększeniu jego wysokości, blokadę bramy oraz przejście po otwarciu. Ten sam test odrzuca kod sprzed poprawki.

Wymiary DOM są symulowane. Próba uruchomienia podglądu przeglądarkowego została zablokowana błędem środowiska `bwrap: Can't mount proc on /newroot/proc: Operation not permitted`. Rzeczywisty układ CSS i obsługa telefonu nadal wymagają weryfikacji w ramach T03. Poniższe ustalenia i wyniki przeglądu pozostają historycznym opisem wersji wskazanej na początku raportu.

## Ocena

**W wykonanych sprawdzeniach nie wykryto krytycznego błędu zasad gry ani niemożliwego do ukończenia poziomu dla rozmiarów 4, 6 i 8.** Znaleziono pominięcie aktualizacji położenia dymka po dodaniu komunikatu bramy oraz kilka problemów utrudniających bezpieczny rozwój projektu.

Najpierw warto utrwalić testy i sprawdzić interfejs na telefonie. Następnie rozdzielić reguły gry od rysowania. Obecna skala projektu nie uzasadnia sama w sobie dodawania frameworka, backendu ani silnika 3D.

Priorytety: **P0** — krytyczny; **P1** — pilny błąd funkcjonalny; **P2** — najbliższa iteracja; **P3** — dalsze usprawnienie. W tym przeglądzie brak ustaleń P0/P1. Priorytet prac nie jest równoznaczny z potwierdzeniem błędu widocznego dla gracza.

## Ustalenia

### R1 · P2 · Dymek bramy zmienia zawartość po obliczeniu położenia

**Miejsce:** [`index.html`, `move()`, linia 98](https://github.com/miszqr/lesny-labirynt/blob/71aa236c8f438b712c8ff2f81a72b5f87d7718ab/index.html#L98); `paintDialogue()` i `positionBubble()`, linie 102–104; obserwator rozmiaru, linia 113.

Próba przejścia przez zamkniętą bramę wykonuje kolejno `render()`, `showEvent()` i ustawienie `#notice.textContent`. `showEvent()` pozycjonuje dymek, zanim pojawi się dodatkowy tekst. Potem nie ma ponownego `positionBubble()`. Obserwator śledzi `.mapwrap`, a nie rozmiar dymka.

**Odtworzenie:** dojść do zamkniętej bramy, zamknąć dymek i nacisnąć strzałkę prowadzącą przez bramę. Instrumentacja w teście z atrapą DOM zarejestrowała jedno pozycjonowanie z pustym `notice`, po którym pojawił się tekst „Brama jest zamknięta. Znajdź klucz.”.

**Skutek:** po zmianie wysokości dymek może zachować nieaktualne położenie względem postaci i granic kontenera. Potwierdzono kolejność operacji; faktycznego obcięcia lub zasłonięcia elementów nie potwierdzono w przeglądarce.

**Zalecenie:** ustawiać pełną zawartość przed pomiarem albo ponownie pozycjonować po zmianie tekstu. Dodać test przeglądarkowy na małym ekranie, z bramą blisko krawędzi mapy, zarówno bez klucza, jak i z kluczem.

### R2 · P2 · Testy nie są częścią repozytorium

**Miejsce:** drzewo repozytorium; sekcja „Weryfikacja i ograniczenia” w `docs/architecture.md`.

W przeglądanej wersji nie ma utrzymywanego zestawu testów ani workflow CI. Doraźne sprawdzenia opisane poniżej dają informację o tej wersji, ale nie chronią kolejnych zmian. Szczególnie istotne są dostępność klucza, blokada wilka, nagroda tylko raz i reset stanu.

**Zalecenie:** dodać testy generatora i reguł gry uruchamiane jednym poleceniem, następnie CI na push i pull request. Osobno testować w prawdziwej przeglądarce dymki, fokus, dotyk i układ. Atrapa DOM nie zastępuje tych testów.

### R3 · P2 · Renderowanie zawiera reguły i zmiany stanu gry

**Miejsce:** [`index.html`, linie 88–98](https://github.com/miszqr/lesny-labirynt/blob/71aa236c8f438b712c8ff2f81a72b5f87d7718ab/index.html#L88).

`render()` ustawia `won`, rysuje mapę, tworzy odpowiedzi i definiuje funkcje zmieniające serca, klucz, bramę oraz `done`. Stan jest rozproszony w zmiennych globalnych. Poprawka interfejsu wymaga więc ponownego sprawdzania reguł rozgrywki, a test reguł wymaga przygotowania DOM.

**Zalecenie:** wydzielić stan oraz operacje w rodzaju `movePlayer`, `answerEncounter` i `openGate`. Widok powinien odczytywać wynik operacji, a nie rozstrzygać zakończenie gry. Najpierw zabezpieczyć aktualne zachowanie testami; refaktoryzować małymi zmianami. To problem utrzymania, nie wykryty błąd naliczania serc.

### R4 · P3 · Teksty zadań mają dwa źródła

**Miejsce:** [`index.html`, `bank`, linia 13](https://github.com/miszqr/lesny-labirynt/blob/71aa236c8f438b712c8ff2f81a72b5f87d7718ab/index.html#L13), `render()`, linia 90, i `npcLine()`, linia 101.

Zadanie przechowuje `text`, ale wyświetlana wypowiedź zwierzaka pochodzi z osobnej tabeli w `npcLine()`, indeksowanej emoji. Zmiana samego `bank.text` nie zmienia wypowiedzi w dymku. Dodanie postaci wymaga pamiętania o drugim miejscu; brak wpisu może dać tekst `undefined`.

**Zalecenie:** przechowywać wypowiedź, odpowiedź i warianty w jednym obiekcie zadania. Używać stabilnego identyfikatora postaci, pozostawiając emoji lub grafikę jako dane prezentacyjne. Sprawdzać kompletność danych i obecność poprawnej odpowiedzi w opcjach.

### R5 · P3 · Kod źródłowy zawiera pozostałości wcześniejszych wersji UI

**Miejsce:** `index.html`, linie 3–5, 8, 12, 54 i 95.

HTML, CSS i logika mieszczą się w 118 bardzo długich liniach. Reguły `.mapwrap`, `.directions` i układu są wielokrotnie nadpisywane. Zostały style dawnej `.forest-gate`, ukryta `.scene`, nieużywana zmienna `scenery` i gradient `soil`, do którego nie ma odwołania. Utrudnia to review i zwiększa ryzyko przypadkowego nadpisania poprawnych stylów.

**Zalecenie:** sformatować źródła i oddzielić CSS, kod gry oraz rysowanie SVG. Pozostałości usuwać razem z odwołaniami w JS — np. samo usunięcie `.scene` bez zmiany `render()` spowoduje błąd. Zachować prosty sposób uruchamiania opisany w ADR-0001.

## Ryzyka do sprawdzenia, niepotwierdzone błędy

- **Telefon i dostępność:** sprawdzić dymki przy krawędziach, orientację poziomą, większy tekst, widoczność strzałek, fokus po zamknięciu rozmowy i wybór odpowiedzi klawiaturą. Globalny handler `click` działa w fazie przechwytywania i celowo pochłania pierwsze kliknięcie poza dymkiem. Wymaga testu prawdziwej propagacji zdarzeń, także po dotknięciu nieaktywnego przycisku przy wilku.
- **Koszt rysowania:** `draw()` zastępuje całe `#map.innerHTML` przy każdym ruchu. `terrainCache` przechowuje tekst SVG, więc przeglądarka nadal musi utworzyć węzły terenu od nowa. Zmierzyć czas ruchu na mapie 8×8 na telefonie; dopiero wynik powinien zdecydować o wydzieleniu stałych i ruchomych warstw. Nie stwierdzono pomiarem, że obecna gra się zacina.
- **Wskazanie rozmówcy:** `positionBubble()` wybiera zwierzaka najbliższego Adamowi w geometrii ekranu. Obecne testy nie wykazały błędnego wskazania. Przy rozbudowie grafiki lepiej powiązać element SVG z identyfikatorem pola/spotkania zamiast opierać się na odległości.
- **Powtarzalność poziomu:** generator przyjmuje funkcję losującą, ale dobór zadań, wilka i terenu korzysta z globalnego `Math.random`. Sam `artSeed` nie odtwarza całej rozgrywki. Wspólne ziarno ułatwi odtworzenie zgłoszonego problemu.
- **Kontrakt generatora:** UI podaje wyłącznie 4, 6 lub 8, ale `generateMaze()` nie waliduje argumentu ani pustych pul kandydatów. Nie jest to wykryty błąd obecnego UI. Przed dodaniem innych rozmiarów określić i sprawdzać kontrakt wejścia.
- **Publikacja:** opis architektury wskazuje oddzielne źródła GitHub i Sites. Uzgodnić jedno źródło prawdy i udokumentować synchronizację. Zapis commita na GitHubie sam w sobie nie potwierdza aktualizacji strony Sites.

## Co sprawdzono

Sprawdzenia wykonano na niezmienionym kodzie przeglądanego commita w Node.js 24.19.0. Użyto deterministycznego generatora pseudolosowego LCG (`1664525`, `1013904223`, stan 32-bitowy). Skrypty były doraźnymi narzędziami przeglądu; nie są utrzymywanym zestawem testów repozytorium.

| Sprawdzenie | Zakres | Wynik |
| --- | --- | --- |
| Generator | 3000 map: po 1000 dla 4×4, 6×6 i 8×8; ziarna 1–1000 | Wszystkie sprawdzenia przeszły |
| Własności map | Spójność, liczba krawędzi drzewa, symetryczne połączenia sąsiadów, poprawna krawędź bramy, dostępny klucz, niedostępny dom przy zamkniętej bramie, unikalne miejsca spotkań | Wszystkie sprawdzenia przeszły |
| Pełne przebiegi logiki | 300 gier z atrapą DOM: po 100 dla każdego rozmiaru; ziarna 1–100 | Wszystkie sprawdzenia przeszły |
| Scenariusze rozgrywki | Ruch po trasie, blokada bramy, kolejność rozmowy, błąd u przyjaznego zwierzaka, jednorazowa nagroda, klucz w plecaku, otwarcie bramy, rozwiązanie wilka po drodze, finał z siostrą i restart | Wszystkie sprawdzenia przeszły |
| Wilk i zamykanie | Dla każdego rozmiaru: blokada ruchu po zamknięciu dymka wilka, serca 3→2→1→0, przegrana/restart, bezpośrednie wywołanie handlerów kliknięcia wewnątrz/poza dymkiem i Escape | Wszystkie sprawdzenia przeszły w atrapie DOM |
| Komunikat bramy | Rejestracja `notice` w chwili pozycjonowania i po `move()` | Potwierdzono R1 |

**Ograniczenia:** nie uruchomiono prawdziwej przeglądarki. Playwright był dostępny, lecz brakowało pliku wykonywalnego Chromium; próba pobrania nie dostarczyła poprawnego archiwum. Nie sprawdzono wizualnie telefonu, CSS, rzeczywistego fokusu, propagacji zdarzeń, czytnika ekranu ani wydajności. Testy z atrapą DOM weryfikują logikę, nie wygląd i pełną obsługę UI. Próbkowanie losowych poziomów nie jest dowodem poprawności wszystkich możliwych losowań.

## TODO — kolejność prac i warunki ukończenia

### Najbliższa iteracja · P2

- [ ] **T01 / R2 — Utrwalić testy generatora i reguł.** Jedno udokumentowane polecenie sprawdza wszystkie rozmiary, klucz/bramę, wilka, nagrodę tylko raz, wygraną, przegraną i pełny reset; błąd podaje ziarno.
- [x] **T02 / R1 — Pozycjonować dymek po ustawieniu całej treści.** Naprawiono kolejność i dodano 24 testy regresji, w tym granice dymka z symulowanymi wymiarami. Sprawdzenie w prawdziwej przeglądarce pozostaje w T03; szczegóły w aktualizacji powyżej.
- [ ] **T03 — Dodać testy przeglądarkowe oraz kontrolę na telefonie.** Sprawdzić co najmniej 320×568, 390×844 i 844×390, krawędzie mapy, długi tekst wilka, menu, kliknięcie poza dymkiem, Escape i fokus. Strzałki mają pozostać dostępne, a cała strona nie wymagać przewijania.
- [ ] **T04 / R2 — Uruchamiać testy w CI.** Workflow na push i pull request; komenda i ograniczenia opisane w README.
- [ ] **T05 / R3 — Oddzielić stan i operacje gry od DOM.** Reguły dają się testować bez tworzenia elementów strony; samo renderowanie nie przyznaje nagród i nie ustala wyniku gry. Zaktualizować architekturę i ADR, jeśli zmienia się przyjęty podział modułów.

### Kolejne usprawnienia · P3

- [ ] **T06 / R4 — Ujednolicić dane postaci i zadań.** Jedno źródło wypowiedzi i odpowiedzi, stabilne identyfikatory, test kompletności danych.
- [ ] **T07 / R5 — Uporządkować źródła i usunąć martwy kod.** Czytelne formatowanie, oddzielone odpowiedzialności, zachowany wygląd oraz uruchamianie bez kompilacji, chyba że nowy ADR uzasadni zmianę.
- [ ] **T08 — Powiązać dymek z konkretną postacią w SVG.** Test przy sąsiednich zwierzakach i różnej skali ilustracji.
- [ ] **T09 — Dodać wspólne ziarno rozgrywki.** Ten sam rozmiar i seed odtwarzają mapę, zadania, wilka, odpowiedzi i teren.
- [ ] **T10 — Zmierzyć koszt renderowania mapy 8×8.** Zapisać urządzenie i wyniki; optymalizować stałe warstwy SVG tylko przy potwierdzonym problemie.
- [ ] **T11 — Określić kontrakt generatora.** Nieobsługiwane wejście daje czytelny błąd, a nowe rozmiary przechodzą testy osiągalności i rozmieszczenia spotkań.
- [ ] **T12 — Opisać przepływ publikacji GitHub → hosting.** Wskazać źródło prawdy, sposób wdrażania i identyfikację opublikowanej wersji; wybór hostingu zapisać w ADR.

## Świadomie poza listą błędów

Brak zapisu postępu jest jawnym założeniem ADR-0001. Brak cykli w labiryncie wynika z ADR-0002. Pozostawanie zwierząt na mapie, zamknięcie rozmowy bez komunikatu po sukcesie, nagroda także za wilka i zakończenie dopiero przy zerze serc odpowiadają aktualnym regułom. Nie wymagają naprawy tylko dlatego, że można zaprojektować je inaczej.
