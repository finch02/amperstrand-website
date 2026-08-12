/* ---------------------------------------------------------------------------
   Amperstrand — Instagram-Bilder holen
   ---------------------------------------------------------------------------
   Holt die neuesten Posts von @amperstrand_ffb und schreibt sie als
   assets/insta/insta-01.jpg … insta-09.jpg — also GENAU auf die Dateien, die
   index.html ohnehin schon einbindet. Am Markup aendert sich dadurch nichts,
   nur die Bilder werden frischer. Zusaetzlich entsteht assets/insta/insta.json
   mit Permalink + Bildtext je Kachel; index.html haengt das per JS an die
   Kacheln, damit jede Kachel auf ihren echten Post verlinkt.

   Aufruf:
     IG_TOKEN=... node scripts/fetch-instagram.mjs

   Umgebungsvariablen:
     IG_TOKEN     Pflicht. Long-Lived Access Token (siehe scripts/INSTAGRAM.md).
     IG_USER_ID   Optional. Nur noetig, wenn der Token ueber die Facebook-Seite
                  laeuft statt ueber Instagram-Login.
     IG_COUNT     Optional, Default 9 — so viele Kacheln hat das Grid.
     IG_FIXTURE   Optional. Pfad zu einer JSON-Datei mit einer fertigen
                  Medienliste. Ueberspringt den API-Aufruf — fuer Trockenlaeufe
                  und zum Testen der Bildverarbeitung ohne Token.

   Beendet sich mit Code 0, wenn nichts zu tun war, 1 bei echten Fehlern.
   Bei weniger als IG_COUNT Posts bleiben die restlichen Kacheln unveraendert —
   es entstehen keine Luecken.
   --------------------------------------------------------------------------- */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'insta');
const COUNT = Number(process.env.IG_COUNT || 9);
const TOKEN = process.env.IG_TOKEN;
const USER_ID = process.env.IG_USER_ID;
const FIXTURE = process.env.IG_FIXTURE;

// Die erste Kachel spannt im Grid 2x2, braucht also die doppelte Kantenlaenge.
const EDGE_LARGE = 1200;
const EDGE_SMALL = 700;
const QUALITY = 78;

const FIELDS = 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp';

const log = (...a) => console.log('[insta]', ...a);
const fail = (msg) => { console.error('[insta] FEHLER:', msg); process.exit(1); };

/* --- API ----------------------------------------------------------------- */

async function getJson(url, what) {
  const res = await fetch(url);
  const body = await res.text();
  let data;
  try { data = JSON.parse(body); } catch { data = null; }
  if (!res.ok || !data || data.error) {
    const detail = data?.error?.message || body.slice(0, 300);
    throw new Error(`${what} fehlgeschlagen (HTTP ${res.status}): ${detail}`);
  }
  return data;
}

/* Zwei Auth-Wege sind im Umlauf, je nachdem wie der Account angebunden ist:
   - Instagram-Login  -> graph.instagram.com/me/media
   - Facebook-Seite   -> graph.facebook.com/<ig-user-id>/media
   Wir probieren den passenden zuerst und fallen auf den anderen zurueck. */
async function fetchMedia() {
  const attempts = USER_ID
    ? [
        { name: 'Graph API (Facebook-Seite)', url: `https://graph.facebook.com/v21.0/${USER_ID}/media` },
        { name: 'Graph API (Instagram-Login)', url: 'https://graph.instagram.com/me/media' },
      ]
    : [
        { name: 'Graph API (Instagram-Login)', url: 'https://graph.instagram.com/me/media' },
      ];

  const errors = [];
  for (const attempt of attempts) {
    const url = `${attempt.url}?fields=${FIELDS}&limit=${Math.max(COUNT * 3, 25)}&access_token=${encodeURIComponent(TOKEN)}`;
    try {
      const data = await getJson(url, attempt.name);
      log(`${attempt.name}: ${data.data?.length ?? 0} Posts erhalten`);
      return data.data || [];
    } catch (err) {
      errors.push(`${attempt.name}: ${err.message}`);
    }
  }
  fail(`Kein Weg zur API hat funktioniert.\n  - ${errors.join('\n  - ')}`);
}

/* --- Bilder -------------------------------------------------------------- */

/* Videos und Reels haben kein media_url-Bild, aber ein Standbild. Alben liefern
   das erste Bild direkt in media_url. */
function pickImageUrl(item) {
  if (item.media_type === 'VIDEO') return item.thumbnail_url || null;
  return item.media_url || item.thumbnail_url || null;
}

/* Bildtext als alt-Attribut: erste Zeile, ohne Hashtags, gekuerzt. Faellt auf
   einen neutralen Text zurueck, damit nie ein leeres alt entsteht. */
function toAlt(caption) {
  if (!caption) return 'Amperstrand auf Instagram';
  const firstLine = caption.split('\n').find((l) => l.trim()) || '';
  const clean = firstLine.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'Amperstrand auf Instagram';
  return clean.length > 120 ? `${clean.slice(0, 117)}…` : clean;
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download fehlgeschlagen (HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function writeTile(buffer, index) {
  const edge = index === 0 ? EDGE_LARGE : EDGE_SMALL;
  const file = path.join(OUT_DIR, `insta-${String(index + 1).padStart(2, '0')}.jpg`);
  // Quadratisch zuschneiden: die Kacheln sind aspect-ratio 1 mit object-fit
  // cover, so bleibt kein Byte fuer Bildteile drauf, die niemand sieht.
  await sharp(buffer)
    .rotate()
    .resize(edge, edge, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(file);
  return file;
}

/* --- Hauptlauf ----------------------------------------------------------- */

async function main() {
  if (!FIXTURE && !TOKEN) fail('IG_TOKEN fehlt. Siehe scripts/INSTAGRAM.md.');

  const raw = FIXTURE
    ? JSON.parse(await readFile(FIXTURE, 'utf8'))
    : await fetchMedia();

  const usable = raw
    .filter((item) => pickImageUrl(item))
    .slice(0, COUNT);

  if (!usable.length) fail('Keine verwertbaren Posts gefunden — bestehende Bilder bleiben unveraendert.');
  if (usable.length < COUNT) {
    log(`Nur ${usable.length} von ${COUNT} Posts nutzbar — die restlichen Kacheln bleiben, wie sie sind.`);
  }

  await mkdir(OUT_DIR, { recursive: true });

  // Position im Array == Position der Kachel im Grid. Uebersprungene Kacheln
  // bleiben null, damit sie ihr altes Bild UND ihren alten Link behalten —
  // sonst wandert der Link des naechsten Posts auf ein fremdes Bild.
  const manifest = new Array(usable.length).fill(null);
  let written = 0;
  for (const [index, item] of usable.entries()) {
    const url = pickImageUrl(item);
    try {
      const file = await writeTile(await download(url), index);
      manifest[index] = {
        file: `assets/insta/${path.basename(file)}`,
        permalink: item.permalink || 'https://www.instagram.com/amperstrand_ffb/',
        alt: toAlt(item.caption),
        timestamp: item.timestamp || null,
      };
      written += 1;
      log(`Kachel ${index + 1}: ${path.basename(file)}`);
    } catch (err) {
      // Ein kaputter Post darf den ganzen Lauf nicht kippen — die Kachel
      // behaelt einfach ihr altes Bild.
      log(`Kachel ${index + 1} uebersprungen: ${err.message}`);
    }
  }

  if (!written) fail('Kein einziges Bild liess sich verarbeiten.');

  await writeFile(
    path.join(OUT_DIR, 'insta.json'),
    `${JSON.stringify({ updated: new Date().toISOString(), tiles: manifest }, null, 2)}\n`,
  );
  log(`Fertig — ${written} Kacheln aktualisiert.`);
}

main().catch((err) => fail(err.stack || err.message));
