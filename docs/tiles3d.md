# Kafelki 3D — Babylon.js

Gałąź: `v2/tiles-3d`. Bazowa wersja gry: `4d90e84cade5c22bfb99990fb95ff8bb7f2f0936`.
Tag pominięty zgodnie z decyzją użytkownika. Stabilna gałąź `main` i jej GitHub Pages nie są zmieniane przez tę migrację.

## Uruchomienie i sterowanie

Otwórz `index.html?view=3d` na serwerze HTTP/HTTPS. Przycisk w nagłówku przełącza 3D/2D bez nowej gry. Zwykły `index.html` uruchamia mapę 2D i nie pobiera silnika 3D. Mikrofon wymaga HTTPS lub localhost i obsługi rozpoznawania mowy przez przeglądarkę.

Przeciągnięcie obraca kamerę. Kółko myszy, gest dwoma palcami i przyciski +/− zmieniają zoom. Przybliżenie śledzi Adama; przycisk domku przywraca widok całej mapy. Kompas pokazuje północ po obrocie.

W 3D ↑ oznacza krok do przodu, ↓ krok do tyłu, a ←/→ obrót Adama o 90° w miejscu. Cofanie zachowuje kierunek patrzenia. Klawiatura i przyciski ekranowe działają tak samo. Przytrzymanie klawisza obrotu nie wywołuje serii obrotów. Kamera obraca się niezależnie od postaci. Po przełączeniu na 2D strzałki ponownie oznaczają kierunki mapy.

Menu oferuje plansze 6×6 i 8×8; domyślna plansza ma 6×6 pól. Generator obsługuje 4×4 wyłącznie dla zgodności wcześniejszych testów.

## Architektura

- Jeden stan gry i jeden generator labiryntu. Adapter `enableForestTiles` przekazuje rendererowi odczyt stanu i geometrię ścieżek. Zadania, plecak, klucz, dialogi i nagrody pozostają we wspólnym kodzie.
- `tiles3d/world.mjs` tworzy natywne obiekty Babylon.js: `Mesh`, `VertexData` i `TransformNode`. Kafelki, drzewa, jeziora, pagórki, dom, furtka, skrzynie i postacie mają geometrię 3D. Jedno pole = jedna jednostka; Y to wysokość, +Z to południe. Scena używa prawoskrętnego układu współrzędnych.
- `tiles3d/view.mjs` zarządza `Engine`, `Scene`, ortograficzną `FreeCamera`, oświetleniem, dotykiem, animacjami i położeniem dymków. Kamera nie ma własnej obsługi klawiszy ruchu; sterowanie postacią pozostaje w grze.
- `tiles3d/materials.mjs` rozszerza `StandardMaterial` przez `MaterialPluginBase`. `DynamicTexture` zawiera tę samą nieregularną, rozmytą maskę `seenPath` co widok 2D. Odkryty obszar pozostaje odkryty do rozpoczęcia nowej gry. Obiekty zachowują zapis głębi także podczas łagodnego odsłaniania.
- Granica planszy przycina powierzchnie ziemi, dróg, wody i cienie. Korony drzew i pozostałe bryły mogą wystawać poza krawędź; ich odkrycie korzysta z najbliższego punktu maski na planszy. Kamera obejmuje pełne korony drzew.
- Stała geometria jest łączona według materiałów. Chodzenie, ucieczka wilka i serduszko są animowane niezależnie; serduszko korzysta z billboardu Babylon.js. Zmiana mapy zwalnia stare bryły i materiały.
- Babylon.js **9.31.0** jest dołączony lokalnie w `tiles3d/vendor/babylon.mjs`, wraz z licencją Apache-2.0. Three.js został usunięty. Gra nie pobiera silnika ani shaderów z CDN. Silnik korzysta z WebGL. Błąd inicjalizacji, shadera lub utrata kontekstu przełącza grę do 2D z zachowaniem stanu.

## Odtworzenie biblioteki

W repozytorium uruchom `npm ci`, a następnie `npm run vendor:build`. Przypięte wersje to `@babylonjs/core@9.31.0` i `esbuild@0.28.2`.

`scripts/babylon-exports.mjs` definiuje używane moduły silnika; `scripts/build-babylon.mjs` tworzy lokalny pakiet ESM i kopiuje licencję. Skrypt obsługuje zarówno układ GitHub Pages (pliki gry w katalogu głównym), jak i Sites (`dist/`).

## Walidacja

Testy `tests/tiles3d.test.cjs` korzystają z rzeczywistego Babylon.js i `NullEngine`. Sprawdzają pozycje elementów mapy, geometrię dróg, pełne korony drzew, projekcję i zoom, orientację postaci, sterowanie względne, zmianę widoku, animację kroku, przeprowadzkę wilka, stan furtki i skrzyń. Dodatkowy test uruchamia przebieg sceny z materiałami mgły, sprawdza wygenerowany kod shaderów, scaloną geometrię i zwalnianie zasobów. NullEngine nie renderuje obrazu i nie kompiluje shaderów na GPU.

Podgląd przeglądarkowy Sites jest zablokowany przez błąd infrastruktury `bwrap: Can't mount proc on /newroot/proc: Operation not permitted`. Kontrola wizualna, kompilacja shaderów na GPU i wydajność na urządzeniu pozostają niezweryfikowane.

Do sprawdzenia na telefonie: wejście z `?view=3d`, obrót i zoom, pozycja dymków po obrocie, chodzenie do tyłu, ucieczka wilka, przelot serduszka, odkrywanie mapy, zmiana 3D/2D i powrót oraz nowa mapa 8×8. Ilustracje dialogów i finału pozostają zachowane.
