# ADR-0004: Kierunki i powtarzane kroki u wilka

Data: 2026-10-16. Status: **Przyjęta**, na prośbę użytkownika.

## Kontekst

Wcześniej dziecko czytało liczbę kroków słownie, a odpowiadało cyfrą. Nowe zadanie ma ćwiczyć także kierunki i liczenie kolejnych kliknięć, z widocznym postępem i osobnym zatwierdzeniem.

## Rozważane opcje

- Zachowanie wyboru cyfry nie realizuje nowego polecenia.
- Natychmiastowy ruch po mapie mieszałby odpowiedź z sąsiedztwem pól i zamkniętą furtką.
- Lista klikniętych strzałek pozwala sprawdzić liczbę i kierunek przed zatwierdzeniem.

## Decyzja

Losujemy 1–5 kroków i jeden z czterech kierunków. Polecenie zapisuje liczbę słownie. Każde kliknięcie jednej z czterech strzałek dopisuje krok, widoczny jako strzałka na pasku postępu. „Cofnij” usuwa ostatni krok bez kary. Pusta odpowiedź nie może zostać zatwierdzona. Od 2026-10-17 przycisk zatwierdzający ma etykietę „Skaczę”, zgodnie z poleceniem użytkownika.

Poprawna odpowiedź zawiera dokładnie wymaganą liczbę kroków i wyłącznie wskazany kierunek. Kierunki mieszane są błędne. Zatwierdzenie poprawnej odpowiedzi rozwiązuje spotkanie i daje jedno serce tylko raz. Błąd odbiera jedno serce i czyści odpowiedź; zero serc kończy grę. Samo klikanie lub cofanie nie zabiera serc. Limit roboczy wynosi dziesięć kliknięć, co pozwala również wpisać zbyt wiele kroków bez nieograniczonego powiększania dymka.

Polecenie i szkic odpowiedzi pozostają stałe po zamknięciu dymka. Nowa gra resetuje oba. Po poprawnej odpowiedzi wilk przechodzi na inne osiągalne pole i otrzymuje nowe polecenie. Przy kolejnym spotkaniu trzeba rozwiązać je ponownie. Strzałki zadania nie zmieniają pozycji Adama; po rozwiązaniu gracz wraca do zwykłego ruchu po labiryncie. Zamknięcie rozmowy nadal nie pozwala ominąć wilka.

## Konsekwencje i weryfikacja

Zadanie wymaga przeczytania liczby i kierunku, odliczenia kliknięć oraz zatwierdzenia. Postęp pokazuje wybraną odpowiedź, bez podpowiadania docelowej liczby. Przyciski mają opisy dla czytników ekranu, a postęp jest komunikatem statusu. Nieaktualne przyciski nie mogą ponownie przyznać nagrody ani zabrać serca.

Testy obejmują wszystkie 20 kombinacji liczby i kierunku, błędną długość i kierunek, mieszane kroki, cofanie, ponowne otwarcie rozmowy, blokadę ruchu, koniec gry i restart. Kontrola układu na telefonie pozostaje do wykonania: infrastruktura podglądu przeglądarkowego była niedostępna podczas wdrożenia.
