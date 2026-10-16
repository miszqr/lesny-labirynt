# Adam w lesie

Przeglądarkowa gra do nauki czytania po polsku dla dziecka około 7 lat.

## Uruchomienie

Otwórz `index.html` w przeglądarce lub uruchom serwer w katalogu projektu:

```sh
python3 -m http.server 8080
```

Następnie otwórz http://localhost:8080. Gra nie wymaga instalowania pakietów ani kompilacji.

## Rozgrywka

- Losowy labirynt 4×4, 6×6 lub 8×8; cel: dotrzeć do domu.
- Pomoc zwierzakom polega na czytaniu krótkiej prośby i wybieraniu obrazka spośród trzech odpowiedzi. Przedmiot losuje się z listy ulubionych rzeczy zwierzaka raz na przygodę; ponowne otwarcie rozmowy nie zmienia prośby ani odpowiedzi.
- Jeden zwierzak daje klucz do furtki. Jest dostępny przed zamkniętą furtką.
- Wilk losuje od jednego do pięciu kroków oraz kierunek: w górę, w prawo, w dół lub w lewo. Gracz czyta polecenie, klika strzałkę odpowiednią liczbę razy i wybiera „Zatwierdź”. Rząd strzałek pokazuje wybrane kroki; „Cofnij” usuwa ostatni bez kary.
- Początkowo są 3 serduszka; każde ukończone zadanie daje 1, błąd u wilka odbiera 1. Zero oznacza koniec gry.
- W widoku 2D Adam płynnie przechodzi między polami, poruszając nogami i rękami. Rozmowy zaczynają się po dojściu na miejsce. Ustawienie systemowe ograniczające animacje wyłącza ruch postaci.
- Dwa widoki tej samej przygody: mapa z góry oraz FPV — oczami Adama. Przełącznik w nagłówku i menu zachowuje cały postęp.
- Sterowanie mapą: strzałki na klawiaturze lub przyciski pod mapą. W FPV ↑ prowadzi do przodu, ↓ do tyłu, ←/→ obracają o 90° w miejscu. Kompas po lewej pokazuje kierunek patrzenia, a bardzo mała mapka w prawym górnym rogu — odkryte ścieżki i pozycję Adama. Północ mapki pozostaje u góry. Zadanie wilka zachowuje własne strzałki.
- Menu ☰ zawiera nową grę, rozmiar mapy i odsłanianie mapy.
- Stan gry jest przechowywany tylko w pamięci przeglądarki. Odświeżenie zaczyna nową grę.

## Pliki

- `index.html`: interfejs, style, ilustracje SVG i logika rozgrywki.
- `maze.js`: generator labiryntu, furtki i położenia zwierzaka z kluczem.
- `fpv.js`: perspektywiczny widok leśnych korytarzy SVG, wyznaczany z połączeń tej samej mapy.

Projekt jest statyczny: HTML, CSS i JavaScript, bez zależności zewnętrznych. Ilustracje są generowane jako SVG; przedmioty i elementy interfejsu korzystają również z emoji.

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

Test sprawdza pozycjonowanie po ustawieniu pełnego komunikatu, z kluczem i bez niego, oraz blokadę i otwieranie furtki. Używa symulowanych wymiarów DOM; nie zastępuje sprawdzenia układu w przeglądarce i na telefonie.

Testy przedmiotów sprawdzają wszystkie listy ulubionych rzeczy, unikalne obrazki, zgodność prośby i odpowiedzi, stałość zadania po zamknięciu dymka, jednorazową nagrodę oraz zadanie wilka: wszystkie 20 kombinacji liczby i kierunku, postęp, cofanie, ponowne otwarcie dymka, zatwierdzanie, utratę serc i reset gry.

Testy FPV sprawdzają obracanie i ruch we wszystkich orientacjach, klawiaturę i przyciski, blokadę furtki, zachowanie stanu przy zmianie widoku, widoczność przejść oraz finał. Sceny SVG sprawdzono osobno; układ całego interfejsu pozostaje niesprawdzony w przeglądarce z powodu niedostępnego podglądu.

## Dokumentacja projektu

- [Opis architektury](docs/architecture.md): moduły, stan gry, generator, dialogi, grafika i publikacja.
- [Decyzje projektowe (ADR)](docs/decisions/README.md): rejestr przyjętych decyzji i zasady dodawania kolejnych.
- [Szablon decyzji](docs/decisions/template.md).
- [Przegląd kodu i lista TODO](docs/code-review.md).
