# Changelog

## v0.6.0 - 2026-02-24

### Added
- Realny feed benchmarków dziennych (Stooq) dla raportu `Stopa zwrotu w czasie i benchmark`.
- Obsługa importera brokera `DEGIRO` (CSV) z mapowaniem kupna/sprzedaży, ilości i kwot.
- Testy backendowe:
  - `/Users/bartlomiejprzybycien/Documents/New project/tests/test_reports_benchmark_feed.py`
  - `/Users/bartlomiejprzybycien/Documents/New project/tests/test_importer_degiro.py`

### Changed
- `ReportService` wspiera teraz provider historii benchmarku i oznacza źródło danych (`market-data`/`proxy`).
- Backend przekazuje feed benchmarków przez `QuoteService.fetch_daily_history`.
- Dokumentacja funkcji importu brokerów i benchmarku w `/Users/bartlomiejprzybycien/Documents/New project/README.md`.

### Stability
- Zweryfikowane lokalnie:
  - `python3 -m unittest discover -s /Users/bartlomiejprzybycien/Documents/New project/tests -p "test_*.py" -v`
  - `node --test /Users/bartlomiejprzybycien/Documents/New project/frontend_tests/*.test.js`

## v0.5.0 - 2026-02-24

### Added
- Pełny tryb edycji (`Edytuj` / `Zapisz` / `Anuluj`) dla:
  - portfeli,
  - kont,
  - walorów,
  - operacji,
  - operacji cyklicznych,
  - alertów,
  - zobowiązań.
- Testy frontendowe `node:test` dla krytycznych flow edycji i regresji delete-while-editing:
  - `/Users/bartlomiejprzybycien/Documents/New project/frontend_tests/edit-flows.test.js`

### Changed
- Workflow CI uruchamia teraz:
  - testy backendu (`python -m unittest ...`),
  - testy frontendu (`node --test frontend_tests/*.test.js`).
- Rozszerzona dokumentacja uruchamiania testów w `/Users/bartlomiejprzybycien/Documents/New project/README.md`.

### Stability
- Zweryfikowane lokalnie:
  - `node --check /Users/bartlomiejprzybycien/Documents/New project/app.js`
  - `python3 -m unittest discover -s /Users/bartlomiejprzybycien/Documents/New project/tests -p "test_*.py"`
  - `node --test /Users/bartlomiejprzybycien/Documents/New project/frontend_tests/*.test.js`
