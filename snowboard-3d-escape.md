# Fluchtmodus (Yeti) — offene Punkte

Nur was den Escape-Build betrifft. Gesamtliste: `snowboard-3d-offen.md`.
Spiel: `snowboard-3d.html`. Live: https://powderline-game.vercel.app

Modus starten: Menü → grüner Knopf **Flucht** (`data-mode="ESCAPE"`).

---

## Was bereits funktioniert (nicht neu bauen)

- **Yeti folgt der aufgezeichneten Fahrlinie mit Zeitversatz** (`updateChase`,
  Historie in `histX/Y/Z/T`, 400 Punkte). Er läuft nicht selbst — dadurch nimmt
  er dieselben Kurven und landet nie in unfahrbarem Gelände.
- **Stolper-Mechanik** (`stumble`): erster Fehler kostet kein Leben, sondern
  Vorsprung — Abstand fällt von 2,4 s auf 0,85 s, Tempo auf 45 %. Nach
  15 s sauber (`safeWindow`) fällt er zurück. Zweiter Stolperer im Fenster =
  gefangen (`caught`).
- **Zugriff erst nach 45 m Fahrt** — sonst fing er im Intro sofort.
- **Angst-Pose** über `rider.fear` (Kopf über die Schulter, Schultern hoch,
  Körper tief, Arme angewinkelt). Voll nur im Intro.
- **Münzen in Reihen zu acht** entlang der Linie, 24 Stück, mit
  Aufsammel-Animation. Werden in `Progress.coins` gespeichert.
- **Dreistufige Absprungbewertung** existiert für Kicker: `popSweet`, `popTol`,
  `showPop`, Ergebnis in `rider.popQ`. Beeinflusst Impuls und Landehilfe.
- **Rail-Mechanik** (`railUnder`) mit Magnetfang und Boardslide.
- **Eis**: wer lenkt, rutscht weg (gemessen: Querdrift 0,00 geradeaus gegen 1,36
  beim Lenken).

---

## 1. Yeti

- **Modell zu grob** („gefühlt 3px"). Mehr Segmente, Fell, klarere Silhouette.
  Aktuell aus `shapedBox` und Kugeln mit `flatShading`.
- **Soundeffekt fehlt komplett.** Web Audio ist da (`Audio`-Objekt, rein
  prozedural, keine Dateien). Knurren aus gefiltertem Rauschen plus tiefem
  Oszillator, lauter je näher er ist.
- **Zu wenig Bedrohung.** Man kann normal fahren, ohne das Gefühl, gleich
  gefressen zu werden. Druck muss spürbarer werden — engere Strecke, schnelleres
  Aufrücken, Sicht auf ihn am unteren Bildrand.

## 2. Intro-Animation

- Dreiteilige Kamerafahrt (bergauf auf den heranstürmenden Yeti → Nahaufnahme
  des Fahrers → Schwenk bergab und los), 4,4 s.
- **Gefällt dem Nutzer nicht.** Was genau stört, ist offen — nachfragen.
- **Gesichtsausdruck ist nicht zu sehen**, weil die Figur laut Nutzer glitcht und
  durchsichtig wirkt (siehe Punkt 4).

## 3. Fehlende Hindernisse

Alle drei fehlen im Fluchtmodus komplett:

- **Umgefallene Bäume** — drüber springen, entlangsliden, drunter durchducken.
  Fürs Sliden lässt sich `railUnder` wiederverwenden.
- **Schluchten** zum Drüberspringen mit der dreistufigen Bewertung:
  schlechter Absprung = tot, mittlerer = Stolperer, guter = nichts.
  Die Bewertung existiert schon, sie muss nur angehängt werden.
- **Steine** — Klassen existieren (klein überspringbar, groß nicht), erscheinen
  aber nur in `ROCKS`-Abschnitten, die im Fluchtmodus nicht vorkommen.

## 4. Fahrer (blockiert den Intro-Moment)

| Punkt | Was bekannt ist |
|---|---|
| Figur glitcht, wirkt durchsichtig | Nicht reproduziert. Vom Nutzer eingrenzen lassen: welcher Modus, welche Perspektive. Verdacht: `ghostRider` (transparentes Klon-Material) wird nicht zuverlässig ausgeblendet, oder `shapedBox` erzeugt bei kleinen Profilfaktoren umgestülpte Flächen. |
| Kein Gesichtsausdruck | Der Kopf hat außer der Brille nichts. Für den Schreck-Moment braucht es Mund und Augenbrauen. |
| Skibrille zu dünn | Nur ein Torus-Band (`TorusGeometry(0.30, 0.075, …)`). Braucht Gehäuse mit Rahmen, Glas und Band. |
| Brustkorb steht teils nach hinten | Verdacht auf Vorzeichenfehler in `upper.rotation.y` (`-0.62 * stance` in `applyStance`). Messend prüfen — in dieser Sitzung waren schon drei Vorzeichen invertiert. |

## 5. Höhle

- Soll eine echte dunkle Höhle sein: Fels statt Eis, nur vereinzelte Lichtlöcher
  in den Wänden und/oder Fackeln.
- Soll über die volle Breite gehen — breiter als jetzt, aber schmaler als eine
  Piste.
- **In `6f54fae` umgesetzt, aber im Spielverlauf ungetestet.** Lädt fehlerfrei,
  aber niemand ist durch einen Tunnel gefahren. Zuerst gegenprüfen.
- **Eiszapfen** wurden auf 7 reduziert, fast verdreifacht und die Vorwarnung von
  26 auf 55 m gezogen (sie fielen vorher hinter dem Fahrer). Ebenfalls ungeprüft.

## 6. Strecke

- **Zu breit und zu wenig richtungsweisend.** Man kann ohne Aufmerksamkeit
  durchfahren.
- **In `6f54fae` von 26/20 auf 15/11 m verengt** — prüfen, ob das reicht.
- Streckenstil ist `RACE_STYLE.escape`: enge Wechselkurven, dazwischen
  Steilstück, Sprung, Engstelle, Tunnel.
- Tiefschnee-Werte: träge Reibung, wenig Kantengriff, doppelte Baumdichte am
  Rand, Nebel auf 32 m.

## 7. Shop

- Münzen werden gezählt und gespeichert, es gibt nur nichts zu kaufen.
- Gewünscht wie Subway Surfers: besseres Board, schnelleres Board, cooleres
  Board, Outfits.

---

## Hinweise zur Arbeitsweise

- **Der Browser-Pane rendert oft nur wenige Frames.** Zeitbasierte Messungen
  liefern dann stillschweigend die Startwerte. Verlässlich ist: `step(FIXED)` in
  einer Schleife synchron aufrufen und danach messen. Für die Darstellung muss
  man `riderTilt.rotation` von Hand setzen — `step()` tut das nicht.
- **Ersetzungen gegen den tatsächlichen Dateiinhalt prüfen.** Eine `str.replace`
  ist still fehlgeschlagen; der alte Code lief weiter und die Rails
  funktionierten nicht mehr, ohne dass es auffiel.
- **Vorzeichen messen, nicht herleiten.** Drei Vorzeichenfehler in einer Sitzung
  (Flip-Richtung, Armwinkel, Höhenabfall im Quergang) wären je durch eine kurze
  Messung sofort sichtbar gewesen.
- Konsole nach jeder Änderung prüfen — das Spiel läuft warnungsfrei, jede
  Ausgabe ist ein Signal.
