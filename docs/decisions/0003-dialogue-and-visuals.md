# ADR-0003: Płaska mapa SVG i rozmowy przy postaciach

- Status: Przyjęta — opis istniejącego rozwiązania
- Data zapisu: 2026-10-16

## Kontekst

Dziecko dopiero uczy się czytać. Tekst ma pojawiać się przy spotkaniach i przeszkodach oraz na początku i końcu przygody. Użytkownik wybrał płaską mapę z przestrzennie wyglądającymi elementami i dymki zamiast centralnych okien z tekstem.

## Decyzja

Rysujemy teren i postacie jako SVG w stylistyce 2,5D. Ścieżki odpowiadają grafowi przejść. Rozmowa pokazuje pojedyncze, krótkie kwestie przy mówiącej postaci: Adam, potem zwierzak; przycisk „Dalej” zmienia kwestię. Odpowiedzi są widoczne na końcu sekwencji. Dymek jest niemodalny, ale logika blokuje ruch w czasie rozmowy.

Zwierzęta pozostają widoczne po zadaniu; poprawna odpowiedź zamyka rozmowę bez komunikatu o sukcesie. Finał zastępuje las wnętrzem domu z Adamem przytulającym siostrę i krótką rozmową.

## Alternatywy i konsekwencje

Centralny modal był wcześniejszym interfejsem i został zastąpiony dymkami. Pełny silnik 3D zwiększyłby koszt implementacji; obecne SVG daje przestrzenny wygląd bez rzeczywistej geometrii 3D.

Dymki wiążą tekst z postacią, ale wymagają pozycjonowania, ograniczania rozmiaru i sprawdzania na małych ekranach. Zmiany układu SVG mogą wpłynąć na wybór postaci i pozycję dymka. Menu ustawień nadal jest modalne.

## Weryfikacja

Sprawdzaj kolejność wypowiedzi, widoczność odpowiedzi dopiero na końcu, zamykanie i ponowne otwieranie rozmów oraz poprawne wskazanie postaci. Na telefonie sprawdzaj, czy dymek pozostaje czytelny i mieści się w kontenerze po zmianie orientacji.
