# Kafelki 3D — 2.0.0-alpha.1

Gałąź: `v2/tiles-3d`. Punkt wyjścia: `4d90e84cade5c22bfb99990fb95ff8bb7f2f0936`.
Tag pominięty zgodnie z decyzją użytkownika. `main` i działająca wersja GitHub Pages pozostają na dotychczasowej wersji.

## Uruchomienie

Otwórz `index.html?view=3d` na serwerze HTTP/HTTPS. Przycisk w nagłówku przełącza 3D/2D bez rozpoczynania nowej gry. Zwykły `index.html` uruchamia mapę 2D i nie pobiera Three.js. Mikrofon wymaga HTTPS lub localhost i obsługi rozpoznawania mowy w przeglądarce, tak jak wcześniej.

Przeciągnięcie obraca kamerę; kółko myszy, gest dwoma palcami i przyciski +/− zmieniają zoom. Przybliżenie centruje Adama; domek kamery przywraca całą mapę. Strzałki ruchu zachowują kierunki świata: ↑ północ, → wschód, ↓ południe, ← zachód. Kompas pokazuje północ po obrocie.

## Architektura

- Jeden stan gry i jeden generator labiryntu. Adapter `enableForestTiles` przekazuje tylko odczyt stanu i geometrię obecnych ścieżek.
- `tiles3d/world.mjs`: prawdziwe bryły kafelków, drzew, pagórków, domu, furtki, skrzynek i uproszczonych postaci. Jedno pole = 1 jednostka, Y oznacza wysokość, Z rośnie na południe. Obrót kamery nie zmienia współrzędnych obiektów.
- `tiles3d/view.mjs`: kamera ortograficzna, światło, animacje, kadrowanie, dotyk, kompas i kotwice dymków. Stała geometria jest łączona według materiałów, aby ograniczyć liczbę wywołań rysowania na telefonie.
- Mgła używa tego samego nieregularnego, cieniowanego obszaru `seenPath` co 2D. Odkrywanie jest nadal trwałe w obrębie bieżącej gry. Nowa gra resetuje mapę, tak jak wcześniej.
- Chodzenie, ucieczka wilka i serduszko mają animację 3D; zasady zadań, klucz, plecak i przyznawanie nagród pozostają we wspólnym kodzie.
- Three.js **0.180.0** jest zapisane lokalnie w `tiles3d/vendor`, wraz z licencją MIT. Brak zależności od CDN podczas gry. Wymagany WebGL 2. W razie braku obsługi lub utraty kontekstu gra wraca do 2D z zachowaniem aktualnego stanu.

## Walidacja

Przeszło 203 dotychczasowych testów logiki oraz 11 nowych testów `tests/tiles3d.test.cjs`: mapy 4/6/8, pozycje krajobrazu i obiektów, krzywizna dróg, kamera/zoom, zmiana widoku, ruch i ucieczka wilka. Testy 3D budują rzeczywistą geometrię Three.js w Node, bez GPU. Nie weryfikują kompilacji shaderów ani obrazu w przeglądarce.

Podgląd Sites w środowisku roboczym pozostaje zablokowany przez wcześniejszy błąd infrastruktury `bwrap: Can't mount proc on /newroot/proc: Operation not permitted`. Nie uruchamiano serwera ani przeglądarki zastępczej. Kontrola wizualna i wydajność na urządzeniu pozostają do wykonania.

Do sprawdzenia na telefonie: wejście pod link z `?view=3d`, zamknięcie powitania przyciskiem Dalej, obrót i przybliżenie, rozmowa i skrzynka po obrocie, ucieczka wilka, serduszko, zmiana 3D/2D i powrót, nowa mapa 8×8. Modele są pierwszym wariantem 3D; istniejące ilustracje dialogów i finału zachowano.

## Korekta rozmiarów i krawędzi

W tej wersji menu zawiera wyłącznie 6×6 i 8×8; nowa gra domyślnie ma 6×6 pól. Techniczne wsparcie generatora dla 4×4 pozostaje dla zgodności starszych testów, ale plansza nie jest dostępna w interfejsie.

Granica planszy przycina wyłącznie powierzchnie ziemi, dróg, wody i cienie. Bryły drzew, pagórków i postaci mogą naturalnie wystawać poza krawędź. Odkrycie wystających części korzysta z maski przy najbliższej krawędzi, zamiast odcinać je pionową płaszczyzną. Mgła odkrywania pozostaje aktywna.

Po tej poprawce przeszło 12 testów 3D, w tym kontrola pełnych koron drzew na brzegach dla plansz 6×6 i 8×8 przy różnych proporcjach ekranu i obrotach kamery. Sprawdzono także dostępne rozmiary w HTML i składnię modułu. Kontrola wyglądu w przeglądarce nadal oczekuje na działającą infrastrukturę podglądu.
