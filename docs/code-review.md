# Przegląd kodu i lista TODO — Adam w lesie

Data: **2026-10-16**  
Repozytorium: `miszqr/lesny-labirynt`  
Przeglądana wersja: [`71aa236c8f438b712c8ff2f81a72b5f87d7718ab`](https://github.com/miszqr/lesny-labirynt/commit/71aa236c8f438b712c8ff2f81a72b5f87d7718ab), gałąź `main`.

Raport opisuje stan tego commita. Nie oznacza, że poniższe TODO zostały wdrożone. Przegląd obejmował `index.html`, `maze.js`, README, opis architektury i ADR-y. Zgodność lokalnych plików z GitHubem potwierdzono przez porównanie identyfikatorów blobów Git.

## Pierwszy wilk zawsze z zadaniem głosowym — 2026-10-18

Test użytkownika ujawnił, że losowanie po 50% również na pierwszym spotkaniu utrudnia znalezienie nowego zadania. Pierwszy wilk w każdej przygodzie wybiera teraz mowę, jeśli przeglądarka ją obsługuje, lista fraz nie jest pusta, a dostęp do mikrofonu nie został odrzucony. Oczekiwanie na zgodę zachowuje zadanie; udzielenie jej odblokowuje „Mówię”. Kolejne spotkania nadal losują mowę/skoki, a przy odmowie lub awarii pozostaje przejście do strzałek. Wyłączenie mikrofonu po sprawdzeniu zgody jest zamierzone; słuchanie zaczyna dopiero przycisk.

Przeszło **48 testów** zadań głosowych, sterowania dialogami i relokacji wilka. Dwa nowe testy sprawdzają rzeczywiście wygenerowane pierwsze spotkanie (bez podmieniania typu zadania), różne ziarna, reset przygody i zgodę udzieloną dopiero po dojściu do wilka. API mowy jest symulowane; fizycznego mikrofonu nie testowano w tym środowisku.

## Głosowe zadanie wilka — 2026-10-18

Dodano losowane zadanie „Powiedz: Uciekaj wilku”, edytowalny `wolf-phrases.js` i kontroler `speech.js`. Sprawdzenie zgody odbywa się przy otwarciu strony; po sprawdzeniu wszystkie ścieżki mikrofonu są zatrzymywane. Rozpoznawanie zaczyna przycisk „Mówię”. Wypowiedzenie całej frazy relokuje wilka bez serca. Cisza, błędy i inne rozpoznane słowa pozwalają ponowić próbę bez kary. Awaria, odmowa lub ignorowany monit nie blokują rozgrywki: zadanie można zamienić na wymagane skoki. Nowe losowania po odmowie/braku API wybierają skoki.

Przeszły **192 testy, 0 błędów** (`TEST_SEED=42 node --test tests/*.test.cjs`), w tym **24 nowe przypadki** zgody, rozpoznawania i integracji. Sprawdzono oba widoki, prefiksowane API, wyniki cząstkowe i powtórzone końcowe, pełne dopasowanie frazy, brak/odmowę/błąd mikrofonu, timeout, ponowną zgodę, stary wynik po restarcie/przerysowaniu/zmianie widoku oraz przejście do skoków. Pełne podróże uruchomiono dla ziarna 42 w każdym rozmiarze. Mikrofon i Web Speech API są w tych testach symulowane — nie potwierdzają działania rozpoznawania w rzeczywistym Chrome na telefonie.

Podgląd przeglądarkowy nadal jest niedostępny z powodu opisanej blokady infrastruktury. Przygotowano ręczną listę testów HTTPS/telefonu; T03 pozostaje otwarte. Dotychczasowe scenariusze przeglądarkowe jawnie wyłączają API mowy w środowisku testu, żeby rzeczywisty monit o zgodę nie zakłócał geometrii i sterowania.

## Powitanie tylko przy pierwszej rozmowie — 2026-10-18

Każdy przyjazny zwierzak ma osobną flagę `greeted`. Ustawia ją otwarcie pierwszej rozmowy, nie samo zobaczenie postaci ani wejście na jej pole. Drugie i kolejne otwarcia od razu pokazują prośbę, a po ukończeniu zadania podziękowanie. Flaga pozostaje po Escape, odejściu, powrocie oraz zmianie widoku i jest niezależna od nagrody. Nowa gra przywraca powitania przez utworzenie nowych spotkań z `greeted: false`. Wilk zachowuje dotychczasowy wstęp i obowiązkowe zadanie.

Przeszło **78 testów** rozmów, próśb, przedmiotów, reguł i lotu serduszka (`TEST_SEED=42`; pełne podróże po jednym ziarnie w każdym rozmiarze). Dwa nowe przypadki sprawdzają oddzielną pamięć dwóch zwierzaków, przerwane powitanie, odejście i powrót, zmianę widoku oraz reset przygody. Zaktualizowano istniejące przypadki oddawania przedmiotu po ponownych odwiedzinach. Składnia dostosowanych scenariuszy przeglądarkowych jest poprawna; sam podgląd przeglądarkowy pozostaje niedostępny.

## Obowiązkowe okienko zadania wilka — 2026-10-18

Usunięto „Dalej” z etapu wykonywania zadania wilka oraz tekst „Jedno kliknięcie to jeden krok”. W stopce zostają „Cofnij” i „Skaczę”. `requiredTaskOpen()` odróżnia obowiązkowe zadanie przeciwnika od wstępu i zwykłych rozmów. Ukryty przycisk nie działa po wywołaniu starego handlera, a Escape oraz natywne `cancel` nie zamykają zadania. Poprawne wykonanie zamyka je i uruchamia przejście wilka. Błąd pozostawia zadanie otwarte, a utrata wszystkich serc przechodzi do ekranu końca gry z możliwością restartu. Prośby przyjaznych postaci można nadal zamknąć, aby poszukać przedmiotów.

Przeszło **68 testów** dialogów, zadań i relokacji wilka, kategorii oraz lotu serduszka. Dostosowano istniejące przypadki do obowiązkowego okienka i sprawdzono blokadę „Dalej”, Escape/cancel, poprawną odpowiedź, błąd, przegraną i przyjazne rozmowy. Scenariusze przeglądarkowe uwzględniają dwa przyciski stopki i brak instrukcji; sprawdzono ich składnię. Wykonanie w przeglądarce pozostaje niedostępne zgodnie z ograniczeniem podglądu w T03.

## Zwierzak rozpoczyna rozmowę — 2026-10-18

Usunięto wstęp Adama „Cześć! Jak ci pomóc?” przy przyjaznych postaciach. Teraz zwierzak najpierw przedstawia się odpowiednio do gatunku, np. „Cześć! Jestem pieskiem.”, a po „Dalej” mówi swoją prośbę. Poszukiwany przedmiot i przycisk oddania pojawiają się na etapie prośby. Posiadacz klucza nadal zaczyna tę prośbę od „Dam ci klucz, jeśli…”. Podziękowania po wykonaniu zadania, wilk, wstęp gry i finał zachowują swoją sekwencję.

Przeszły **43 istniejące testy** dialogów, ikony rozmowy, chodzenia, serduszka i reguł gry (`TEST_SEED=42`; pełne podróże po jednym ziarnie w każdym rozmiarze). Dostosowano oczekiwane powitanie w teście chodzenia i pierwszego mówcę w pomocniku rozgrywek. Osobno odczytano oba etapy dialogu dla wszystkich sześciu gatunków. Podglądu przeglądarkowego nie wykonywano; pozostaje wcześniejsze ograniczenie infrastruktury opisane w T03.

## Lot serduszka od zwierzaka do Adama — 2026-10-17

Po oddaniu przedmiotu przyjaznej postaci na mapie 2D pojawia się serce, które leci łukiem do Adama i kończy lot delikatnym rozświetleniem. Efekt trwa 900 ms. Nagroda jest zapisywana raz, przed animacją; zakończenie, restart i pominięcie efektu nie zmieniają serc ani przedmiotów. Wilk nie uruchamia lotu ani nie przyznaje serca. Zgodnie z poleceniem użytkownika FPV pominięto. Ograniczenie ruchu i brak RAF zachowują natychmiastową nagrodę.

Przeszły **83 testy**: 13 nowych przypadków lotu oraz regresje chodzenia, wilka, kategorii, ulubionych przedmiotów, pojemności plecaka, ikony rozmowy i dialogów. Po korekcie obsługi atrybutu `hidden` na SVG ponownie przeszło 13 testów lotu. Obejrzano trzy statyczne fazy na tle mapy: początek przy zwierzaku, łuk i dotarcie do Adama. Nie wykonano podglądu przeglądarkowego, ponieważ jego infrastruktura nadal jest niedostępna; płynność i zachowanie rzeczywistego układu pozostają do kontroli w T03.

## Przyciski dymka poza przewijaną treścią — 2026-10-17

Zdjęcie użytkownika ujawniło przypadek, w którym przy „Skocz pięć kroków w górę.” dolne akcje wypadały poza widoczny obszar. Dotychczasowy limit 330 px obejmował całą treść razem z przyciskami. Dymek otrzymał limit wynikający z dostępnej wysokości karty oraz osobny pasek akcji, który się nie kurczy. Cofnij/Skaczę/Dalej są poza przewijaną treścią. Etap rozmowy steruje widocznością paska, a inna rozmowa i nowa gra czyszczą akcje wilka.

Przeszło **86 testów** w ukierunkowanym zestawie dialogów, wilka, kategorii, bramy i legalnych rozgrywek (`TEST_SEED=42`). Następnie przeszło **11 testów dialogów**, w tym dwa dodane przypadki paska w mapie i FPV — łącznie 88 różnych przypadków. Testy w symulowanym DOM potwierdzają obsługę i obliczenia położenia, ale nie rzeczywisty CSS. Nowy scenariusz przeglądarkowy sprawdza granice i dostępność przycisków przy przewijaniu i powiększonym tekście; składnia jest poprawna, wykonanie nadal zablokowane niedostępnością podglądu. Nie oznaczono T03 jako ukończonego.

## Kategorie postaci i brak nagrody za wilka — 2026-10-17

Wprowadzono wspólny model `ForestCharacters`: `friendly` („Przyjazna”) oraz `enemy` („Przeciwnik”). Zastępuje flagę `danger` w czynnej logice gry, renderowaniu FPV i scenariuszach testowych. Tylko pomoc przyjaznym postaciom daje jedno serce. Poprawne ominięcie wilka nie zmienia zdrowia, błąd nadal odbiera jedno. Przechodzenie wilka na inne pole i kolejne zadania pozostają aktywne. Ta zmiana zastępuje opisaną w poprzedniej sekcji nagrodę za ominięcie.

**151 testów przeszło, 0 błędów** (`TEST_SEED=42 node --test tests/*.test.cjs`). Zakres obejmuje wszystkie 20 zadań wilka, błędy i przegraną, powtórne spotkania, serie 12 poprawnych ominięć przy jednym sercu w obu widokach, jawne kategorie, dobór próśb tylko dla przyjaznych postaci i odrzucenie nieaktualnego oddania przedmiotu przeciwnikowi. Pełne podróże uruchomiono dla ziarna 42 w każdym rozmiarze; nie powtarzano całego domyślnego zestawu 300 podróży. Testy symulują DOM; przeglądarka i telefon nadal nie zostały zweryfikowane.

## Powracający wilk — 2026-10-17

Wilk po ominięciu przechodzi rzeczywistą trasą na inne wolne pole, bez przekraczania zamkniętej furtki. Znika wyłącznie z poprzedniego pola; w świecie pozostaje jeden wilk. Następne spotkanie wymaga nowej odpowiedzi i może dać kolejne serce. Nowe polecenie różni się od poprzedniego. Animacja mapy nie pomniejsza ani nie wygasza postaci; FPV korzysta z tej samej trasy świata, projekcji i widoczności korytarzy.

**147 testów przeszło, 0 błędów** w poleceniu `TEST_SEED=42 node --test tests/*.test.cjs`. Pełne podróże i przegrane sprawdzono dla ziarna 42 w każdym z trzech rozmiarów; nie powtarzano w tym przebiegu domyślnych 300 pełnych rozgrywek. Nowe testy tras niezależnie wykonują 2400 relokacji na 300 układach. Sprawdzono także legalne dojście do wilka po przeniesieniu, powtórne zadanie w obu widokach, nieaktualne przyciski, podwójną aktywację, restart, ograniczenie animacji i przełączenia widoku. Scenariusz przeglądarkowy zaktualizowano, lecz podgląd i kontrola telefonu nadal są niedostępne; płynność animacji nie została sprawdzona w przeglądarce.

## Plecak: dwa miejsca i odkładanie — 2026-10-17

Plecak mieści teraz dokładnie dwa egzemplarze. Każda sztuka zajmuje osobne miejsce, nawet przy takim samym typie; klucz do furtki pozostaje osobną nagrodą. Pełny plecak blokuje odbiór na poziomie modelu i UI. „Zabierz wszystko” działa tylko wtedy, gdy mieści się cała zawartość.

W oknie skrzyni widoczny jest także plecak, z przyciskiem „Odłóż do skrzyni” przy każdej sztuce. Odkładanie działa również w samym plecaku, gdy gracz stoi przy skrzyni. Można użyć dowolnej osiągalnej skrzyni, także pustej. Odłożony przedmiot zachowuje ID i można go znów zabrać; nie powstają kopie. Zmiany od razu odzwierciedlają licznik oraz wygląd skrzyni w mapie i FPV.

**141 testów przeszło, 0 błędów.** Testy pojemności obejmują zablokowanie trzeciej sztuki, zwolnienie miejsca po oddaniu lub odłożeniu, inną i pustą skrzynię, nieaktualne akcje oraz niedozwolony zwrot z oddalonego pola. Zestaw 3000 układów wykonuje po sześć symulacji dostaw przy dwóch miejscach, z odkładaniem niepotrzebnych przedmiotów. Pełne rozgrywki pobierają teraz potrzebne przedmioty i wymieniają zawartość plecaka przez kontrolki gry; przeszło 300 wygranych i 30 przegranych. Podgląd przeglądarkowy i kontrola telefonu nadal są niedostępne; T03 pozostaje otwarte.

## Skrzynki i plecak — 2026-10-17

Wdrożono załączoną specyfikację: stałą zawartość skrzynek, częściowy odbiór, plecak z ikonami i licznikami, jednorazowe oddawanie instancji i nagrody, podziękowania w ponownej rozmowie oraz wspólny stan mapy i FPV. Skrzynki stoją obok ścieżek, bez kolizji z dekoracjami; pustą skrzynkę wyróżnia otwarte wieko. Okna zamyka „Dalej” lub Escape; kliknięcia poza nimi nie zamykają ani nie uruchamiają sterowania.

Generator rezerwuje przed furtką po jednym egzemplarzu dla każdego zadania, także dobrowolnego. Walidator sprawdza wszystkie możliwe kolejności dostaw i liczby egzemplarzy. Zaktualizowane listy oraz specyfikacja są w `docs/LESNY_LABIRYNT_TODO.md` i `docs/LESNY_LABIRYNT_SPEC_SKRZYNKI_PLECAK.md`.

**136 testów przeszło, 0 błędów.** Zakres obejmuje 3000 układów przedmiotów (w tym powtarzające się prośby), 3000 grafów labiryntu, 300 pełnych wygranych z odbiorem przez interfejs skrzynek, 30 przegranych oraz testy stanu, geometrii i animacji. Obejrzano rastry mapy oraz pełnej i pustej skrzynki w FPV. Zaktualizowano scenariusze przeglądarkowe, ale nie wykonano ich: zarządzany podgląd pozostaje niedostępny. Wyliczenie scenariuszy również nie zostało teraz potwierdzone, ponieważ lokalnie brakuje pakietu Playwright. T03 nadal pozostaje otwarte.

Przed edycją utworzono i wypchnięto tag `przed-skrzynkami-2026-10-17` w źródłowym repozytorium Sites, wskazujący commit `055f6a90ffbb3cb51041da4542ea6d7468d5838d` (odpowiadający GitHub `f4c3a5a0778c963b680485cb38b6f1554f7ce471`). Tag nie został utworzony na GitHubie, ponieważ dostępny konektor obsługuje aktualizację gałęzi, a nie tagów.

## Ikona rozmowy — 2026-10-17

Po dojściu do przyjaznego zwierzaka z niewykonanym zadaniem pojawia się mała chmurka z trzema kropkami. Otwiera rozmowę dotykiem, kliknięciem lub Enterem. Jest przypisana do aktualnego pola i działa w mapie oraz FPV. Chowa się podczas rozmowy, chodzenia, po wykonaniu zadania i po odejściu. Przyjazne spotkanie czeka teraz na wybranie chmurki lub dotychczasowego przycisku pod mapą. Obsługa wilka, furtki i finału pozostaje bez zmian.

**106 testów logiki przeszło**, w tym nowe sprawdzenia ikony i dojścia do zwierzaka. Zestaw przeglądarkowy zawiera teraz **69 przypadków**, z dodatkowymi scenariuszami dotyku i klawiatury dla chmurki. Potwierdzono tylko ich wyliczenie; wykonanie w przeglądarce i kontrola telefonu w T03 nadal oczekują na sprawny podgląd.

## Zmiany dialogów i sterowania — 2026-10-17

Zgodnie z nowszym poleceniem użytkownika kliknięcie poza dymkiem nie zamyka go i nie wykonuje akcji w tle. „Dalej” przechodzi do kolejnej wypowiedzi i zamyka ostatnią; Escape pozostaje dostępny. Wilk ma przycisk „Skaczę”, a zwierzak z kluczem zaczyna prośbę od „Dam ci klucz, jeśli…” z nazwą wylosowanego przedmiotu. Istniejące sterowanie strzałkami klawiatury zachowano i objęto dodatkowymi testami dla wszystkich kierunków mapy. Zaktualizowano scenariusze T03 do tych zasad. Starsze opisy zamykania kliknięciem poniżej dotyczą historycznej wersji. Wynik weryfikacji: **102 testy logiki przeszły**. Playwright poprawnie wyliczył **63 scenariusze**, ale nie uruchamiano ich w przeglądarce.

## Aktualizacja T03 — 2026-10-17, przygotowanie testów

Dodano konfigurację Playwright oraz `tests/browser/`: trzy rozmiary ekranu, mapa i FPV, cztery narożniki, długi tekst i błąd wilka, dotyk, menu, Escape, Tab, Enter, powrót fokusu oraz pełny komunikat furtki. Testy mierzą rzeczywiste prostokąty DOM i sprawdzają, czy środek strzałki nie jest zasłonięty. Raport zachowuje zrzuty i ślady błędów. Instrukcja uruchomienia oraz niewypełniona checklista kontroli prawdziwego telefonu są w [browser-tests.md](browser-tests.md).

**T03 nie jest ukończone.** Zarządzany podgląd pozostaje zatrzymany po błędzie `bwrap: Can't mount proc on /newroot/proc: Operation not permitted`; brak oznak naprawy wymaganych przez instrukcję Sites przed ponowieniem. Przygotowanie scenariuszy i sprawdzenie ich składni/wyliczenia nie potwierdza zachowania gry w przeglądarce. Wykonanie, ewentualne poprawki i kontrola telefonu pozostają do zrobienia.

## Aktualizacja T01 / R2 — 2026-10-17

Utrwalono testy generatora i pełnych przebiegów aktualnej gry w `tests/maze.test.cjs` i `tests/game-rules.test.cjs`, z małymi pomocnikami w `tests/helpers/`. Wspólna atrapa gry przyjmuje teraz `size` i `seed`; dotychczasowe testy zachowują swoje wartości domyślne.

Jedno polecenie `node --test tests/*.test.cjs` uruchamia cały zestaw. Wynik: **93 testy przeszły**, w tym 3000 wygenerowanych map (ziarna 1–1000 dla 4, 6 i 8), 300 pełnych wygranych (ziarna 1–100, naprzemiennie mapa/FPV), 30 przegranych (ziarna 1–10) i restart po niedokończonej odpowiedzi wilkowi w każdym rozmiarze.

Przebiegi prowadzą gracza legalną trasą i używają istniejących przycisków oraz odpowiedzi. Sprawdzają niedostępność domu przed otwarciem furtki, klucz osiągalny przed furtką, błędne odpowiedzi, blokadę wilka, nagrody tylko raz, wygraną, przegraną i reset. Reset obejmuje również odwiedzone pola, pamięć mgły, wykonane zadania, ekwipunek, szkic odpowiedzi, stan animacji i interfejs; wybrany widok pozostaje preferencją.

Błąd zawiera scenariusz, rozmiar i ziarno. `TEST_SEED=42 node --test tests/maze.test.cjs tests/game-rules.test.cjs` odtwarza pojedyncze ziarno we wszystkich rozmiarach. Na tymczasowych kopiach kodu potwierdzono wykrywanie dwóch celowo wprowadzonych błędów: klucza za zamkniętą furtką oraz nagrody dwóch serc zamiast jednego. W obu przypadkach raport wskazał rozmiar i ziarno. Kod gry nie wymagał zmiany.

Testy korzystają z atrapy DOM; rzeczywista przeglądarka, telefon i fokus pozostają w T03. CI pozostaje w T04. Kontrolowane ziarno służy testom i nie realizuje osobnego T09 dotyczącego odtwarzania gry przez użytkownika.

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

- [x] **T01 / R2 — Utrwalić testy generatora i reguł.** Wykonano: 3000 map, 300 pełnych wygranych, 30 przegranych i resety dla wszystkich rozmiarów; 93 testy przeszły. Jedno polecenie i odtwarzanie błędu według ziarna opisano w README; szczegóły w aktualizacji powyżej.
- [x] **T02 / R1 — Pozycjonować dymek po ustawieniu całej treści.** Naprawiono kolejność i dodano 24 testy regresji, w tym granice dymka z symulowanymi wymiarami. Sprawdzenie w prawdziwej przeglądarce pozostaje w T03; szczegóły w aktualizacji powyżej.
- [ ] **T03 — Dodać testy przeglądarkowe oraz kontrolę na telefonie.** Zestaw i instrukcja przygotowane; wykonanie zablokowane przez niedostępny podgląd, kontrola telefonu oczekuje. Sprawdzić co najmniej 320×568, 390×844 i 844×390, krawędzie mapy, długi tekst wilka, menu, kliknięcie poza dymkiem, Escape i fokus. Strzałki mają pozostać dostępne, a cała strona nie wymagać przewijania. Szczegóły w aktualizacji powyżej i `browser-tests.md`.
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
