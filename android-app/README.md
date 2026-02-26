# Prywatny Portfel Mobile (Android)

To jest osobny projekt Android, który opakowuje istniejącą aplikację web i backend.
Desktopowa aplikacja pozostaje bez zmian.

## Wymagania

- Android Studio (Hedgehog+)
- Android SDK 34
- JDK 17
- Działający backend `Prywatny Portfel`

## Uruchomienie backendu

Na komputerze uruchom backend:

```bash
python3 -m backend.server --host 0.0.0.0 --port 8080
```

## Uruchomienie Android app

1. Otwórz w Android Studio folder: `android-app`.
2. Poczekaj na synchronizację Gradle.
3. Odpal apkę na emulatorze lub telefonie.

## Adres backendu

- Emulator Android: domyślnie działa `http://10.0.2.2:8080`
- Fizyczny telefon: ustaw adres komputera w LAN, np. `http://192.168.1.120:8080`
  - w aplikacji kliknij `Backend URL` i zapisz adres

## Co daje to podejście

- Te same funkcje co desktop/web (to ten sam frontend i API)
- Obsługa uploadu plików z formularzy web (`input type=file`)
- Pull-to-refresh i status online/offline backendu
