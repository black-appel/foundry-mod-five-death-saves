# Changelog

Alle bemerkenswerten Änderungen an diesem Modul werden in diesem Dokument festgehalten.

## [1.1.0] - 2026-11-13

### Hinzugefügt

- Manuelles Setzen und Zurücksetzen der Todesrettungswurf-Zähler direkt im Tray für die Spielleitung.
- Konfigurationsdialog für beide Zähler und den automatischen Misserfolg bei 0 TP.
- Das pro Charakter gespeicherte Flag `flags.five-death-saves.autoDownFailure`, das Active Effects von Items temporär überschreiben können.

### Geändert

- Manuelle Zähler- und Regelkonfiguration ist ausschließlich für die Spielleitung verfügbar.

### Behoben

- Der geöffnete oder geschlossene Zustand des Death-Save-Trays bleibt bei Aktualisierungen des Charakterbogens erhalten, ohne sichtbares Auf- und Zuklappen.
- Die Death-Save-Anzeige aktualisiert sich direkt nach einer kurzen oder langen Rast, ohne das Character Sheet neu zu zeichnen.
- Eine Rast bei 0 TP behält den vorbereiteten Misserfolgs-Reset bei, statt ihn beim Wiedererlangen von TP wieder zu überschreiben.

## [1.0.0] - 2026-11-13

### Hinzugefügt

- Erste stabile Version des Moduls.

### Behoben

- Der Death-Save-Tray wird über den allgemeinen Foundry-V14-Render-Hook zuverlässig im offiziellen D&D5e-Charakterbogen ersetzt.
- Das ein- und ausgeklappte Tray ist an die größere Fünf-Misserfolge-Anzeige angepasst.

## [0.1.1] - 2026-11-12

### Geändert

- D&D5e-Kompatibilität auf die geprüfte Version 6.0.6 gesenkt.
- Publisher im Modulmanifest auf `black-appel` gesetzt.

## [0.1.0] - 2026-11-12

### Hinzugefügt

- Homebrew-Regel mit fünf Todesrettungswurf-Misserfolgen für D&D5e-Charaktere.
- Automatischer Misserfolg beim Fallen auf 0 Trefferpunkte.
- Zurücksetzen der Misserfolge nach kurzer oder langer Rast.
- Charakterbogen-Anzeige mit drei Erfolgen und fünf Misserfolgen.
