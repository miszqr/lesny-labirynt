# T03 — przeglądarka i telefon

**Status: zestaw przygotowany, wykonanie w przeglądarce i kontrola na telefonie oczekują.** Samo wylistowanie przypadków nie oznacza, że testy przeszły. Nie ma jeszcze zatwierdzonych zrzutów ani wyników z urządzenia.

## Uruchomienie na własnym komputerze

Gra nadal działa bez zależności. Pakiet Playwright jest potrzebny wyłącznie do testów. Wymagany Node.js co najmniej 20 oraz Python 3 do przykładowego serwera.

W katalogu repozytorium:

```sh
npm install
npx playwright install chromium
python3 -m http.server 8080 --bind 127.0.0.1
```

Ostatnie polecenie pozostaw uruchomione. W drugim terminalu, w tym samym katalogu:

```sh
npm run test:browser
```

Opcjonalnie:

```sh
npm run test:browser:list
npm run test:browser -- --project=telefon-320x568
npm run test:browser -- --grep 'Escape'
npm run test:browser:report
```

`PLAYWRIGHT_BASE_URL` wskazuje inny adres **własnej kopii testowej**, domyślnie `http://127.0.0.1:8080`. Konfiguracja nie uruchamia serwera. `test:browser:list` tylko ładuje konfigurację i wylicza przypadki, bez uruchamiania przeglądarki. Testy wymagają gry z tego repozytorium; nie są testem dowolnego serwisu.

Raport HTML trafia do `playwright-report/`, ślady i zrzuty błędów do `test-results/`. Zrzuty udanych scenariuszy powitania, menu i dymków przy krawędziach są załączone do raportu do oceny wzrokowej. Nie ma automatycznego porównania obrazów z wzorcem. Oba katalogi oraz `node_modules/` są pomijane przez Git.

## Co sprawdza automat

Każdy scenariusz uruchamia się w Chromium, z dotykiem i mobilnym viewportem:

| Projekt | Rozmiar CSS |
| --- | --- |
| `telefon-320x568` | 320×568 |
| `telefon-390x844` | 390×844 |
| `poziomo-844x390` | 844×390 |

Zakres:

- Brak przewijania całej strony, dymek w granicach karty, brak poziomego przewijania treści dymka.
- Cztery przyciski ruchu w oknie, obszary co najmniej 44×44 px i sprawdzenie trafienia dotykiem w ich środek. Sama widoczność DOM nie wystarcza, jeśli dymek zasłania przycisk. Dozwolone są nieaktywne strzałki wynikające z reguł gry.
- Cztery narożniki mapy 8×8, mapa i FPV; dłuższe naturalne polecenie wilka oraz dodatkowy komunikat po błędzie.
- Dotyk poza dymkiem nie zamyka go i nie wykonuje akcji w tle. „Dalej” przechodzi przez wypowiedzi i zamyka ostatnią. Osobno dotyk wyłączonej strzałki przy wilku, bez wymuszania zdarzenia `click` w kodzie strony.
- Dotykowe wpisywanie kroków wilka, postęp, cofanie, brak „Dalej” i dodatkowej instrukcji o kliknięciach, blokada Escape oraz zamknięcie zadania po poprawnym „Skaczę”.
- Menu, rozmiar mapy, przełączanie FPV, zmiana orientacji, Tab wewnątrz menu, Escape i powrót fokusu. Klawiaturowy wybór obrazka przez Tab i Enter oraz ruch strzałką po zakończeniu rozmowy przez „Dalej”.
- Pełny komunikat zamkniętej furtki, z kluczem i bez klucza, oraz jej otwarcie.
- Chmurka rozmowy przy przyjaznym zwierzaku: granice mapy, trafienie dotykiem, otwieranie przez Tab i Enter, ukrywanie podczas rozmowy i po poprawnej odpowiedzi, w mapie i FPV.
- Powitanie zwierzaka tylko przy pierwszej rozmowie: ponowne otwarcie po „Dalej” i Escape od razu pokazuje prośbę.
- Nieobsłużone wyjątki JavaScript powodują błąd testu.

Testy nie pomijają niepotwierdzonych problemów. Jeśli geometria, fokus lub obsługa dotyku nie spełniają opisanych warunków, trzeba zweryfikować zachowanie i poprawić grę, zamiast oznaczać przypadek jako zaliczony bez sprawdzenia.

## Jak przygotowane są sceny

`tests/browser/helpers.cjs` ustawia deterministyczne losowanie przed załadowaniem gry. Testy geometrii podstawiają przez `page.evaluate` stan spotkania w wybranym narożniku; nie przechodzą tam legalną trasą. Korzystają z prawdziwego DOM, CSS, renderowania SVG i obsługi zdarzeń. Kliknięcia, dotyk, Tab, Enter i Escape wykonuje przeglądarka, bez bezpośredniego wywoływania handlerów. Test furtki również ustawia pozycję i ekwipunek jako warunki początkowe.

Pełne legalne przebiegi pozostają w testach T01. Te dwa zestawy uzupełniają się. Testy przeglądarkowe włączają ograniczenie animacji dla stabilnego sprawdzania geometrii i dotyku; nie weryfikują płynności chodzenia ani ucieczki wilka. Emulacja Chromium nie zastępuje Safari, prawdziwego telefonu, czytnika ekranu ani pomiarów wydajności.

## Kontrola ręczna — jeszcze niewykonana

Po uruchomieniu automatu obejrzyj jego zrzuty. Następnie sprawdź grę na prawdziwym telefonie, w pionie i poziomie. Zapisz model, system, przeglądarkę z wersją, viewport, commit gry i wynik. Nie wpisuj „OK” tylko na podstawie emulacji.

| Sprawdzenie | Wynik / uwagi |
| --- | --- |
| Dymki przy czterech krawędziach, długi tekst wilka i błąd; tekst nie jest ucięty, przewija się tylko wnętrze dymka | Oczekuje |
| Strzałki pozostają widoczne i dostępne; „Dalej” zamyka ostatnią wypowiedź, dotyk poza dymkiem niczego nie zmienia | Oczekuje |
| Menu, zmiana rozmiaru, nowa gra, mapa i FPV | Oczekuje |
| Obrót telefonu także podczas otwartej rozmowy; pasek adresu rozwinięty i schowany, bezpieczne marginesy ekranu | Oczekuje |
| Chodzenie, delikatny ruch zwierząt i ucieczka wilka przy zwykłym ustawieniu animacji | Oczekuje |
| Powiększony tekst systemowy: dostęp do całej treści i odpowiedzi | Oczekuje |
| Na komputerze/klawiaturze: Escape, widoczny fokus, Tab i Enter przy odpowiedziach, powrót z menu | Oczekuje |

## Blokada bieżącego środowiska — 2026-10-17

Zarządzany podgląd Sites pozostaje zatrzymany po wcześniejszym błędzie `bwrap: Can't mount proc on /newroot/proc: Operation not permitted`. Instrukcja Sites wymaga naprawy lub konkretnej oznaki przywrócenia infrastruktury przed ponowieniem. Nie uruchamiano zastępczego serwera ani przeglądarki z pominięciem tego ograniczenia.

Sprawdzono składnię i wyliczenie **69 scenariuszy**; wszystkie **106 testów logiki** przeszło. Nie sprawdzono wyniku scenariuszy w przeglądarce. **T03 pozostaje otwarte** do wykonania automatu, poprawienia ewentualnych błędów i zapisania rzeczywistej kontroli telefonu.

## Skrzynki i plecak — scenariusze przygotowane

Dodano odbiór pojedynczy i całej zawartości, powrót do częściowo opróżnionej skrzynki, pustą skrzynkę, podgląd plecaka, brak zamknięcia po kliknięciu poza oknem oraz dostęp do sterowania po „Dalej” w mapie i FPV. Zaktualizowano sceny zwierząt do posiadania fizycznej instancji przedmiotu i podziękowania po oddaniu. Scenariusze pozostają niewykonane w przeglądarce.

## Limit dwóch miejsc i odkładanie

Scenariusz skrzyni obejmuje teraz zapełnienie dwóch miejsc, zablokowany trzeci odbiór, odłożenie jednej sztuki i ponowne odblokowanie odbioru. Zestaw nadal czeka na działający podgląd przeglądarkowy.

## Ucięte akcje w dymku wilka — 2026-10-17

Przygotowano przypadek „Skocz pięć kroków w górę.” w mapie i FPV. Sprawdza umieszczenie Cofnij/Skaczę/Dalej wewnątrz osobnego paska i dymka, trafienie dotykiem, niezmienne położenie paska przy przewijaniu oraz większy tekst i długi komunikat. Poprawiono też kategorię przyjaznej postaci w starszej scenie przygotowawczej. Sprawdzono składnię scenariuszy, ale nie uruchomiono ich w przeglądarce; blokada podglądu nadal obowiązuje.

## Zadanie głosowe — test na telefonie oczekuje (2026-10-18)

24 testy w `tests/wolf-speech.test.cjs` korzystają z symulowanych API. Dotychczasowy automat przeglądarkowy wyłącza rozpoznawanie w swoim środowisku, aby nie pytać o prawdziwy mikrofon podczas testów geometrii. Nie jest to weryfikacja głosu.

Na Chrome/telefonie otwórz bezpośrednio stronę HTTPS gry. Sprawdź:

1. Przy pierwszym otwarciu pojawia się prośba o mikrofon. Po zgodzie wskaźnik użycia mikrofonu gaśnie; przed kliknięciem „Mówię” gra nie rozpoznaje mowy. Przy zapamiętanej zgodzie pytanie nie musi się powtarzać.
2. Po zgodzie na mikrofon pierwsze spotkanie z wilkiem ma zadanie głosowe; dopiero następne losują mowę lub skoki. Kliknij „Mówię” i powiedz „Uciekaj wilku”. Widać słuchanie i słowa; po rozpoznaniu całości wilk przechodzi w inne miejsce bez dodatkowego serca.
3. Inna fraza, cisza i brak internetu nie odbierają serca, nie zaliczają zadania i pozwalają ponowić próbę lub wybrać „Zadanie ze strzałkami”. Przycisk mieści się w dymku w pionie/poziomie, również przy dużym tekście.
4. Odmów zgody i pozostaw monit bez odpowiedzi w osobnych próbach: nadal można grać, a zadanie głosowe zamienić na skoki. Zmień zgodę w ustawieniach strony i ponów ją przez menu.
5. Przenieś kartę w tło podczas słuchania i wróć: mikrofon zatrzymany, można zacząć kolejną próbę. Nowa gra i przełączenie widoku nie przyjmują starych wyników.
6. Dopisz drugi zwrot w `wolf-phrases.js`, opublikuj i odśwież. Zadania losują z nowej listy, a ponawianie jednej próby nie zmienia jej tekstu.

Wynik kontroli prawdziwego mikrofonu: **oczekuje**.
