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

Das ist der einzige Schritt, den niemand ausser dem Kontoinhaber machen kann —
er verlangt eine Anmeldung bei Meta mit dem Instagram-Passwort. Einmal zwei
Minuten, danach laeuft es von allein.

**Voraussetzung:** `@amperstrand_ffb` muss ein **Business-** oder
**Creator-Konto** sein (Instagram-App → Einstellungen → Kontotyp). Bei einem
privaten Konto gibt Meta die API gar nicht frei.

1. [developers.facebook.com/apps](https://developers.facebook.com/apps) →
   **App erstellen** → Verwendungszweck **Andere** → Typ **Business**.
2. Im [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
   oben die App auswaehlen, **Generate Access Token**, mit dem Facebook-Konto
   anmelden, das die Amperstrand-Seite verwaltet. Berechtigungen anhaken:
   `instagram_basic`, `pages_show_list`, `pages_read_engagement`.
3. Das erzeugte Token in den
   [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)
   einfuegen → **Extend Access Token** (macht daraus ein 60-Tage-Token).
4. Zurueck im Explorer mit dem verlaengerten Token `me/accounts` abfragen. Die
   Antwort enthaelt pro Seite ein `access_token` — **das** ist das Seiten-Token,
   und Seiten-Token laufen nicht ab. Dazu die `instagram_business_account.id`
   der Amperstrand-Seite notieren.
5. Im Repo unter **Settings → Secrets and variables → Actions → New repository
   secret** anlegen:
   - `IG_TOKEN` — das Seiten-Token aus Schritt 4
   - `IG_USER_ID` — die Instagram-ID aus Schritt 4
6. **Actions → Instagram-Bilder → Run workflow** einmal von Hand starten.

### Token, das nicht ablaeuft

Nimmt man in Schritt 4 das Seiten-Token statt des Nutzer-Tokens, laeuft es
nicht ab — dann ist hier nie wieder etwas zu tun. Der Job prueft das bei jedem
Lauf selbst und schreibt das Ergebnis in die Job-Zusammenfassung:

- „Token laeuft nicht ab" → alles gut, nichts weiter zu tun.
- „Token laeuft am TT.MM. ab" → es wurde das Nutzer-Token erwischt. Schritt 4
  nachholen, wenn man die Erinnerung nicht alle 60 Tage haben will.

Laeuft ein Token doch einmal ab, schlaegt der Job fehl, GitHub schickt eine
Mail, und die Bilder bleiben auf dem letzten Stand. Die Seite bricht nicht.

Meta aendert an dieser API regelmaessig etwas. Wenn die Oberflaeche anders
aussieht als hier beschrieben, gilt die Doku bei Meta.

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
