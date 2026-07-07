# Möhrchenmampf

Ein fröhliches Snake-ähnliches 2D-Spiel für den Browser und später als PWA für den Microsoft Store.

## Lokal starten

Am einfachsten startest du im Projektordner einen kleinen lokalen Webserver:

```powershell
python -m http.server 8080
```

Danach im Browser öffnen:

```text
http://localhost:8080
```

Alternativ kannst du in Visual Studio Code die Erweiterung "Live Server" verwenden und `index.html` damit starten.

## Steuerung

- Pfeiltasten oder WASD
- Auf kleinen Bildschirmen die Richtungstasten unter dem Spielfeld

## Dateien

- `index.html`: Spieloberfläche
- `styles.css`: Gestaltung
- `game.js`: Spiellogik und Level
- `manifest.json`: PWA-Informationen
- `service-worker.js`: Offline-Cache für die PWA
- `assets/icons/icon.svg`: App-Icon

## Microsoft Store

Für den Store-Weg:

1. Spiel online mit HTTPS bereitstellen, zum Beispiel über GitHub Pages.
2. Die URL bei <https://www.pwabuilder.com/> eintragen.
3. Windows-Paket erzeugen lassen.
4. Im Microsoft Partner Center einen App-Namen reservieren und das Paket hochladen.

Vor der Einreichung sollten noch PNG-Icons und Store-Screenshots ergänzt werden.

## GitHub Pages

Der Workflow `.github/workflows/pages.yml` veröffentlicht das Spiel automatisch bei GitHub Pages, sobald Änderungen auf `main` hochgeladen werden.

Nach dem ersten Lauf ist die Spiel-URL voraussichtlich:

```text
https://selena85hh.github.io/Moehrchenmampf/
```

Wichtig: Der Workflow funktioniert erst, wenn GitHub Pages im Repository aktiviert ist. Im Repository unter `Settings` -> `Pages` bei `Build and deployment` als Quelle `GitHub Actions` auswählen. Danach den Workflow erneut starten oder eine neue Änderung auf `main` hochladen.

## Aktueller Paketstand

Das Projekt ist als PWA vorbereitet und enthält PNG-Icons für PWABuilder:

- `assets/icons/icon-192.png`
- `assets/icons/icon-512.png`

Zum Hochladen bei einem Webhoster gibt es ein ZIP:

- `Moehrchenmampf-web-pwa-v15.zip`

Wichtig: Dieses ZIP ist noch kein Microsoft-Store-Paket. Es wird zuerst online gehostet. Danach erzeugt PWABuilder daraus das Windows-Paket (`.msix` oder `.appxupload`) für das Partner Center.
