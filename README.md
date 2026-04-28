
## Android APK (pobieranie)

Aplikacja mobilna jest w katalogu:

- `/Users/bartlomiejprzybycien/Documents/New project/android-app`

Automatyczny build APK działa w GitHub Actions (`Android APK`):

- po pushu zmian do `android-app/` dostajesz artefakt `prywatny-portfel-mobile-apk`,
- po wypchnięciu taga `android-v...` workflow tworzy GitHub Release z plikiem `prywatny-portfel-mobile.apk` (publiczny download).

Android app działa jako `offline-first`: backend API uruchamia się lokalnie w telefonie (Room/SQLite), bez wymogu uruchamiania backendu na komputerze.

Przykład publikacji APK jako release:

```bash
git tag android-v1.0.0
git push origin android-v1.0.0
```

## Desktop EXE (Windows)

Desktop build jest publikowany z GitHub Actions (`Desktop Windows`).

- artifact po pushu: `prywatny-portfel-desktop-windows`
- release asset po tagu `v...`:
  - `prywatny-portfel-desktop.exe`
  - `prywatny-portfel-desktop-win.zip`
  - `prywatny-portfel-desktop.msi`

Przyklad publikacji desktop release:

```bash
git tag v0.6.1
git push origin v0.6.1
```

Windows `.exe` uruchamia lokalny backend i na Windows domyślnie otwiera aplikacje w przeglądarce z małym oknem sterującym, co jest odporniejsze od problemów z osadzonym webview. Dane aplikacji sa trzymane w katalogu użytkownika, a nie w folderze tymczasowym bundla.
`MSI` instaluje ten sam launcher jako normalna aplikacja Windows dla bieżącego użytkownika, bez potrzeby ręcznego rozpakowywania.

## Chmura Supabase

Desktop ma teraz tryb synchronizacji chmurowej:

- konfiguracja projektu Supabase jest w `supabase-config.js`,
- schemat bazy i polityki RLS są w `docs/supabase-schema.sql`,
- po zalogowaniu aplikacja zapisuje stan portfela do tabeli `app_states`,
- lokalny backend nadal obsługuje notowania, importery, raporty i narzędzia eksperckie.

W Supabase SQL Editor odpal:

```sql
-- zawartość pliku docs/supabase-schema.sql
```

W Authentication ustaw:

- `Allow new users to sign up`: ON,
- `Email`: Enabled,
- `Confirm email`: ON, jeśli nowe konta mają wymagać aktywacji z maila,
- w `URL Configuration` dodaj Redirect URL:
  - `https://myszkamiki2312.github.io/prywatny-portfel/confirm-email.html`,
  - `https://myszkamiki2312.github.io/prywatny-portfel/reset-password.html`.

Aktywacja nowych kont:

- stare, już działające konta logują się normalnie,
- nowe konto po rejestracji dostaje mail Supabase z linkiem do `confirm-email.html`,
- po aktywacji użytkownik wraca do aplikacji i loguje się swoim hasłem,
- jeśli link wygasł, kliknij w aplikacji `Wyślij ponownie mail potwierdzający`.

Reset hasła:

- w oknie logowania kliknij `Nie pamiętasz hasła?`,
- aplikacja wyśle mail Supabase z linkiem do `reset-password.html`,
- użytkownik ustawia nowe hasło na stronie i wraca do aplikacji.

Jeśli Gmail lub przeglądarka pokazuje `otp_expired`, wyślij reset jeszcze raz i kliknij najnowszy mail. Linki resetujące są jednorazowe i szybko wygasają.

## Cloud backend

Backend Python można uruchomić lokalnie albo w chmurze.

Najbezpieczniejszy układ dla tej aplikacji:

- Supabase trzyma prywatne dane portfela per użytkownik,
- backend w chmurze obsługuje notowania, importery, raporty i narzędzia,
- frontend wskazuje zdalny backend przez `supabase-config.js`.

Konfiguracja frontendu:

```js
window.PRIVATE_PORTFOLIO_BACKEND = {
  apiBase: "https://twoj-backend.example.com/api",
  apiToken: "TEN_SAM_TOKEN_CO_W_BACKENDZIE"
};
```

Jeśli `apiBase` zostanie puste, desktop działa po staremu przez lokalne `/api`.

Backend może wymagać tokenu:

```bash
export PRYWATNY_PORTFEL_API_TOKEN="dlugi-losowy-token"
python3 -m backend.server --host 0.0.0.0 --port 8080
```

Deploy Docker:

```bash
docker build -t prywatny-portfel-backend .
docker run --rm -p 8080:8080 \
  -e PRYWATNY_PORTFEL_API_TOKEN="dlugi-losowy-token" \
  -v prywatny-portfel-data:/data \
  prywatny-portfel-backend
```

Pliki `Dockerfile` i `render.yaml` są przygotowane pod hosting typu Render/Railway/Fly/VPS.

Uwaga: nie wystawiaj publicznego backendu bez `PRYWATNY_PORTFEL_API_TOKEN`, bo endpointy API są silnikiem aplikacji i nie powinny być otwarte dla przypadkowych osób.

## Testy

Uruchom testy backendu:

```bash
python3 -m unittest discover -s tests -p "test_*.py" -v
```

Uruchom testy frontendowe (flow edycji CRUD):

```bash
node --test frontend_tests/*.test.js
```

## Co zawiera aplikacja

- pełną matrycę funkcji (operacje, raporty, narzędzia, portfele) z widokiem planów `Brak/Basic/Standard/Pro/Expert`,
- portfele, konta, walory, operacje (w tym konwersje, prowizje, dywidendy),
- import operacji z CSV i z wklejonej treści maila,
- operacje cykliczne i generator zaległych wpisów,
- raporty z selektorem (struktura, zysk, drawdown, rolling return, historia operacji, podsumowania),
- alerty cenowe, notatki, strategie, moduł zobowiązań, kalkulator podatkowy,
- backend `Python + SQLite` z endpointami `/api/state`, `/api/quotes`, `/api/import/broker/*`, `/api/scanner`,
- raporty i metryki backendowe: `/api/reports/catalog`, `/api/reports/generate`, `/api/metrics/portfolio`,
- narzędzia eksperckie API: `/api/tools/scanner`, `/api/tools/signals`, `/api/tools/calendar`, `/api/tools/recommendations`, `/api/tools/alerts/*`,
- parity narzędzia API:
  - `/api/tools/charts/candles`
  - `/api/tools/charts/tradingview`
  - `/api/tools/catalyst`
  - `/api/tools/funds/ranking`
  - `/api/tools/espi`
  - `/api/tools/tax/optimize`
  - `/api/tools/tax/foreign-dividend`
  - `/api/tools/tax/crypto`
  - `/api/tools/tax/foreign-interest`
  - `/api/tools/tax/bond-interest`
  - `/api/tools/forum` + `/api/tools/forum/post/*`
  - `/api/tools/options/exercise-price`
  - `/api/tools/options/positions`
  - `/api/tools/model-portfolio`
  - `/api/tools/model-portfolio/compare`
  - `/api/tools/public-portfolios`
  - `/api/tools/public-portfolios/clone`
- realtime API: `/api/tools/realtime/*` + webhook `/api/tools/alerts/webhook?token=...`,
- backup i monitoring API:
  - `/api/tools/backup/config`
  - `/api/tools/backup/run`
  - `/api/tools/backup/verify`
  - `/api/tools/backup/runs`
  - `/api/tools/monitoring/status`
- powiadomienia API: `/api/tools/notifications/config`, `/api/tools/notifications/test`, `/api/tools/notifications/history`,
- notowania rynkowe z Yahoo (fallback Stooq), synchronizacja cen walorów oraz dzienne serie benchmarków dla raportu porównawczego,
- warstwa jakości danych notowań: retry/backoff, cache TTL w pamięci procesu, fallback do cache DB przy awarii feedu oraz metadane świeżości (`stale`, `ageSeconds`, `source`) w API notowań,
- import brokerów `generic`, `xtb`, `mbank`, `degiro`, `ibkr`, `bossa` (CSV) z logami importu,
- backup danych (eksport/import JSON),
- tryb hybrydowy: lokalne `localStorage` + automatyczna synchronizacja z backendem, gdy serwer jest online.

## Struktura

- `/Users/bartlomiejprzybycien/Documents/New project/backend/server.py` - HTTP API + serwowanie frontendu,
- `/Users/bartlomiejprzybycien/Documents/New project/backend/database.py` - warstwa SQLite,
- `/Users/bartlomiejprzybycien/Documents/New project/backend/quotes.py` - provider notowań,
- `/Users/bartlomiejprzybycien/Documents/New project/backend/importers.py` - importery brokerów,
- `/Users/bartlomiejprzybycien/Documents/New project/backend/expert_tools.py` - skaner/sygnały/kalendarium/rekomendacje/workflow alertów,
- `/Users/bartlomiejprzybycien/Documents/New project/backend/realtime.py` - cron runner i webhook/manual workflow,
- `/Users/bartlomiejprzybycien/Documents/New project/backend/notifications.py` - powiadomienia e-mail/Telegram,
- `/Users/bartlomiejprzybycien/Documents/New project/app.js` - frontend i synchronizacja z API.

## Realtime setup

1. Wejdź do zakładki `Narzędzia`.
2. W sekcji `Realtime (cron + webhook)` ustaw:
   - `Cron aktywny`,
   - `Interwał`,
   - opcjonalnie `Sekret webhook`.
3. W sekcji `Powiadomienia` skonfiguruj kanały:
   - SMTP (email),
   - Telegram (bot token + chat ID).
4. Użyj:
   - `Uruchom teraz` do ręcznego przebiegu,
   - `Test powiadomienia` do testu kanałów.

Przykład webhook:

```bash
curl -X POST "http://localhost:8080/api/tools/alerts/webhook?token=YOUR_SECRET"
```

## Backup i monitoring

Panel UI w zakładce `Narzędzia` umożliwia:
- zapis konfiguracji backupu (interwał, retencja, verify),
- ręczne uruchomienie backupu,
- ręczny restore-check,
- podgląd historii backupów,
- podgląd statusu monitoringu (świeżość notowań, status realtime/backup).

Konfiguracja backupu (np. co 12h, retencja, verify-after-backup):

```bash
curl -X PUT "http://localhost:8080/api/tools/backup/config" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "intervalMinutes": 720, "keepLast": 30, "verifyAfterBackup": true, "includeStateJson": true, "includeDbCopy": true}'
```

Ręczny backup:

```bash
curl -X POST "http://localhost:8080/api/tools/backup/run" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Status monitoringu:

```bash
curl "http://localhost:8080/api/tools/monitoring/status"
```

## Uwagi

- Aplikacja jest celowo przygotowana pod użycie osobiste.
- Notowania są bezpłatne i mogą być opóźnione/niedokładne względem płatnych feedów realtime.
- Dla bezpieczeństwa regularnie wykonuj eksport kopii JSON.
