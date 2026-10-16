# ADR-0005: Opcjonalny widok z oczu Adama

Data: 2026-10-16. Status: **Przyjęta**, na prośbę użytkownika o dodatkowy tryb FPV.

## Kontekst

Gra ma zachować dotychczasową mapę i zadania, a równocześnie pozwalać przejść przez las z perspektywy Adama. Przełączenie widoku nie może resetować przygody ani tworzyć alternatywnych zasad ruchu.

## Rozważane opcje

- Oddzielna gra 3D wymagałaby nowego sterowania, kolizji i powielenia reguł.
- Dowolnie obracana kamera WebGL zwiększałaby złożoność obsługi na telefonie.
- Krokowy widok perspektywiczny SVG wykorzystuje aktualny graf i ilustracje.

## Decyzja

Dodajemy `fpv.js`, renderer perspektywiczny tej samej mapy. `viewMode` wybiera mapę lub FPV, a `facing` oznacza jeden z czterech kierunków. Gracz przełącza widok w nagłówku lub menu, zachowując pozycję, serca, klucz, otwartą furtkę, odkryte pola i odpowiedzi na zadania. Nowa gra zachowuje wybór widoku i ustawia kamerę w stronę istniejącego przejścia. Odświeżenie strony resetuje stan, jak dotychczas.

W FPV ↑/↓ oznaczają krok do przodu/tyłu, ←/→ obrót w miejscu o 90°. Obrót nie odkrywa nowych pól. Udany ruch w widoku mapy aktualizuje kierunek patrzenia. Przyciski mają odpowiednie ikony i etykiety dostępności; strzałki klawiatury wykonują te same akcje. Przytrzymanie klawisza w FPV nie powoduje szybkich powtarzanych obrotów ani kroków. Polecenia wilka są nadal osobnym zadaniem z własnymi strzałkami.

Renderer pokazuje do pięciu pól w linii wzroku, zatrzymując się przy braku przejścia lub zamkniętej furtce. Boczne otwarcia wynikają z połączeń grafu. Drzewa i krzewy oznaczają nieprzekraczalne granice. Zwierzęta używają wspólnych ilustracji. Otwarta furtka ma uchylone skrzydło i dopuszcza ruch przez istniejącą krawędź. FPV pokazuje widoczne przed graczem obiekty niezależnie od odwiedzenia ich pól; nie odkrywa przez to mapy.

Dymek w FPV mieści się w obszarze sceny; nie potrzebuje widocznej sylwetki Adama. Dotarcie do domu pokazuje dotychczasowy finał i kwestię siostry „Dobrze cię widzieć!”.

## Konsekwencje i weryfikacja

Tryb działa bez instalacji zależności i bez WebGL. To ruch krokowy, nie płynne chodzenie swobodną kamerą. Przyjęta w ADR-0003 mapa SVG i zasady rozmów nadal obowiązują dla widoku z góry; nowy widok rozszerza je.

Testy sprawdzają kierunki, cofanie, obrót, ściany, furtkę, zachowanie stanu, zadania, finał i skończone współrzędne SVG dla wszystkich pól oraz orientacji na mapach 4×4, 6×6 i 8×8. Osobno sprawdzono wyrenderowane sceny SVG. Pełny podgląd przeglądarkowy był niedostępny z powodu błędu środowiska podglądu, więc układ na telefonie wymaga jeszcze kontroli.
