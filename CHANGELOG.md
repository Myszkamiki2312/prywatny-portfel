# Changelog

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
