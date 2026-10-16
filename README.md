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
- Pomoc zwierzakom polega na czytaniu krótkich poleceń i wybieraniu odpowiedzi.
- Jeden zwierzak daje klucz do bramy. Jest dostępny przed zamkniętą bramą.
- Wilk prosi o skok o liczbę kroków zapisaną słownie. Odpowiedzi są cyframi.
- Początkowo są 3 serduszka; każde ukończone zadanie daje 1, błąd u wilka odbiera 1. Zero oznacza koniec gry.
- Sterowanie: strzałki na klawiaturze lub przyciski pod mapą.
- Menu ☰ zawiera nową grę, rozmiar mapy i odsłanianie mapy.
- Stan gry jest przechowywany tylko w pamięci przeglądarki. Odświeżenie zaczyna nową grę.

## Pliki

- `index.html`: interfejs, style, ilustracje SVG i logika rozgrywki.
- `maze.js`: generator labiryntu, bramy i położenia zwierzaka z kluczem.

Projekt jest statyczny: HTML, CSS i JavaScript, bez zależności zewnętrznych. Ilustracje są generowane jako SVG; przedmioty i elementy interfejsu korzystają również z emoji.

## Dokumentacja projektu

- [Opis architektury](docs/architecture.md): moduły, stan gry, generator, dialogi, grafika i publikacja.
- [Decyzje projektowe (ADR)](docs/decisions/README.md): rejestr przyjętych decyzji i zasady dodawania kolejnych.
- [Szablon decyzji](docs/decisions/template.md).
