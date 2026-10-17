# Leśny Labirynt — specyfikacja skrzynek i plecaka

## 1. Cel

Wprowadzić swobodne odkrywanie przedmiotów w skrzynkach przy ścieżkach, przechowywanie ich w plecaku i jednorazowe przekazywanie zwierzętom. Generator musi gwarantować możliwość ukończenia labiryntu bez konieczności zdobycia przedmiotu zza bramy, której odblokowanie wymaga tego przedmiotu.

## 2. Ustalone zasady

- Skrzynka może zawierać **wiele przedmiotów** (także różne typy).
- Każdy **egzemplarz** przedmiotu może zostać przekazany tylko raz i po przekazaniu znika z plecaka.
- Przedmioty są dostępne od początku w ramach osiągalnego obszaru, niezależnie od aktywacji dialogu lub zadania.
- Nie ma limitu pojemności plecaka.
- Skrzynki stoją przy dostępnych ścieżkach, nie blokują przejścia.
- Zawartość skrzynek ustalana jest podczas generowania mapy, nie w momencie otwarcia.
- Skrzynki nie wymagają kluczy; klucze od zwierząt służą do bram.
- Jedna skrzynka może być częściowo opróżniona i zachowuje pozostałą zawartość.
- Każdy przedmiot potrzebny do uzyskania dostępu do kolejnego obszaru musi być osiągalny **przed** odblokowaniem tego obszaru.

## 3. Model danych (propozycja)

```ts
type ItemDefinition = {
  typeId: string;          // np. "apple", "honey"
  displayName: string;     // np. "JABŁKO"
  iconId: string;
};

type ItemInstance = {
  id: string;              // unikatowy identyfikator egzemplarza
  typeId: string;
};

type Chest = {
  id: string;
  position: { x: number; z: number };
  itemIds: string[];       // pozostałe przedmioty w skrzynce
};

type AnimalRequest = {
  animalId: string;
  requiredTypeId: string;
  rewardId: string;        // np. identyfikator klucza
  completed: boolean;
};

type GameState = {
  inventoryItemIds: string[];
  chests: Chest[];
  completedRequestIds: string[];
  unlockedGateIds: string[];
};
```

`ItemInstance` ma własne ID, dzięki czemu dwa jabłka są dwoma oddzielnymi egzemplarzami. W pierwszej wersji zakładamy, że pojedyncze zadanie zwierzęcia zużywa jeden egzemplarz danego typu.

## 4. Interakcja ze skrzynką

1. Gracz podchodzi do skrzynki; pojawia się ikona interakcji.
2. Po interakcji otwiera się okno z listą wszystkich pozostałych przedmiotów, ich ikonami i nazwami.
3. Każdy przedmiot ma przycisk **„Zabierz”**; dodatkowy przycisk **„Zabierz wszystko”** jest opcjonalny.
4. Po zabraniu przedmiot znika ze skrzynki i trafia do plecaka (operacja atomowa).
5. Po zabraniu części zawartości skrzynka pozostaje dostępna z resztą przedmiotów.
6. Pusta skrzynka pozostaje widoczna, ale pokazuje stan „Pusta”.
7. Okno zamyka się przyciskiem **„Dalej”**; kliknięcie poza oknem go nie zamyka.

## 5. Plecak

- Stały przycisk z ikoną plecaka w interfejsie gry.
- Siatka dużych ikon z czytelnymi podpisami przedmiotów.
- Wiele egzemplarzy jednego typu może być pokazanych jako jedna ikona z licznikiem, ale w stanie gry pozostają oddzielnymi egzemplarzami.
- Plecak służy do podglądu; brak ręcznego wyrzucania lub przekazywania przedmiotów między polami.
- Plecak nie zasłania trwale sterowania; zamykany przyciskiem „Dalej”.

## 6. Interakcja ze zwierzęciem

- Bez przedmiotu: zwierzę informuje, czego potrzebuje.
- Z przedmiotem: pojawia się przycisk **„Daj [nazwa]”**.
- Po potwierdzeniu dokładnie jeden pasujący egzemplarz znika z plecaka, zadanie zostaje oznaczone jako ukończone i gracz otrzymuje nagrodę.
- Ponowna rozmowa nie zużywa kolejnych egzemplarzy i nie wydaje ponownie nagrody.
- Jeśli nagrodą jest klucz, pierwsza wypowiedź zadania zaczyna się od „Dam ci klucz, jeśli…”.
- Jeśli zwierzę nie potrzebuje już przedmiotu, wyświetla podziękowanie.

## 7. Generator mapy i gwarancja ukończenia

### Reguły rozmieszczania

1. Wygenerować sieć ścieżek, bramy i obszary dostępności.
2. Ustalić zależności: zwierzę → wymagany typ przedmiotu → nagroda/klucz → brama.
3. Przydzielić wymagane egzemplarze do skrzynek przy ścieżkach **w obszarach osiągalnych przed odblokowaniem zależnej bramy**.
4. Pozostałe egzemplarze rozmieścić swobodnie; można mieszać przedmioty z różnych zadań w jednej skrzynce, o ile nie łamie to reguł dostępności.
5. Zapewnić fizyczną dostępność skrzynek i interakcji (bez kolizji z drzewami, wodą, przeszkodami).
6. Uruchomić walidator postępu; odrzucić lub naprawić mapę, której nie da się ukończyć.

### Walidator

Walidator symuluje zbieranie wszystkich dostępnych przedmiotów, wykonanie możliwych zadań, uzyskanie kluczy i otwieranie bram. Powtarza kroki, aż nie będzie nowych osiągalnych obszarów. Sukces wymaga osiągnięcia celu gry. W przypadku wielu zwierząt wymagających tego samego typu przedmiotu walidator musi uwzględniać **liczbę egzemplarzy i możliwe kolejności wydawania**, a nie tylko obecność danego typu. Najprościej zagwarantować dostateczną liczbę egzemplarzy dla wszystkich obowiązkowych zadań dostępnych w danym etapie, a dodatkowo testować różne kolejności.

**Twardy warunek:** przedmiot niezbędny do odblokowania bramy nie może być dostępny wyłącznie za tą bramą.

## 8. Trwałość stanu i niezmienniki

- Przedmiot znajduje się dokładnie w jednym miejscu: skrzynce, plecaku albo jest zużyty.
- Nie można zabrać tego samego egzemplarza dwukrotnie.
- Nie można oddać przedmiotu, którego nie ma w plecaku.
- Zadanie można ukończyć tylko raz; nagroda przyznawana jest tylko raz.
- Zawartość skrzynek, plecak, ukończone zadania i otwarte bramy powinny przetrwać zapis/odczyt stanu gry (jeśli projekt posiada zapis).
- Stan UI musi być spójny między widokiem mapy a FPV.

## 9. Kryteria akceptacji

- [x] Skrzynka zawiera 2–3 różne przedmioty i każdy można zabrać oddzielnie.
- [x] Po zabraniu jednego przedmiotu pozostałe nadal są w skrzynce.
- [x] Przedmiot można znaleźć, zanim zwierzę o niego poprosi.
- [x] Plecak pokazuje poprawne przedmioty i liczbę egzemplarzy.
- [x] Bez wymaganego przedmiotu nie można ukończyć zadania zwierzęcia.
- [x] Oddanie przedmiotu usuwa dokładnie jeden egzemplarz i przyznaje nagrodę jeden raz.
- [x] Ponowna rozmowa ze zwierzęciem nie zabiera kolejnego przedmiotu.
- [x] Pusta skrzynka nie daje nowych przedmiotów po ponownym otwarciu.
- [x] Skrzynki są dostępne i poprawnie widoczne w mapie i FPV.
- [x] Wszystkie wygenerowane mapy testowe dają się ukończyć, również przy wielu zwierzętach wymagających tego samego typu przedmiotu.
- [x] Okna nie zamykają się kliknięciem poza nimi.

## 10. Proponowana kolejność implementacji

1. Definicje i instancje przedmiotów, model skrzynek, stan plecaka.
2. Interakcja ze skrzynką i częściowe opróżnianie.
3. Widok plecaka i liczniki.
4. Warunki dialogów, jednorazowe przekazanie i nagroda.
5. Rozmieszczenie skrzynek przy ścieżkach w generatorze.
6. Walidator osiągalności i testy losowych map.
7. Integracja FPV, animacje i dopracowanie interfejsu.

## 11. Poza zakresem pierwszej wersji

- Limit pojemności lub ciężaru plecaka.
- Ręczne upuszczanie przedmiotów.
- Handel, crafting, przenoszenie między skrzynkami.
- Losowanie zawartości podczas otwierania.
- Skrzynki zamykane na klucz.

## Stan wdrożenia — 2026-10-17

Pola zaznaczone oznaczają wdrożenie w kodzie. Reguły i stan UI sprawdzono w Node z atrapą DOM, a grafikę mapy i FPV na rastrach SVG. Kontrola rzeczywistego układu, dotyku i telefonu pozostaje otwarta w T03 z powodu niedostępnego zarządzanego podglądu. Stan przygody trwa w pamięci; projekt nie posiada zapisu gry.
