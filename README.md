# MyFund Solo

Lokalna aplikacja inwestycyjna dla 1 użytkownika, inspirowana zakresem funkcji myfund.pl.

## Uruchomienie

1. Wejdź do katalogu projektu:
   - `/Users/bartlomiejprzybycien/Documents/New project`
2. Uruchom backend (serwuje także frontend):
   - `python3 -m backend.server --host 127.0.0.1 --port 8080`
3. Otwórz w przeglądarce:
   - `http://localhost:8080`

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
- powiadomienia API: `/api/tools/notifications/config`, `/api/tools/notifications/test`, `/api/tools/notifications/history`,
- notowania rynkowe z Yahoo (fallback Stooq) i synchronizacja cen walorów,
- import brokerów `generic`, `xtb`, `mbank` (CSV) z logami importu,
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

## Uwagi

- Aplikacja jest celowo przygotowana pod użycie osobiste.
- Notowania są bezpłatne i mogą być opóźnione/niedokładne względem płatnych feedów realtime.
- Dla bezpieczeństwa regularnie wykonuj eksport kopii JSON.
