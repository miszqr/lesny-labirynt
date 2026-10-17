# Adam w lesie

Przeglądarkowa gra do nauki czytania po polsku dla dziecka około 7 lat.

## Uruchomienie

Otwórz `index.html` w przeglądarce lub uruchom serwer w katalogu projektu:

```sh
python3 -m http.server 8080
```

Następnie otwórz http://localhost:8080. Gra nie wymaga instalowania pakietów ani kompilacji.

## Rozgrywka

- Losowy labirynt 4×4, 6×6 lub 8×8; cel: dotrzeć do domu. W 2D Adam odsłania okolicę z dodatkowym zasięgiem około pół pola. Mgła ma nieregularny, miękko cieniowany brzeg. Każdy odsłonięty fragment, także na obrzeżach zasięgu, pozostaje widoczny do końca tej przygody. Samo zobaczenie fragmentu pola nie zalicza go jako odwiedzonego.
- Ścieżki mają miękkie, rozmyte brzegi przechodzące w trawę, przy zachowaniu czytelnego środka. W FPV kolejne odcinki mają wspólną kolorystykę bez ostrych łączeń.
- Krajobraz urozmaicają trawiaste pagórki z cieniowanymi stokami, kamieniami i drobnymi kwiatami. FPV pokazuje te same drzewa, jeziora i pagórki w szerszej perspektywie. Pagórki nie zmieniają przejść labiryntu.
- Przy ścieżkach stoją skrzynki z kilkoma przedmiotami. Można zabierać je pojedynczo lub wszystkie naraz, jeśli mieszczą się w plecaku, również przed rozmową ze zwierzakiem. Częściowo opróżniona skrzynka zachowuje resztę, a pusta zostaje na mapie.
- 🎒 Plecak pokazuje duże ikony, nazwy i liczniki. Plecak mieści **2 egzemplarze** przedmiotów, a licznik pokazuje zajęte miejsca, np. „1 / 2”. Przy dowolnej dostępnej skrzyni można wybrać „Odłóż do skrzyni”, również z okna plecaka. Każdy egzemplarz zajmuje jedno miejsce, także gdy oba są tego samego typu. Klucz do furtki jest osobną nagrodą i nie zajmuje miejsca na przedmioty. Każdy egzemplarz jest osobny; przycisk „Daj…” zużywa jeden pasujący przedmiot i daje nagrodę tylko raz. Bez przedmiotu widoczna jest sama prośba zwierzaka. Przycisk „Daj…” zawiera sam tekst, aby zadanie wymagało czytania; ikony przedmiotów są w skrzynkach i plecaku.
- Prośba losuje się z ulubionych rzeczy zwierzaka raz na przygodę. Wszystkie wymagane egzemplarze są dostępne przed furtką, także przy powtarzających się typach. Generator sprawdza każdą możliwą kolejność oddawania.
- Jeden zwierzak daje klucz do furtki. Jest dostępny przed zamkniętą furtką. Jego prośba zaczyna się od „Dam ci klucz, jeśli…” i wskazuje wylosowany przedmiot.
- Po dojściu do przyjaznego zwierzaka pojawia się przy nim mała chmurka z trzema kropkami. Kliknięcie chmurki otwiera rozmowę; działa też Tab i Enter. Chmurka jest dostępna w mapie i FPV, wraca po zamknięciu rozmowy i znika po odejściu. Po wykonaniu zadania rozmowa wyświetla podziękowanie.
- Przycisk „Dalej” przechodzi do kolejnej wypowiedzi, a przy ostatniej zamyka rozmowę. Kliknięcie poza dymkiem nie zamyka go ani nie wykonuje innej akcji. Escape pozostaje skrótem zamknięcia. Zadanie można otworzyć ponownie przyciskiem pod mapą.
- Wilk ma wyraźniejsze brwi, bursztynowe spojrzenie, dwa małe kły i kudłatą sylwetkę, w kreskówkowym stylu odpowiednim dla dzieci. Ten sam rysunek jest używany na mapie, w FPV i w dialogu.
- Wilk losuje od jednego do pięciu kroków oraz kierunek: w górę, w prawo, w dół lub w lewo. Gracz czyta polecenie, klika strzałkę odpowiednią liczbę razy i wybiera „Skaczę”. Rząd strzałek pokazuje wybrane kroki; „Cofnij” usuwa ostatni bez kary. Po poprawnej odpowiedzi wilk przechodzi po ścieżkach na inne pole i czeka tam z nowym poleceniem. Przy kolejnym spotkaniu trzeba ominąć go ponownie. Dotyczy to mapy i FPV.
- Postacie mają kategorię **przyjazna** albo **przeciwnik**. Kot, królik, miś, jeż, pies i sowa są przyjazne: pomoc daje 1 serduszko tylko raz. Wilk jest przeciwnikiem: poprawne ominięcie nie dodaje serca, błąd odbiera 1. Adam zaczyna z 3 sercami; zero oznacza koniec gry.
- W widoku 2D Adam płynnie przechodzi między polami, poruszając nogami i rękami. Chmurka rozmowy pojawia się po dojściu na miejsce; spotkanie z wilkiem otwiera się automatycznie. Ustawienie systemowe ograniczające animacje wyłącza ruch postaci.
- Dwa widoki tej samej przygody: mapa z góry oraz FPV — oczami Adama. Przełącznik w nagłówku i menu zachowuje cały postęp.
- Sterowanie mapą: strzałki na klawiaturze lub przyciski pod mapą. W FPV ↑ prowadzi do przodu, ↓ do tyłu, ←/→ obracają o 90° w miejscu. Kompas po lewej pokazuje kierunek patrzenia, a bardzo mała mapka w prawym górnym rogu — odkryte ścieżki i pozycję Adama. Północ mapki pozostaje u góry. Zadanie wilka zachowuje własne strzałki.
- Menu ☰ zawiera nową grę, rozmiar mapy i odsłanianie mapy.
- Stan gry jest przechowywany tylko w pamięci przeglądarki. Odświeżenie zaczyna nową grę.

## Pliki

- `index.html`: interfejs, style, ilustracje SVG i logika rozgrywki.
- `characters.js`: kategorie postaci, ich nazwy oraz nagrody; wspólne reguły dla gry i FPV.
- `loot.js`: egzemplarze przedmiotów, skrzynki, plecak, jednorazowe oddawanie, limit dwóch miejsc, odkładanie do skrzyni, otwieranie furtki i walidator wszystkich kolejności zadań.
- `maze.js`: generator labiryntu, furtki i położenia zwierzaka z kluczem.
- `fpv.js`: perspektywiczny widok leśnych korytarzy SVG, wyznaczany z połączeń tej samej mapy.
- `assets/home-reunion.png`: zaakceptowana ilustracja finałowa — brat i siostra radośnie idą ku sobie.

Projekt jest statyczny: HTML, CSS i JavaScript, bez zależności zewnętrznych. Mapa i postacie korzystają z SVG, finał z ilustracji PNG, a przedmioty i elementy interfejsu również z emoji.

## Ulubione przedmioty

| Zwierzak | Możliwe prośby |
| --- | --- |
| Kot | 🥛 mleko, 🐟 ryba, ⚽ piłka |
| Królik | 🥕 marchew, 🥬 kapusta, 🍎 jabłko |
| Miś | 🍯 miód, 🫐 jagody, 🍐 gruszka |
| Jeż | 🍂 liść, 🍄 grzyb, 🧣 szalik |
| Pies | ⚽ piłka, 🦴 kość, 👟 but |
| Sowa | 🗺️ mapa, 📕 książka, 👓 okulary |

Wilk ma osobne zadanie kierunkowe opisane w [ADR-0004](docs/decisions/0004-wolf-directions.md). Przedmioty oraz ich poprawne formy gramatyczne są zdefiniowane w `itemCatalog`, a listy zwierząt w `bank`. Widoczna prośba i poprawna odpowiedź korzystają z tych samych danych.

## Testy

Wymaga Node.js z obsługą `node:test` (sprawdzono na 24.19.0), bez dodatkowych pakietów:

```sh
node --test tests/*.test.cjs
```

Polecenie uruchamia cały zestaw, w tym testy dodane w T01:

| Obszar | Zakres domyślny |
| --- | --- |
| `maze.test.cjs` | 3000 map: rozmiary 4, 6, 8 i ziarna 1–1000; spójne drzewo, poprawni sąsiedzi, furtka, dostępny klucz i miejsca spotkań. |
| `character-categories.test.cjs` | Jawne kategorie, zadania przedmiotowe tylko dla przyjaznych postaci, zablokowanie nieaktualnego oddania przeciwnikowi i wielokrotne ominięcia wilka przy jednym sercu. |
| `wolf-escape.test.cjs` | Powtórne spotkania w mapie i FPV, animacja bez zanikania, nowe zadania, brak nagrody za przeciwnika, restart, ograniczenie ruchu oraz 2400 kolejnych tras na 300 układach z otwartą i zamkniętą furtką. |
| `backpack-capacity.test.cjs` | Limit dwóch egzemplarzy, zwrot do innej i pustej skrzyni, brak duplikacji, zwolnienie miejsca po oddaniu, stare akcje i spójność mapy/FPV. |
| `loot.test.cjs` | 3000 układów przedmiotów oraz po sześć symulacji kolejności dostaw z limitem dwóch miejsc i odkładaniem, w tym powtarzające się typy; wszystkie kolejności zadań, błędne układy, podwójne kliknięcia, częściowy odbiór, okna, wspólny stan mapy i FPV, rozmieszczenie bez przeszkód. |
| `game-rules.test.cjs` | 300 pełnych rozgrywek: każdy rozmiar i ziarna 1–100, naprzemiennie mapa oraz FPV; zbieranie ze skrzynek przez legalne dojście, oddawanie, klucz, zamknięta furtka, jednorazowe nagrody, finał i restart. |
| `game-rules.test.cjs` | 30 przegranych: każdy rozmiar i ziarna 1–10; zejście do zera serc, blokada ruchu, pełny restart z menu. Dodatkowo restart po niedokończonej odpowiedzi wilkowi w każdym rozmiarze. |

Błąd nowego testu podaje scenariusz, rozmiar i ziarno, np. `complete journey: size=8, seed=42`. Żeby odtworzyć pojedyncze ziarno na wszystkich rozmiarach:

```sh
TEST_SEED=42 node --test tests/maze.test.cjs tests/game-rules.test.cjs
```

`TEST_SEED` przyjmuje liczbę całkowitą od 0 do 4294967295. Losowanie jest kontrolowane tylko w testach; ta opcja nie dodaje zapisu ani odtwarzania poziomów w samej grze. Powtarzalność dotyczy tej samej wersji kodu i kolejności akcji. Przebiegi korzystają z rzeczywistej logiki i rendererów oraz atrapy DOM, bez przestawiania gracza lub dopisywania klucza w celu ukończenia mapy. Nie weryfikują układu CSS, fokusu ani dotyku. Starsze testy niżej obejmują osobno animacje i szczególne przypadki interfejsu.

Test sprawdza pozycjonowanie po ustawieniu pełnego komunikatu, z kluczem i bez niego, oraz blokadę i otwieranie furtki. Używa symulowanych wymiarów DOM; nie zastępuje sprawdzenia układu w przeglądarce i na telefonie.

Testy przedmiotów sprawdzają wszystkie listy ulubionych rzeczy, unikalne obrazki, zgodność prośby i przedmiotu, stałość zadania po zamknięciu dymka, jednorazową nagrodę oraz zadanie wilka: wszystkie 20 kombinacji liczby i kierunku, postęp, cofanie, ponowne otwarcie dymka, zatwierdzanie, utratę serc i reset gry.

Testy FPV sprawdzają obracanie i ruch we wszystkich orientacjach, klawiaturę i przyciski, blokadę furtki, zachowanie stanu przy zmianie widoku, widoczność przejść oraz finał. Sceny SVG sprawdzono osobno; układ całego interfejsu pozostaje niesprawdzony w przeglądarce z powodu niedostępnego podglądu.

### Testy przeglądarkowe — T03 w toku

Przygotowano osobny zestaw Playwright dla 320×568, 390×844 i 844×390: geometria dymków i strzałek, dotyk, menu, klawiatura, Escape i fokus, mapa oraz FPV. Uruchomienie: `npm install`, `npx playwright install chromium`, serwer opisany wyżej, a w drugim terminalu `npm run test:browser`. `npm run test:browser:list` tylko wylicza scenariusze; nie potwierdza ich przejścia.

**Testy nie zostały jeszcze wykonane w przeglądarce; kontrola prawdziwego telefonu również oczekuje.** Instrukcja, zakres, sposób przygotowania scen i checklista: [Testy przeglądarkowe i telefon](docs/browser-tests.md). Gra nadal nie wymaga pakietów ani kompilacji; Playwright jest zależnością wyłącznie testową.

## Dokumentacja projektu

- [Opis architektury](docs/architecture.md): moduły, stan gry, generator, dialogi, grafika i publikacja.
- [Decyzje projektowe (ADR)](docs/decisions/README.md): rejestr przyjętych decyzji i zasady dodawania kolejnych.
- [Szablon decyzji](docs/decisions/template.md).
- [Przegląd kodu i lista TODO](docs/code-review.md).

## Skrzynki i plecak — dokumentacja wdrożenia

- [Specyfikacja i kryteria](docs/LESNY_LABIRYNT_SPEC_SKRZYNKI_PLECAK.md).
- [Zaktualizowana lista poprawek](docs/LESNY_LABIRYNT_TODO.md).
- Wersja przed zmianą: tag `przed-skrzynkami-2026-10-17` w repozytorium źródłowym Sites, commit `055f6a90ffbb3cb51041da4542ea6d7468d5838d`; odpowiada GitHub main `f4c3a5a0778c963b680485cb38b6f1554f7ce471`.
