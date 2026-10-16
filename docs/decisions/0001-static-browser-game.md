# ADR-0001: Statyczna gra w przeglądarce

- Status: Przyjęta — opis istniejącego rozwiązania
- Data zapisu: 2026-10-16

## Kontekst

Mała gra dla dziecka ma działać na telefonie i dawać się łatwo uruchamiać oraz hostować. Obecne zasady nie wymagają kont ani współdzielonego stanu.

## Decyzja

Używamy HTML, CSS i JavaScript bez frameworka, backendu i kompilacji. Stan sesji pozostaje w pamięci przeglądarki. Generator znajduje się w `maze.js`, pozostała implementacja w `index.html`.

## Alternatywy i konsekwencje

Framework z bundlerem ułatwiłby rozwój większej aplikacji, ale dodałby zależności i proces budowania. Backend umożliwiłby synchronizację postępu, ale obecna gra go nie potrzebuje. Są to alternatywy odnotowane przy dokumentowaniu, bez twierdzenia, że były wcześniej prototypowane.

Statyczne pliki upraszczają dystrybucję. Odświeżenie traci postęp; wspólny plik interfejsu i logiki utrudnia izolowane testy. Wprowadzenie zapisu, kont lub frameworka wymaga nowej decyzji, a nie milczącej zmiany tego opisu.

## Weryfikacja

Gra powinna działać z lokalnego serwera statycznego bez instalacji pakietów. Dokumentację aktualizujemy wraz ze zmianą granic modułów i sposobu uruchamiania.
