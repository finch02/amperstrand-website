# Powder Line — offene Punkte

Übergabe für eine neue Sitzung. Spiel: `snowboard-3d.html` (eine Datei, three.js via
CDN, alles prozedural). Live: https://powderline-game.vercel.app

## Stand

- Letzter Commit: `6f54fae`, alles auf `origin/main`.
- **`6f54fae` ist im Spielverlauf ungetestet:** dunkle Höhle mit Lichtlöchern und
  Fackeln, Fluchtpiste von 26/20 auf 15/11 m verengt. Lädt fehlerfrei und der
  Fluchtmodus startet ohne Konsolenausgabe, aber es ist niemand durch einen
  Tunnel gefahren. Zuerst gegenprüfen.

## Deploy

```bash
mkdir -p /tmp/powderline && cp snowboard-3d.html /tmp/powderline/index.html
cd /tmp/powderline && vercel deploy --prod --yes
vercel alias set <neue-deployment-url> powderline-game.vercel.app
```

Projekt `powderline`, getrennt von `amperstrand-website`. Die Vercel-CLI muss auf
einer neuen Maschine einmal per `vercel login` (Gerätecode) angemeldet werden.

---

# Offene Punkte

## 1. Gesamteindruck

- **Alles wirkt noch zu kantig.** Durchgehend zu wenige Segmente, harte Facetten.
  Gilt für Fahrer, Yeti, Bäume, Berge. Richtung laut Nutzer: halbrealistisch —
  weiche Normalen statt Facetten, mehr Auflösung, aber der Spielcharakter soll
  bleiben. Kein PBR.

## 2. Fahrer

| Punkt | Was bekannt ist |
|---|---|
| Brustkorb steht teils nach hinten auf dem Board | Verdacht auf Vorzeichenfehler in `upper.rotation.y` (Basis `-0.62 * stance` in `applyStance`). Messend prüfen, nicht herleiten — in dieser Sitzung waren schon zwei Vorzeichen invertiert (Flip-Richtung, Armwinkel). |
| Figur glitcht, wirkt durchsichtig | Nicht reproduziert, blockiert laut Nutzer den Blick aufs Gesicht. Vom Nutzer eingrenzen lassen: welcher Modus, welche Perspektive. Verdacht: `ghostRider` (transparentes Klon-Material) wird nicht zuverlässig ausgeblendet, oder `shapedBox` erzeugt bei kleinen Profilfaktoren umgestülpte Flächen. |
| Skibrille zu dünn und unschön | Aktuell nur ein Torus-Band (`TorusGeometry(0.30, 0.075, …)`). Braucht ein echtes Gehäuse mit Rahmen, Glas und Band. |
| Kein Gesichtsausdruck | Der Kopf hat außer der Brille nichts. Für den Schreck-Moment im Fluchtmodus braucht es Mund und Augenbrauen. |

## 3. Yeti

- **Modell zu grob** („gefühlt 3px"). Mehr Segmente, Fell, klarere Silhouette.
- **Soundeffekt fehlt komplett.** Web Audio ist da (`Audio`-Objekt, rein
  prozedural, keine Dateien). Knurren aus gefiltertem Rauschen plus tiefem
  Oszillator, lauter je näher er ist.
- **Zu wenig Bedrohung.** Man kann im Fluchtmodus normal fahren, ohne das Gefühl
  zu haben, gleich gefressen zu werden. Druck muss spürbarer werden.

## 4. Intro-Animation

- Die dreiteilige Kamerafahrt (bergauf auf den Yeti → Nahaufnahme → Schwenk
  bergab) **gefällt dem Nutzer noch nicht**. Was genau stört, ist offen — beim
  Nutzer nachfragen.

## 5. Höhle / Tunnel

- Soll eine echte dunkle Höhle sein: Fels statt Eis, nur vereinzelte Lichtlöcher
  in den Wänden und/oder Fackeln.
- Soll **über die volle Breite** gehen — breiter als jetzt, aber schmaler als
  eine Piste.
- *In `6f54fae` umgesetzt, aber ungetestet.*

## 6. Strecke

- **Vielerorts zu breit und zu wenig richtungsweisend.** Man kann ohne
  Aufmerksamkeit durchfahren. Gilt für alle Modi, besonders die Flucht.
- *Fluchtpiste in `6f54fae` auf 15/11 m verengt — prüfen, ob das reicht.*

## 7. Fehlende Hindernisse im Fluchtmodus

Alle drei fehlen dort komplett:

- **Umgefallene Bäume** — drüber springen, entlangsliden, drunter durchducken.
  Die Rail-Mechanik (`railUnder`) lässt sich fürs Sliden wiederverwenden.
- **Schluchten** zum Drüberspringen. Die dreistufige Absprungbewertung existiert
  schon für Kicker (`popSweet`, `popTol`, `showPop`) und muss nur angehängt
  werden: schlechter Absprung = tot, mittlerer = Stolperer, guter = nichts.
- **Steine** — Klassen existieren (klein überspringbar, groß nicht), erscheinen
  aber nur in `ROCKS`-Abschnitten, die im Fluchtmodus nicht vorkommen.

## 8. Optik im Detail

Aus einer früheren Abfrage hatte der Nutzer diese vier Punkte ausdrücklich
angekreuzt — nur „Fahrer zu klobig" ist bearbeitet:

- **Schnee zu flach.** Die Pistenfläche wirkt wie Papier. Es fehlen Tiefe,
  Glitzern und weiche Verwehungen. Die Cord-Textur allein reicht nicht.
- **Bäume zu simpel.** Kegel bleiben als Kegel erkennbar, der Schnee liegt zu
  gleichmäßig auf. Nie überarbeitet worden.
- **Berge zu flach.** Teilweise verbessert (Dunstverlauf, Tiefenversatz), laut
  Nutzer weiterhin nicht genug.
- **Funpark sieht nicht gut aus.** Kicker sind reine Terrain-Ausbeulungen ohne
  erkennbare Kante, ohne Anlauf-Markierung, ohne Knuckle.

## 9. Streckenvariabilität

- **„Der Strecke fehlt visuelle Abwechslung einfach."** Mehrfach genannt, nie
  zufriedenstellend gelöst. Die Abschnittstabelle (`SECT`) müsste mehr Typen und
  bessere Verkettungsregeln bekommen.
- **Abzweigung in den Funpark fehlt.** Ursprünglich gewünscht: im Endlosmodus
  teilt sich die Strecke gelegentlich und man kann in einen Park mit Rampen und
  Stangen abbiegen. Aktuell tauchen Parks nur fest in der Abfolge auf, es gibt
  keine Wahl.

## 10. Menü

- **„Menü immer noch ausbaubar."** Zweimal genannt, nie konkretisiert. Beim
  Nutzer nachfragen, was fehlt. Aktuell: Sterne, drei Modusknöpfe, Pistenplan,
  Streckenliste.

## 11. Karte

- **„Die Karte ist noch nicht genau genug."** Zeigt inzwischen Pistenband,
  Mittelinseln, Fels- und Eisfelder, Abgrundkanten, Tore und Schilder. Was
  fehlt, ist offen — nachfragen.

## 12. Rennen gegen andere

- Gewünscht war: „Rennen gegen andere **oder** virtuelle Gegner (Ghost bzw.
  Zeit)". Umgesetzt ist nur der eigene Ghost. Gegner-Fahrer (KI oder
  Mehrspieler) fehlen komplett.

## 13. Unklar, beim Nutzer nachfragen

- **„Parameter müssen realistischer."** Nie präzisiert. Tempo? Kurvenradien?
  Sprunghöhen? Ohne Konkretisierung nicht bearbeitbar.
- **„Der Kopf soll sich mitdrehen, wo wir uns aber schon sehen können."** Kopf
  dreht bereits bis 0,75 rad in die Kurve. Unklar, ob es um mehr Drehung oder um
  Erkennbarkeit aus der Verfolgerdistanz geht.

## 14. Shop

- Münzen werden gezählt und in `localStorage` gespeichert (`Progress.coins`),
  es gibt nur nichts zu kaufen.
- Gewünscht wie Subway Surfers: besseres Board, schnelleres Board, cooleres
  Board, Outfits.

---

# Zuletzt behoben (nicht erneut anfassen)

- Kopf war dauerhaft 120° zurückgedreht — Angst-Pose wirkte auch außerhalb des
  Intros voll.
- Fahrrille war über zwei Meter breit — der Tiefschnee-Faktor wirkte auf Breite
  statt nur auf Tiefe. Jetzt halbe Boardbreite 0,28.
- Eiszapfen fielen hinter dem Fahrer — Vorwarnung von 26 auf 55 m, Anzahl von 18
  auf 7, fast dreifache Größe.
- Münzen lagen verstreut — jetzt Reihen zu acht entlang der Linie, Anzahl von 60
  auf 24, mit Aufsammel-Animation.
- Yeti fing sofort — die Positionshistorie lief während des Intros mit und lieferte
  einen Punkt aus der Standphase.
- Hände lagen im Rumpf — beide Armbasiswinkel waren invertiert.

---

# Hinweise zur Arbeitsweise

- **Der Browser-Pane rendert oft nur wenige Frames.** Zeitbasierte Messungen
  liefern dann stillschweigend die Startwerte. Verlässlich ist: `step(FIXED)` in
  einer Schleife synchron aufrufen und danach messen. Für die Darstellung muss
  man `riderTilt.rotation` von Hand setzen — `step()` tut das nicht.
- **Ersetzungen gegen den tatsächlichen Dateiinhalt prüfen.** In dieser Sitzung
  ist eine `str.replace` still fehlgeschlagen; der alte Code lief weiter und die
  Rails funktionierten nicht mehr, ohne dass es auffiel.
- **Vorzeichen messen, nicht herleiten.** Drei Vorzeichenfehler in dieser Sitzung
  (Flip-Richtung, Armwinkel, Höhenabfall im Quergang) hätte man je durch eine
  kurze Messung sofort gesehen.
- Konsole nach jeder Änderung prüfen — das Spiel läuft warnungsfrei, jede
  Ausgabe ist ein Signal.
