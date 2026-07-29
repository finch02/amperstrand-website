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
- **Bedrohung — ✅ teilweise.** `chaseLag` 2,4 → 1,7 s. Isoliert gemessen (ohne
  Stolper-Fenster, das sonst auf `chaseLagNear` klemmt und den Wert überdeckt):
  Medianabstand 32,3 → 24,4 m, Maximalabstand 48,2 → 34,3 m — er bleibt im Bild.
  Todesrate unverändert: 27 Fänge in 3 min bei identischer Eingabe, vorher wie
  nachher. Offen bleibt die Sicht auf ihn am unteren Bildrand.
- **Soundeffekt — ✅ gebaut.** `Audio.growl(near)`: gefiltertes Rauschen plus
  tiefer Sawtooth-Brustton, 5,5-Hz-LFO als Atmen, quadratisch in der Nähe.
  Ab 34 m hörbar. Gemessen bei 6,1 m Abstand: Rauschen 0,256 (Soll 0,259),
  Brustton 0,137 (0,138), Filter 296 Hz (297), Oszillator 66 Hz (66,5).
  Wird an drei Stellen wieder abgeregelt (Moduswechsel, `gameOver`, `caught`).

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
- **Steine — ✅ erledigt.** `SECT.ROCKS` zweifach in `RACE_STYLE.escape.fill`
  aufgenommen. Gemessen: 16 Felsfelder pro Strecke (vorher 0), ohne Anstieg der
  Sturzverluste (0 in 3 min).

## 4. Fahrer (blockiert den Intro-Moment)

| Punkt | Was bekannt ist |
|---|---|
| Figur glitcht, wirkt durchsichtig | Nicht reproduziert. Vom Nutzer eingrenzen lassen: welcher Modus, welche Perspektive. Verdacht: `ghostRider` (transparentes Klon-Material) wird nicht zuverlässig ausgeblendet, oder `shapedBox` erzeugt bei kleinen Profilfaktoren umgestülpte Flächen. |
| Kein Gesichtsausdruck | Der Kopf hat außer der Brille nichts. Für den Schreck-Moment braucht es Mund und Augenbrauen. |
| Skibrille zu dünn | Nur ein Torus-Band (`TorusGeometry(0.30, 0.075, …)`). Braucht Gehäuse mit Rahmen, Glas und Band. |
| Brustkorb steht teils nach hinten | Verdacht auf Vorzeichenfehler in `upper.rotation.y` (`-0.62 * stance` in `applyStance`). Messend prüfen — in dieser Sitzung waren schon drei Vorzeichen invertiert. |

## 5. Höhle — ✅ gegengeprüft und repariert

`6f54fae` war im Spielverlauf kaputt. Gemessen im Tunnel bei d≈1790, drei Fehler:

- **Der Bogen stand quer.** `m.rotation.z = PI/2` legte die Zylinderachse auf X
  statt auf Z: 11,5 m breit × 19,1 m lang bei 24,5 m Pistenbreite — ein Gewölbe
  quer zur Fahrtrichtung, das nur die halbe Piste überspannte und seitlich offen
  war. Die Drehung ist jetzt in die Geometrie gebacken (`rotateZ` + `rotateY`),
  die Skalierung dadurch direkt (Breite, Höhe, Länge). **Neu: 23,3 m bei 24,5 m.**
- **Lichtlöcher und Fackeln schwebten frei.** Über `sin/cos` in der X-Y-Ebene
  platziert — richtig gedacht für eine Röhre entlang Z, aber der Bogen lag quer.
  Jetzt auf derselben Ellipse wie die Wand, gemessener Ellipsenradius 0,96.
- **Die Segmente bildeten eine Treppe.** Waagerechte Röhren auf 55 % Gefälle:
  5,25 m Versatz bei 9,8 m Gewölbehöhe, von außen ein schwarzer Keil. Sie folgen
  jetzt dem Hang (`rotation.x`, gemessen −28,6°), `TUN_LEN` 11,5 → 13.
  **Überlappung durchgehend 1,29–1,74 m, keine Lücke.**

Altlast, die erst in der geschlossenen Höhle auffiel: **die Eiszapfen hingen
durchs Dach** (feste Höhe `hw*0.9` gegen eine Decke bei `hw*0.80−1.2`). Sie
hängen jetzt an der Gewölbeellipse; gemessen 0 von 7 durchs Dach.

Das Abdunkeln aus `6f54fae` war in Ordnung: `tunnelDark` → 1,0, Sonne 2,50 →
0,30, nach Austritt zurück auf 2,496.

- **Vorwarnung der Zapfen (55 m) wirkt**, aber unvollständig: von 12 Auslösungen
  lösten 11 rund 37 m vor dem Fahrer, eine 19,8 m dahinter. `near = I.d - d0`
  wird für Segmente hinter dem Fahrer negativ und ist damit immer `< icicleWarn`.
  Ein `near > 0` in der Shake-Bedingung stellt es ab — offen gelassen, weil es
  das Spielgefühl betrifft.

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
