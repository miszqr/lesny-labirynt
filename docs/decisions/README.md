# Decyzje projektowe (ADR)

ADR (Architecture Decision Record) zapisuje problem, wybór i jego konsekwencje. Obejmuje zarówno architekturę techniczną, jak i ważne reguły gry oraz interfejsu.

## Rejestr

| Numer | Decyzja | Status |
| --- | --- | --- |
| [0001](0001-static-browser-game.md) | Statyczna gra w przeglądarce | Przyjęta — opis istniejącego rozwiązania |
| [0002](0002-maze-and-key.md) | Labirynt jako drzewo i klucz przed bramą | Przyjęta — opis istniejącego rozwiązania |
| [0003](0003-dialogue-and-visuals.md) | Płaska mapa SVG i rozmowy przy postaciach | Przyjęta — opis istniejącego rozwiązania |

Początkowe wpisy dokumentują retrospektywnie aktualny kod i wcześniejsze ustalenia. Data oznacza datę ich zapisania, nie datę pierwszej implementacji.

## Jak dodać decyzję

1. Skopiuj [szablon](template.md) do `NNNN-krotka-nazwa.md`, używając następnego wolnego numeru.
2. Opisz jeden istotny wybór: kontekst, rozważane opcje, decyzję i konsekwencje. Nową propozycję oznacz jako **Proponowana**.
3. Po uzgodnieniu zmień status na **Przyjęta** i uzupełnij rejestr. **Odrzucona** zachowuje uzasadnienie niewybranej propozycji.
4. Gdy zmieniasz przyjętą decyzję, dodaj nowy ADR; stary oznacz jako **Zastąpiona przez ADR-NNNN** i połącz oba dokumenty linkami. Nie usuwaj historii.
5. Po wdrożeniu zaktualizuj [opis architektury](../architecture.md), aby odpowiadał kodowi.

Zwykła poprawka błędu lub korekta tekstu nie wymaga osobnego ADR. Decyzja o backendzie, zapisie gry, silniku graficznym czy zmianie zasad nagradzania już tak.
