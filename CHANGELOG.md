# Changelog

## v0.8.0 - 2026-09-12

### Security
- Wymuszona `Content-Security-Policy` na hostowanej wersji (`script-src 'self'`) — sprawdzone wcześniej, że aplikacja nie ma żadnych inline'owych skryptów, handlerów ani `eval`.
- Limity zapytań na nieuwierzytelnionym API: `/api/quotes/refresh` 10/min, `/api/reports/generate` 30/min, pozostałe `/api/` 120/min.
- `.env*` trafiło do `.gitignore`, żeby lokalne poświadczenia Vercela nie wchodziły do repozytorium.
- Kopie ratunkowe `*.backup` przestały być śledzone przez git.

### Fixed
- Notowania: podpowiedź waluty nie ginie już przy przejściu na Stooq, więc walory z GPW nie są wyceniane w dolarach.
- Jeden nieudany endpoint nie wyłącza już całego backendu — flaga dostępności reaguje tylko na brak odpowiedzi serwera, nie na błąd pojedynczego żądania (poprawione w 11 miejscach).
- Telefon wycenia portfel w walucie bazowej. Wcześniej 100 USD i 100 PLN pokazywało „200" zamiast około 510 zł.
- Telefon wycenia pozycje opcyjne z liczbą kontraktów i mnożnikiem — poprzednio mnożnik 1 zamiast 100 dawał błąd stukrotny.
- Podatki na telefonie liczą się przez wspólny moduł, a nie przez drugą kopię — zniknęło osiem rozbieżności z serwerem (zaszyta stawka krypto, ignorowany limit traktatowy, brakujące domyślne stawki dające 0%, brak ATM, zaślepka optymalizatora).
- Nieobsługiwane ścieżki `/tools/*` w trybie offline nie odpowiadają już blankietowym 200 z pustą treścią.
- Import brokerski przyjmuje eksporty z preambułą przed nagłówkiem (DEGIRO, IBKR) oraz pliki z polskim nagłówkiem `Rodzaj`.
- Prowizja jest zapisywana jako wartość bezwzględna. Eksport XTB z `-0,80` **dopisywał** 80 groszy do wyniku zamiast odejmować; to samo dotyczyło importu uniwersalnego i mBanku.
- Przełącznik motywów znów działa. Doklejona skórka nadpisywała `body[data-theme]` bezwarunkowo, więc ekran wyglądu nie zmieniał ani jednego piksela.
- Nagłówek na telefonie i tablecie nie nachodzi już na treść. Skórka ustawiała `.topbar { height: 64px }`, a media query resetowało tylko `position`, nigdy wysokość.
- Telefon i web renderują ten sam wygląd. Synchronizacja zasobów Androida kopiowała dwa z trzech arkuszy stylów.
- Build Windows nie pakuje już arkusza, którego nie ma w repozytorium.

### Added
- Instalowalna powłoka PWA i przebieg dostępnościowy.
- Moduł `:tax` — czysty JVM, testowalny bez Android SDK, trzyma obliczenia podatkowe i opcyjne wspólne z backendem.
- Moduł `:importers` — czysty JVM, port maperów CSV sześciu brokerów pole po polu z `backend/importers.py`.
- Motyw `xtb` jako domyślny wygląd, zdefiniowany w systemie zmiennych zamiast w osobnym arkuszu.
- Wspólne fixtures czytane przez testy Pythona, JS i Kotlina: `tax-spec.json`, `fx-spec.json`, `ticker-alias-spec.json`, `importer-spec.json`.
- Pośredni breakpoint tabletowy.
- Strażnicy list plików utrzymywanych ręcznie: precache w `sw.js`, lista kopiowania Pages, `datas` w `desktop_launcher.spec` oraz zgodność numeru wersji między changelogiem a buildem desktopowym.

### Changed
- Trzy arkusze stylów scalone w jeden; `!important` z 115 do 10, a pozostałe to `prefers-reduced-motion` i dwa `display: none`.
- Sześć nakładających się breakpointów w trzech plikach zredukowane do czterech, uporządkowanych.
- `app.js` z 11 193 do około 9 300 linii — wydzielone moduły `reports`, `taxes`, `charts`, `metrics`.
- Offline'owe repozytorium Androida z 2 152 do około 1 840 linii; obliczenia delegowane do wspólnych modułów.
- `sw.js` podniesione do `v4`, żeby klient z poprzednim cache nie serwował dalej skasowanych arkuszy.
- Produkcja na Vercelu wdraża się ponownie przy każdym pushu (połączenie git było zerwane, produkcja stała na commicie z 21 czerwca).

### Notes
- Między `v0.7.11` a tym wpisem jest piętnaście commitów, które nigdy nie zostały opisane (notowania, wdrożenie serwerless na Vercelu, pierwsza wersja ciemnej skórki). Ten wpis ich nie rekonstruuje — nie zgaduję, co dokładnie obiecywały.

### Stability
- Zweryfikowane lokalnie:
  - `python3 -m unittest discover -s tests -p 'test_*.py'` (121 testów),
  - `node --test frontend_tests/*.test.js` (49 testów),
  - `./gradlew :tax:test :importers:test` (10 testów),
  - `./gradlew :app:compileDebugKotlin --rerun-tasks`,
  - zrzuty headless Chrome na 1440, 834 i 390 px przed i po zmianie stylów,
  - testy mutacyjne: usunięcie `abs()` z prowizji XTB oraz przywrócenie starej normalizacji kluczy czerwienią wspólny spec importu.
- CI zielone: `Tests`, `Android APK`, `Desktop Windows`, `GitHub Pages`.

## v0.7.11 - 2026-05-04

### Fixed
- Kokpit nie pokazuje już pustego kontenera wykresu, gdy wykres `LightweightCharts` nie narysuje serii danych.
- Główny wykres portfela ma stabilny fallback canvasowy z tooltipem, zoomem i eksportem PNG.
- Canvas wykresu nie jest już ukrywany na sztywno przez styl `styles-modern.css`.

### Added
- Kokpit pokazuje sekcję `Największe plusy/minusy`, żeby od razu było widać, które walory robią zysk albo stratę.

### Stability
- Zweryfikowane lokalnie:
  - `node --check app.js`,
  - `node --check frontend/dashboard.js`,
  - `node --check js/charts-pro.js`,
  - `python3 -m unittest discover -s tests -p 'test_*.py' -v`,
  - `git diff --check`.

## v0.7.10 - 2026-05-04

### Fixed
- Po imporcie brokera aplikacja automatycznie odświeża notowania, zanim pokaże finalny komunikat importu.
- P/L po imporcie nie zostaje na fallbacku z ostatniej ceny zakupu, jeśli backend może pobrać aktualne ceny.
- Komunikat importu pokazuje także liczbę odświeżonych notowań.

### Stability
- Zweryfikowane lokalnie:
  - `node --check app.js`,
  - `python3 -m unittest discover -s tests -p 'test_*.py' -v`,
  - `git diff --check`.

## v0.7.9 - 2026-05-04

### Fixed
- Odświeżanie notowań dla polskich tickerów z eksportu XTB/IKE (`CDR.PL`, `KGH.PL`, `LPP.PL`) pobiera ceny ze Stooq przez symbol bazowy (`CDR`, `KGH`, `LPP`).
- Ceny pobrane przez alias Stooq dalej wracają pod oryginalnym tickerem z aplikacji, więc walory nie są dublowane.
- Waluta dla tickerów `.PL`/`.WA` pozostaje `PLN`, dzięki czemu zysk/strata po imporcie liczy się w złotówkach.

### Stability
- Zweryfikowane lokalnie:
  - realne pobranie notowań `CDR.PL`, `KGH.PL`, `LPP.PL`,
  - `python3 -m unittest discover -s tests -p 'test_*.py' -v`,
  - `node --check app.js`,
  - `node --check frontend/dashboard.js`,
  - `node --check frontend/operations.js`,
  - `node --check frontend/tools.js`,
  - `node --check js/charts-pro.js`,
  - `git diff --check`.

## v0.7.8 - 2026-05-04

### Fixed
- Import XTB/IKE CSV obsługuje pliki z metadanymi przed właściwym nagłówkiem.
- Import XTB/IKE rozpoznaje `Stock purchase`, `Stock sale`, `IKE deposit` i `Free funds interest`.
- Ilość i cena dla transakcji XTB/IKE są pobierane z komentarza w formacie `OPEN BUY 1 @ 241.50`.
- Wiersz `Total` z eksportu brokera jest pomijany zamiast trafiać do operacji.
- Import tworzy walory z nazwą instrumentu, typem `Akcja` i walutą z operacji.

### Stability
- Zweryfikowane lokalnie:
  - `python3 -m unittest tests.test_importers_ibkr_bossa -v`
  - test importu realnego pliku `IKE_54019595_2025-02-02_2026-04-29.csv`
  - `python3 -m unittest discover -s tests -p 'test_*.py' -v`
  - `node --check app.js`
  - `node --check frontend/dashboard.js`
  - `node --check frontend/operations.js`

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
