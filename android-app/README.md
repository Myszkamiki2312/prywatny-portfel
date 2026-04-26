# Prywatny Portfel Mobile (Android, offline-first)

To jest osobny projekt Android, który uruchamia lokalny backend API bezpośrednio w telefonie.
Desktopowa aplikacja pozostaje bez zmian.

## Wymagania

- Android Studio (Hedgehog+)
- Android SDK 34
- JDK 17

## Uruchomienie APK / projektu

1. Otwórz w Android Studio folder: `android-app`.
2. Poczekaj na synchronizację Gradle.
3. Uruchom aplikację na emulatorze lub telefonie.

Nie jest wymagany backend na komputerze.

## Jak to działa

- Frontend (`index.html`, `styles.css`, `app.js`, `frontend/*`) jest kopiowany do assets APK przy buildzie.
- W aplikacji działa lokalny serwer HTTP (`127.0.0.1:18765`).
- Endpointy `/api/*` są obsługiwane przez lokalny backend Kotlin + Room (SQLite).
- Dane użytkownika są trwale zapisywane w bazie na telefonie.

## Status parity

Ten etap daje fundament pełnego offline:

- trwały stan portfela (`/api/state`),
- metryki, raporty bazowe, notowania cache,
- konfiguracje realtime/backup/notifications,
- healthcheck, monitoring, logi błędów,
- API tools z bezpiecznymi fallbackami.

Kolejne iteracje domykają parity 1:1 dla zaawansowanych narzędzi.
