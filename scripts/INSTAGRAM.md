# Instagram-Bilder automatisch holen

Der Instagram-Abschnitt auf der Startseite zeigt neun Bilder aus
`assets/insta/`. Ein taeglicher GitHub-Job holt die neuesten Posts von
`@amperstrand_ffb` und ueberschreibt **genau diese neun Dateien**. Am HTML
aendert sich dabei nichts — nur die Bilder werden frischer.

| Datei | Was sie tut |
|---|---|
| `scripts/fetch-instagram.mjs` | holt, schneidet quadratisch zu, komprimiert |
| `.github/workflows/instagram.yml` | laeuft taeglich 06:30 (Berlin), committet nur bei Aenderungen |
| `assets/insta/insta.json` | entsteht beim Lauf: Post-Link + Bildtext je Kachel |

Solange kein Token hinterlegt ist, passiert schlicht nichts — die Seite laeuft
mit den jetzigen Bildern weiter.

## Was noch fehlt: das Token

Das ist der einzige Schritt, der nicht automatisiert werden kann, weil dafuer
eine Anmeldung bei Meta noetig ist.

1. `@amperstrand_ffb` muss ein **Business-** oder **Creator-Konto** sein
   (Instagram-App → Einstellungen → Kontotyp). Bei einem privaten Konto gibt
   Meta die API nicht frei.
2. Auf [developers.facebook.com](https://developers.facebook.com/apps) eine App
   anlegen und das Produkt **Instagram** hinzufuegen.
3. Dort ein **Long-Lived Access Token** fuer das Konto erzeugen. Es braucht
   Leserechte auf die eigenen Medien (`instagram_business_basic` bzw.
   `instagram_graph_user_media`, je nach Anbindung).
4. Im Repo unter **Settings → Secrets and variables → Actions** anlegen:
   - `IG_TOKEN` — das Token (Pflicht)
   - `IG_USER_ID` — nur noetig, wenn die Anbindung ueber eine Facebook-Seite
     laeuft statt ueber Instagram-Login
5. Unter **Actions → Instagram-Bilder → Run workflow** einmal von Hand starten.

**Wichtig:** Das Token laeuft nach ~60 Tagen ab. Danach schlaegt der Job fehl
(GitHub schickt eine Mail) und die Bilder bleiben auf dem letzten Stand — die
Seite bricht nicht. Dann Schritt 3 bis 4 wiederholen. Meta aendert an dieser
API regelmaessig etwas; wenn die Oberflaeche anders aussieht als hier
beschrieben, gilt die Doku bei Meta.

## Lokal ausprobieren

```bash
npm install --no-save sharp
IG_TOKEN=... node scripts/fetch-instagram.mjs
```

Ohne Token, nur um die Bildverarbeitung zu pruefen — `IG_FIXTURE` erwartet eine
JSON-Datei im Format der API-Antwort (`media_url`, `permalink`, `caption` …):

```bash
IG_FIXTURE=/pfad/zu/posts.json node scripts/fetch-instagram.mjs
```

## Zurueck zum handverlesenen Stand

Die jetzigen neun Bilder liegen in Commit `f599d61`. Zurueckholen:

```bash
git checkout f599d61 -- assets/insta/ && rm -f assets/insta/insta.json && git commit -m "Instagram-Bilder zurueck auf handverlesen"
```

Danach in **Actions → Instagram-Bilder → ⋯ → Disable workflow** den Job
abschalten, sonst ueberschreibt der naechste Lauf die Bilder wieder.

## Verhalten im Betrieb

- Weniger als neun brauchbare Posts → die restlichen Kacheln behalten ihr
  altes Bild, es entstehen keine Luecken.
- Ein Post, dessen Download scheitert → nur diese eine Kachel bleibt, wie sie
  war. Sie behaelt auch ihren alten Link, statt faelschlich auf den naechsten
  Post zu zeigen.
- Reels und Videos → es wird das Standbild verwendet.
- Kein Meta-Skript im Browser, keine Cookies von Instagram: die Bilder liegen
  auf der eigenen Domain. Fuer die Datenschutzseite aendert sich nichts.
