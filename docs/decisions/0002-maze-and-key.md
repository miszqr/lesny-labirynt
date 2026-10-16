# ADR-0002: Labirynt jako drzewo i klucz przed bramą

- Status: Przyjęta — opis istniejącego rozwiązania
- Data zapisu: 2026-10-16

## Kontekst

Poziomy mają być losowe, lecz możliwe do ukończenia. Brama może blokować przejście wewnątrz labiryntu; zwierzak z kluczem musi być dostępny wcześniej, a dom pozostaje celem.

## Decyzja

Losowy DFS generuje spójny graf bez cykli. Dom jest najdalszym polem od startu. Brama blokuje krawędź na trasie do domu. Miejsce zwierzaka z kluczem wybieramy w części grafu osiągalnej od startu po wyłączeniu tej krawędzi.

## Alternatywy i konsekwencje

Losowanie bramy i klucza bez sprawdzania osiągalności mogłoby tworzyć nierozwiązywalne poziomy. Graf z pętlami dawałby więcej alternatywnych tras, ale wymagałby dodatkowej kontroli, czy bramy nie da się obejść.

Drzewo zapewnia jedną drogę pomiędzy polami i upraszcza kontrolę klucza. Ogranicza różnorodność tras; nieregularna grafika nie zmienia tej topologii. Parametr `random` generatora pozwala powtarzać przypadki w testach.

## Weryfikacja

Dla obsługiwanych rozmiarów sprawdzaj spójność, liczbę krawędzi równą liczbie pól minus jeden, obecność bramy na trasie do domu i osiągalność `keeper` przy zablokowanej bramie. Dom powinien pozostawać wtedy nieosiągalny.
