# Changelog

## v0.7.7 - 2026-04-29

### Fixed
- Import kopii JSON przyjmuje backupi z poprzednich wersji oraz raw stan aplikacji.
- Import CSV obsługuje polskie nagłówki, BOM, cytowane pola, różne separatory, daty `dd.mm.yyyy` i kwoty `1.234,56`.
- Import brokerów odrzuca pliki bez wymaganych nagłówków zamiast tworzyć puste operacje.
- Backend poprawnie parsuje liczby z separatorami tysięcy i przecinkiem dziesiętnym.
- Transakcja `replace_state` robi rollback po błędzie, więc nie zostawia bazy w częściowo skasowanym stanie.
- Szybkie kolejne zapisy do backendu/Supabase nie gubią ostatniej zmiany.
- Logowanie do Supabase nie nadpisuje po cichu lokalnych danych starszą chmurą.
- Wygasły token Supabase odświeża się przez refresh token i ponawia request.
- Linki ESPI akceptują tylko `http/https`, a niezaufany CDN wykresów został usunięty.
- GitHub Pages, Windows build i Android asset sync zawierają brakujące pliki `styles-modern.css` oraz `js/**`.

### Stability
- Zweryfikowane lokalnie:
  - `python3 -m unittest discover tests`
  - `node --check app.js`
  - `node --check frontend/dashboard.js`
  - `node --check frontend/operations.js`
  - `node --check frontend/tools.js`
  - `node --check js/charts-pro.js`
  - `node --test frontend_tests/*.test.js`
  - `git diff --check`

## v0.7.6 - 2026-04-27

### Added
- Strona `confirm-email.html` do aktywacji nowych kont z linku Supabase.
- Osobny `confirmRedirectUrl` w konfiguracji Supabase.

### Changed
- Rejestracja i ponowne wysłanie maila potwierdzającego używają poprawnego `redirect_to`.
- Stare konta logują się normalnie, a nowe mogą wymagać potwierdzenia e-mail po włączeniu `Confirm email` w Supabase.
- GitHub Pages publikuje teraz także stronę aktywacji konta.

### Stability
- Zweryfikowane lokalnie:
  - `node --check app.js`
  - `node --check frontend/dashboard.js`
  - `node --check frontend/operations.js`
  - `for test in frontend_tests/*.test.js; do node "$test"; done`
  - `python3 -m unittest discover -s tests -p 'test_*.py' -v`

## v0.7.5 - 2026-04-27

### Added
- Strona `reset-password.html` do ustawienia nowego hasła z linku Supabase.
- Przycisk `Nie pamiętasz hasła?` w oknie logowania.
- GitHub Pages workflow publikujący stronę resetu.

### Changed
- Reset hasła wysyła mail Supabase z poprawnym `redirect_to`.
- Dokumentacja Supabase opisuje wymagany Redirect URL.

### Stability
- Zweryfikowane lokalnie:
  - `node --check app.js`
  - `node --check frontend/dashboard.js`
  - `node --check frontend/operations.js`
  - `for test in frontend_tests/*.test.js; do node "$test"; done`
  - `python3 -m unittest discover -s tests -p 'test_*.py' -v`

## v0.7.4 - 2026-04-26

### Changed
- Uproszczono desktopowy interfejs pod codzienne używanie:
  - ukryto techniczny katalog narzędzi z tabelą `Narzędzie / Status`,
  - dodano kafelkowy wybór raportów: Portfel, Zysk, Ryzyko, Podatki, Dywidendy,
  - dodano mini onboarding: Dodaj konto -> Dodaj walor -> Dodaj operację.
- Formularz operacji dostał szybką kartę dodania waloru przy kupnie, gdy nie ma jeszcze żadnych walorów.
- Zmiana ceny waloru używa teraz modala zamiast systemowego `prompt`.
- Odświeżanie notowań pokazuje stan `Odświeżam...` i czytelne komunikaty toast.

### Stability
- Zweryfikowane lokalnie:
  - `node --check app.js`
  - `node --check frontend/dashboard.js`
  - `node --check frontend/operations.js`
  - `for test in frontend_tests/*.test.js; do node "$test"; done`
  - `python3 -m unittest discover -s tests -p 'test_*.py' -v`

## v0.6.5 - 2026-02-24

### Added
- Panel UI dla backupu i monitoringu w zakładce `Narzędzia`:
  - formularz konfiguracji backupu,
  - akcje `Backup teraz` i `Sprawdź restore`,
  - tabela historii backupów,
  - status monitoringu systemu.

### Changed
- Frontend automatycznie pobiera i odświeża:
  - `/api/tools/backup/config`,
  - `/api/tools/backup/runs`,
  - `/api/tools/monitoring/status`.
- Dokumentacja UI backup/monitoringu rozszerzona w `/Users/bartlomiejprzybycien/Documents/New project/README.md`.

### Stability
- Zweryfikowane lokalnie:
  - `python3 -m unittest discover -s /Users/bartlomiejprzybycien/Documents/New project/tests -p "test_*.py" -v`
  - `node --test /Users/bartlomiejprzybycien/Documents/New project/frontend_tests/*.test.js`

## v0.6.4 - 2026-02-24

### Added
- Moduł backupu i restore-check:
  - `/Users/bartlomiejprzybycien/Documents/New project/backend/backup.py`
- Endpointy API:
  - `GET/PUT /api/tools/backup/config`
  - `POST /api/tools/backup/run`
  - `POST /api/tools/backup/verify`
  - `GET /api/tools/backup/runs`
  - `GET /api/tools/monitoring/status`
- Nowe testy:
  - `/Users/bartlomiejprzybycien/Documents/New project/tests/test_backup_monitoring.py`

### Changed
- `RealtimeRunner` wykonuje teraz backup automatyczny w tle, zgodnie z konfiguracją interwału.
- `Database` ma konfigurację backupu i logi uruchomień backup/verify (`backup_runs`) oraz snapshot SQLite (`backup_to_file`).
- Dokumentacja backupu/monitoringu rozszerzona w `/Users/bartlomiejprzybycien/Documents/New project/README.md`.

### Stability
- Zweryfikowane lokalnie:
  - `python3 -m unittest discover -s /Users/bartlomiejprzybycien/Documents/New project/tests -p "test_*.py" -v`
  - `node --test /Users/bartlomiejprzybycien/Documents/New project/frontend_tests/*.test.js`

## v0.6.3 - 2026-02-24

### Added
- Testy end-to-end workflow API:
  - `/Users/bartlomiejprzybycien/Documents/New project/tests/test_e2e_workflows.py`
- Pokryte scenariusze:
  - import brokera `IBKR` -> odświeżenie notowań -> raport + metryki,
  - import brokera `BOSSA` -> log importu -> raport historii operacji.

### Stability
- Zweryfikowane lokalnie:
  - `python3 -m unittest discover -s /Users/bartlomiejprzybycien/Documents/New project/tests -p "test_*.py" -v`
  - `node --test /Users/bartlomiejprzybycien/Documents/New project/frontend_tests/*.test.js`

## v0.6.2 - 2026-02-24

### Added
- Nowe importery brokerów:
  - `Interactive Brokers (IBKR)`
  - `BOSSA`
- Testy importerów:
  - `/Users/bartlomiejprzybycien/Documents/New project/tests/test_importers_ibkr_bossa.py`

### Changed
- UI importu brokerów pobiera teraz listę brokerów z backendu (`/api/import/brokers`) i automatycznie aktualizuje `select`.
- Statyczna lista fallback w UI rozszerzona o `DEGIRO`, `IBKR`, `BOSSA`.
- Dokumentacja importów brokerów rozszerzona w `/Users/bartlomiejprzybycien/Documents/New project/README.md`.

### Stability
- Zweryfikowane lokalnie:
  - `python3 -m unittest discover -s /Users/bartlomiejprzybycien/Documents/New project/tests -p "test_*.py" -v`
  - `node --test /Users/bartlomiejprzybycien/Documents/New project/frontend_tests/*.test.js`

## v0.6.1 - 2026-02-24

### Added
- Testy jakości feedu notowań:
  - `/Users/bartlomiejprzybycien/Documents/New project/tests/test_quote_quality.py`
- Test endpointu fallback notowań:
  - `/Users/bartlomiejprzybycien/Documents/New project/tests/test_api_endpoints.py` (`QuoteEndpointTests`)

### Changed
- `QuoteService` ma teraz:
  - retry + exponential backoff dla requestów HTTP,
  - cache TTL dla notowań i historii benchmarków,
  - fallback do pamięci podręcznej przy krótkich awariach providerów.
- `/api/quotes` i `/api/quotes/refresh` zwracają metadane jakości (`stale`, `ageSeconds`, `source`).
- `/api/quotes/refresh` ma fallback do notowań z DB dla brakujących tickerów i podaje statystyki (`resolved`, `updated`, `fallbackUsed`, `missing`).

### Stability
- Zweryfikowane lokalnie:
  - `python3 -m unittest discover -s /Users/bartlomiejprzybycien/Documents/New project/tests -p "test_*.py" -v`
  - `node --test /Users/bartlomiejprzybycien/Documents/New project/frontend_tests/*.test.js`

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
