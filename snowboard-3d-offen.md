# Powder Line — offene Punkte

Übergabe für eine neue Sitzung. Spiel: `snowboard-3d.html` (eine Datei, three.js via
CDN, alles prozedural). Live: https://powderline-game.vercel.app

## Stand

- Letzter Commit: `d6e981d`, deployed und live.
- **Achtung:** Im Arbeitsverzeichnis liegen 42 nicht committete Zeilen (dunkle
  Höhle mit Lichtlöchern und Fackeln, Licht dimmt beim Hineinfahren, Fluchtpiste
  von 26/20 auf 15/11 m verengt). Syntaktisch geprüft, **im Spiel ungetestet**.
  Entweder testen und committen oder mit `git checkout snowboard-3d.html`
  verwerfen.

## Deploy

```bash
cp snowboard-3d.html /tmp/powderline/index.html && cd /tmp/powderline && vercel deploy --prod --yes
vercel alias set <neue-deployment-url> powderline-game.vercel.app
```

Vercel-CLI ist angemeldet. Projekt `powderline`, getrennt von `amperstrand-website`.

---

## 1. Fahrer

| Punkt | Was bekannt ist |
|---|---|
| Brustkorb steht teils nach hinten auf dem Board | Verdacht auf Vorzeichenfehler in `upper.rotation.y` (Basis `-0.62 * stance` in `applyStance`). Messend prüfen, nicht herleiten — in dieser Sitzung waren schon zwei Vorzeichen invertiert. |
| Figur glitcht, wirkt durchsichtig | Nicht reproduziert. Vom Nutzer eingrenzen lassen: welcher Modus, welche Perspektive. Verdacht: `ghostRider` (transparentes Klon-Material) wird nicht zuverlässig ausgeblendet, oder `shapedBox` erzeugt bei kleinen Profilfaktoren umgestülpte Flächen. |
| Skibrille zu dünn und unschön | Aktuell ein Torus-Band (`TorusGeometry(0.30, 0.075, …)`). Braucht ein echtes Gehäuse mit Rahmen, Glas und Band. |
| Kein Gesichtsausdruck erkennbar | Kopf hat kein Gesicht außer Brille. Für den Angst-Moment im Fluchtmodus bräuchte es Mund/Augenbrauen. |

## 2. Yeti

- Modell zu grob („gefühlt 3px"). Mehr Segmente, Fellstruktur, klarere Silhouette.
- **Soundeffekt fehlt komplett.** Web Audio ist vorhanden (`Audio`-Objekt, rein
  prozedural). Ein Knurren aus gefiltertem Rauschen plus tiefem Oszillator,
  ausgelöst wenn er nah ist.

## 3. Höhle / Tunnel

- Soll eine echte dunkle Höhle sein: Fels statt Eis, nur vereinzelte Lichtlöcher
  in den Wänden und/oder Fackeln.
- Soll über die volle Breite gehen (breiter als jetzt, aber schmaler als eine
  Piste).
- *Teilweise im nicht committeten Stand umgesetzt — prüfen.*

## 4. Strecke

- Piste an vielen Stellen zu breit und zu wenig richtungsweisend. Man kann normal
  fahren, ohne aufpassen zu müssen. Gilt besonders für den Fluchtmodus.
- *Fluchtmodus im nicht committeten Stand auf 15/11 m verengt — prüfen.*

## 5. Fehlende Hindernisse im Fluchtmodus

Alle drei fehlen komplett:

- **Umgefallene Bäume** — drüber springen, entlangsliden (Rail-Mechanik existiert
  bereits, siehe `railUnder`), drunter durchducken.
- **Schluchten** zum Drüberspringen. Dreistufige Absprungbewertung existiert
  bereits für Kicker (`popSweet`, `popTol`, `showPop`) und muss nur angehängt
  werden: schlechter Absprung = tot, mittlerer = Stolperer, guter = nichts.
- **Steine** — existieren als Klasse (klein überspringbar, groß nicht), erscheinen
  aber nur in `ROCKS`-Abschnitten, die im Fluchtmodus nicht vorkommen.

## 6. Shop

- Münzen werden bereits gezählt und in `localStorage` gespeichert
  (`Progress.coins`), es gibt nur nichts zu kaufen.
- Gewünscht wie Subway Surfers: besseres Board, schnelleres Board, cooleres
  Board, Outfits.

---

## Hinweise zur Arbeitsweise

- **Der Browser-Pane rendert oft nur wenige Frames.** Zeitbasierte Messungen
  liefern dann stillschweigend die Startwerte. Verlässlich ist: `step(FIXED)` in
  einer Schleife synchron aufrufen und danach messen. Für die Darstellung muss
  man `riderTilt.rotation` von Hand setzen, `step()` tut das nicht.
- **Ersetzungen gegen den tatsächlichen Dateiinhalt prüfen.** In dieser Sitzung
  ist eine `str.replace` still fehlgeschlagen; der alte Code lief weiter und die
  Rails funktionierten nicht mehr.
- Konsole nach jeder Änderung prüfen — das Spiel läuft warnungsfrei, jede
  Ausgabe ist ein Signal.
