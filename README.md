# Five Death Saves

Ein privates Foundry-VTT-Modul für die Homebrew-Regel „Five Death Saves“.

## Unterstützte Versionen

- Foundry VTT 14.367 oder neuer innerhalb von V14
- D&D5e-System 6.0.6 oder neuer innerhalb der Hauptversion 6

## Regelverhalten

- Charaktere brauchen weiterhin drei Erfolge, um stabil zu sein.
- Erst der fünfte Misserfolg führt zum Tod.
- Beim Übergang von positiven Trefferpunkten auf 0 Trefferpunkte wird genau ein Misserfolg eingetragen.
- Eine kurze oder lange Rast setzt die Misserfolge zurück.
- Eine natürliche 1 zählt als zwei Misserfolge; eine natürliche 20 belebt mit 1 TP wieder. Bereits gesammelte Homebrew-Misserfolge bleiben bis zur Rast bestehen.

Das Modul betrifft ausschließlich Spielercharaktere (`character`).

## Darstellung

Im ausklappbaren Todesrettungswurf-Bereich des offiziellen D&D5e-Charakterbogens stehen die drei Erfolge oberhalb des bekannten Würfelknopfs; darunter erscheinen fünf Misserfolge.

## Lokale Entwicklung

```sh
npm test
```

Zum lokalen Testen muss dieser Projektordner als `five-death-saves` in Foundrys Modulordner liegen oder dorthin verlinkt werden. Anschließend Foundry neu laden und das Modul in der Welt aktivieren.

Die hiesige Foundry-Installation nutzt einen symbolischen Link auf diesen Projektordner. Das ist für die Entwicklung gewollt: Änderungen sind nach einem Reload sofort sichtbar. Den Foundry-Updater in dieser Installation nicht für dieses Modul verwenden, da er den Link durch eine heruntergeladene Kopie ersetzen kann.

## Installation und Updates

Sobald die erste GitHub-Version veröffentlicht wurde, kann das Modul in Foundry über diese Manifest-URL installiert werden:

```text
https://github.com/black-appel/foundry-mod-five-death-saves/releases/latest/download/module.json
```

Foundry prüft diese stabile Adresse auf neue Versionen. Erscheint im Setup-Bildschirm ein Update, genügt ein Klick auf „Update“.

## Eine Version veröffentlichen

1. Versionsnummer in `module.json` erhöhen und die passende Download-URL auf den neuen Tag ändern, etwa von `v0.1.0` auf `v0.1.1`.
2. Änderungen nach `main` pushen; die Tests laufen automatisch.
3. Auf GitHub einen Release mit dem exakt passenden Tag veröffentlichen, zum Beispiel `v0.1.1`.

Die Release-Automation testet das Projekt erneut, erzeugt `five-death-saves.zip` und hängt sowohl dieses Archiv als auch die passende `module.json` an den GitHub-Release. Damit ist das Release für Foundry installier- und aktualisierbar.
