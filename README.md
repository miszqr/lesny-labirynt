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
- Wilk prosi o skok o liczbę kroków zapisaną słownie. Odpowiedzi są cyframi.
- Początkowo są 3 serduszka; każde ukończone zadanie daje 1, błąd u wilka odbiera 1. Zero oznacza koniec gry.
- Sterowanie: strzałki na klawiaturze lub przyciski pod mapą.
- Menu ☰ zawiera nową grę, rozmiar mapy i odsłanianie mapy.
- Stan gry jest przechowywany tylko w pamięci przeglądarki. Odświeżenie zaczyna nową grę.

## Pliki

- `index.html`: interfejs, style, ilustracje SVG i logika rozgrywki.
- `maze.js`: generator labiryntu, furtki i położenia zwierzaka z kluczem.

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

Wilk zachowuje osobne zadanie z liczbą kroków i odpowiedziami 1–5. Przedmioty oraz ich poprawne formy gramatyczne są zdefiniowane w `itemCatalog`, a listy zwierząt w `bank`. Widoczna prośba i poprawna odpowiedź korzystają z tych samych danych.

## Testy

Wymaga Node.js z obsługą `node:test` (sprawdzono na 24.19.0), bez dodatkowych pakietów:

```sh
node --test tests/*.test.cjs
```

Test sprawdza pozycjonowanie po ustawieniu pełnego komunikatu, z kluczem i bez niego, oraz blokadę i otwieranie furtki. Używa symulowanych wymiarów DOM; nie zastępuje sprawdzenia układu w przeglądarce i na telefonie.

Testy przedmiotów sprawdzają wszystkie listy ulubionych rzeczy, unikalne obrazki, zgodność prośby i odpowiedzi, stałość zadania po zamknięciu dymka, jednorazową nagrodę i zachowanie wilka.

## Dokumentacja projektu

- [Opis architektury](docs/architecture.md): moduły, stan gry, generator, dialogi, grafika i publikacja.
- [Decyzje projektowe (ADR)](docs/decisions/README.md): rejestr przyjętych decyzji i zasady dodawania kolejnych.
- [Szablon decyzji](docs/decisions/template.md).
- [Przegląd kodu i lista TODO](docs/code-review.md).
