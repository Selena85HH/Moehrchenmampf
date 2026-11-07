# Möhrchenmampf

Ein fröhliches Snake-ähnliches 2D-Spiel für den Browser und später als PWA für den Microsoft Store.

## Version 42: Deine Gartenreise

- Zehn auswählbare Gärten in zwei Welten; geschaffte Level bleiben freigeschaltet.
- Gemeinsame Gartenpunkte für Level- und Endlosspiel. Punkte bleiben auch nach Niederlagen erhalten.
- Sieben Punktebelohnungen und fünf besondere Auszeichnungen: Fell, Accessoire, Spur und Begleiter lassen sich kombinieren.
- Drei dauerhafte Abzeichen je Level: Abschluss, eine Goldmöhre, drei Goldmöhren in einem Versuch. Alle 15 Welt-Abzeichen schalten einen Umhang frei.
- Goldmöhren erscheinen im Level nach 2, 5, 8 … normalen Möhren, verschwinden dort nicht und bringen je fünf Gartenpunkte.
- Endlos-Ereignisse alle zehn Möhren mit freiwilligen Goldmöhren (60 Spielschritte Zeit). Die Uhr stoppt in der Pause. Einmalige Meilensteine bei 20, 40 und 60 Möhren.
- Waldlevel mit angekündigten Gartenpforten und paarweise verbundenen Hasengängen.
- Animierte Ohren, Blinzeln, Sammelreaktionen und sichtbare Ausrüstung; reduzierte Bewegung wird berücksichtigt.

Gartenkarte und Sammlung öffnen sich über dem pausierten Spiel. Im lokalen Duell bleiben die beiden Häschen unterscheidbar; Gartenpunkte werden im Einzelspiel verdient.

Der Fortschritt gilt für dieses Gerät und diesen Browser und wird unter `moehrchenmampf-garden-v1` gespeichert, ergänzt durch die letzte gültige Sicherung. Bisherige Einstellungen und Highscores bleiben erhalten. Bei fehlgeschlagenem Speichern erscheint eine Warnung. Das Löschen der Browserdaten löscht auch den lokalen Fortschritt; es gibt keine Cloud-Synchronisierung.

Neue Dateien: `progression.js` verwaltet Spielstände und Belohnungen, `adventure.js` die neuen Spielmechaniken und Grafiken, `garden-ui.js` Karte und Sammlung. Für die aktuelle Veröffentlichung die Quelldateien verwenden; das vorhandene v15-ZIP ist ein älterer Stand.

## Version 41

- Neuer Garten-Look mit ruhigeren Farben, Spielmodus-Karten und sichtbarer Steuerungshilfe.
- Flüssige Bewegung zwischen Rasterfeldern, unabhängig von der Bildwiederholrate.
- Zwei schnelle Richtungswechsel werden in Reihenfolge vorgemerkt; direkte Kehrtwenden bleiben gesperrt.
- Empfindlicherer Touch-Joystick und getrennte Eingabepuffer für beide Spieler.
- Die Einstellung „Bewegung reduzieren“ des Geräts schaltet die Bewegungsanimation ab.

Die Levelgeschwindigkeit und die Kollisionsregeln bleiben unverändert.

## Prüfungen

Mit Node.js lassen sich die Steuerung, der Spielablauf und die PWA-Dateien prüfen:

```powershell
node --test tests/*.test.cjs
node --check progression.js
node --check adventure.js
node --check garden-ui.js
node --check game.js
node --check service-worker.js
```

Zusätzlich die Darstellung auf PC und Smartphone sowie echte Controller im Browser prüfen.

Die lokale Vorschau registriert keinen neuen Offline-Cache, damit Änderungen direkt sichtbar werden. Für Offline-Prüfungen die bereitgestellte HTTPS-Version verwenden. Nach einem Produktionsupdate alle alten Spiel-Fenster schließen und neu öffnen, damit der neue Offline-Cache aktiv wird.

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
- `assets/sounds/`: kurze Soundeffekte und Hintergrundmusik für das Spiel

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
