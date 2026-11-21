# Ferienwohnungen Build System

**Static Site Generator + Design System für Ferienwohnungen**

Generiert aus JSON-Daten individuelle, performante HTML-Seiten mit Design-System und deployed sie zu Cloudflare Pages.

## 🎯 Ziel

> **Neue Ferienwohnung in 30 Sekunden online bringen:**
> 1. KI generiert **EIN JSON** (Daten + Design-Config)
> 2. `pnpm deploy neue-fewo` 
> 3. Fertig — Backend (WP) aktualisiert + Frontend (Cloudflare) live

---

## 📁 Struktur

```
ferienwohnungen-headless/
├── build-system/              # ← DAS BUILD SYSTEM
│   ├── package.json
│   ├── build.js               # Haupt-Build-Script
│   ├── deploy.js              # Deploy zu Cloudflare Pages
│   ├── wp-sync.js             # Sync zu WordPress Backend
│   ├── schemas/               # Zod-Validierung
│   ├── lib/presets.js         # Design-Presets
│   ├── templates/             # Nunjucks Templates
│   │   ├── base.njk
│   │   ├── pages/index.njk
│   │   ├── components/        # Hero, Gallery, Calendar, Form, etc.
│   │   ├── styles/            # CSS (Presets + Components + Layouts)
│   │   └── scripts/           # JS (API, Gallery, Calendar, Booking, UI)
│   ├── sites/                 # ← DEINE JSONs HIER REIN
│   │   ├── template.json      # Vorlage kopieren
│   │   └── alte-schule-suellwarden.json
│   ├── scripts/               # Build/Deploy Helper
│   └── dist/                  # Build-Output (wird generiert)
└── .github/workflows/deploy.yml  # Auto-Deploy bei Push
```

---

## 🚀 Quick Start

### 1. Dependencies installieren
```bash
cd build-system
pnpm install
```

### 2. Erste Site anlegen
```bash
# Template kopieren
cp sites/template.json sites/meine-neue-fewo.json

# Bearbeiten (Daten + Design)
# domain, slug, data.*, design.* anpassen
```

### 3. Bauen & Deployen
```bash
# Alles bauen
pnpm build

# Einzelne Site bauen
pnpm build --site meine-neue-fewo

# Zu Cloudflare Pages deployen (braucht Git-Repo)
pnpm deploy

# Einzelne Site deployen
pnpm deploy --site meine-neue-fewo

# Interaktiv
pnpm deploy --interactive
```

### 4. WordPress Backend syncen
```bash
# Environment setzen
export WP_API_URL=https://dein-wp.de/wp-json/fh/v1
export WP_USERNAME=admin
export WP_PASSWORD=xxx
# oder: export WP_API_KEY=xxx

# Syncen
pnpm sync:wp
pnpm sync:wp --site meine-neue-fewo
```

---

## 🎨 Design System

### Presets (KI wählt passend zum Inserat)

| Preset | Vibe | Ideal für |
|--------|------|-----------|
| `modern-minimal` | Clean, whitespace, schnell | Moderne Apartments, Städtereisen |
| `cozy-rustic` | Warm, Serifen, Holz | Berghütten, Landhäuser, Familien |
| `luxury-dark` | Dunkel, Gold-Akzente, Premium | High-End Villen, Wellness, Paare |
| `family-bright` | Hell, große Buttons, spielerisch | Familien mit Kindern, Gruppen |
| `nature-immersive` | Fullscreen-Bilder, transparente UI | Natur, See, Berge, Outdoor |
| `urban-chic` | Monochrome, geometrisch, scharf | Lofts, Design-Apartments, Business |

### Layouts
- `hero-gallery-calendar` — Klassisch: Hero → Gallery → Features → Calendar → Prices → Form
- `fullscreen-slider` — Immersiv: Fullscreen-Slider als Hero, Rest darunter
- `split-map` — Split: Text links, Mini-Gallery rechts
- `magazine` — Editorial: Asymmetrisches Grid, magazinartig
- `compact` — Kompakt: Einseitig, schnell

### Komponenten (kombinierbar)
```json
"components": {
  "gallery": "swiper-masonry | flickity | lightbox-only | swiper-fullscreen | grid",
  "calendar": "inline-range | modal-picker | sidebar | dropdown",
  "effects": ["scroll-reveal", "parallax-hero", "hover-zoom", "magnetic-buttons", "page-transitions", "text-reveal", "image-compare"]
}
```

---

## 📝 JSON Schema (KI-Output)

```json
{
  "domain": "deine-domain.de",
  "slug": "deine-domain",
  "data": { ... },           // Alle Inserat-Daten (Preise, Bilder, Owner, Seasons)
  "design": {
    "preset": "nature-immersive",
    "colors": { "primary": "#...", "secondary": "#...", "accent": "#...", "background": "#...", "text": "#..." },
    "fonts": { "heading": "Font Name", "body": "Font Name" },
    "layout": "fullscreen-slider",
    "components": {
      "gallery": "swiper-fullscreen",
      "calendar": "modal-picker",
      "effects": ["parallax-hero", "scroll-reveal"]
    }
  }
}
```

**Wichtig:** Die KI liefert **komplettes JSON** — du musst nichts manuell zusammenbauen.

---

## ☁️ Cloudflare Pages Setup

### 1. Repository verbinden
- Cloudflare Pages → "Connect to Git"
- Repository auswählen
- Build command: `pnpm install && pnpm turbo run build` (falls Monorepo) oder `cd build-system && pnpm install && pnpm build`
- Output directory: `build-system/dist`

### 2. Custom Domains
Für jede Site eine Domain hinzufügen:
- `alte-schule-suellwarden.de` → zeigt auf `dist/alte-schule-suellwarden/`
- Automatisch SSL, CDN, Caching

### 3. Environment Variables (in Cloudflare Pages Dashboard)
```
WP_API_URL=https://dein-wp.de/wp-json/fh/v1
```

---

## 🔧 WordPress Backend

Dein bestehendes Plugin `ferienwohnungen-headless` bleibt **unverändert**.

### API Endpoints (fh/v1)
| Endpoint | Method | Zweck |
|----------|--------|-------|
| `/health` | GET | Health Check |
| `/quote` | GET | Preisberechnung (arrival, departure, adults, children, lang) |
| `/availability` | GET | Belegte Tage, min/max nights |
| `/book` | POST | Buchungsanfrage erstellen |
| `/content/{key}` | GET | Impressum, Datenschutz, etc. |

### Sync Script
Das `wp-sync.js` pusht die `data` aus dem JSON an dein Plugin (via admin-ajax `fh_import_execute`).

---

## 🛠️ Development

### Lokal testen
```bash
cd build-system
pnpm build --site alte-schule-suellwarden
# Output in dist/alte-schule-suellwarden/
# Öffne dist/alte-schule-suellwarden/index.html im Browser
```

### Neuen Preset hinzufügen
1. `lib/presets.js` → `PRESET_DEFAULTS` erweitern
2. CSS in `templates/styles/presets/` (wird automatisch generiert)
3. Schema in `schemas/site-schema.js` → `preset` enum erweitern

### Eigenes Layout
1. `templates/components/hero-mein-layout.njk` erstellen
2. `templates/styles/layouts/mein-layout.css` erstellen
3. In `build.js` → `templateData` → `design.layout` Mapping ergänzen

---

## 📦 Deploy Flow

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   KI JSON   │────►│  pnpm build │────►│  dist/<slug>/    │────►│  git push       │
│  (Daten+    │     │  (Nunjucks) │     │  index.html      │     │  (GitHub)       │
│   Design)   │     │             │     │  _headers        │     │                 │
└─────────────┘     └─────────────┘     │  _redirects      │     └────────┬────────┘
                                         └──────────────────┘              │
                                                                           ▼
                                    ┌──────────────────┐     ┌─────────────────┐
                                    │ Cloudflare Pages │────►│  Live weltweit  │
                                    │  (Auto-Build)    │     │  (Edge, CDN)    │
                                    └──────────────────┘     └─────────────────┘
```

---

## 🔐 Environment Variables

```bash
# .env (nicht committen!)
WP_API_URL=https://dein-wp.de/wp-json/fh/v1
WP_USERNAME=admin
WP_PASSWORD=supersecret
# oder
WP_API_KEY=your-api-key

CLOUDFLARE_API_TOKEN=xxx
CLOUDFLARE_ACCOUNT_ID=xxx
```

---

## 📋 Checkliste für neue Site

- [ ] JSON in `sites/` angelegt (`domain`, `slug`, `data.*`, `design.*`)
- [ ] `pnpm build --site <slug>` → keine Fehler
- [ ] `dist/<slug>/index.html` im Browser prüfen (Design, Kalender, Formular)
- [ ] `pnpm sync:wp --site <slug>` → WordPress Backend prüfen (Preise, Kalender, Buchung)
- [ ] `pnpm deploy --site <slug>` → Cloudflare Pages Deploy läuft durch
- [ ] Custom Domain in Cloudflare Pages hinzugefügt
- [ ] Live-Test: Buchungsanfrage absenden → WP Admin → Bestätigen → E-Mail prüfen

---

## 🆘 Troubleshooting

| Problem | Lösung |
|---------|--------|
| Build schlägt fehl | `pnpm build --site <slug>` für Details; JSON gegen Schema prüfen |
| Kalender zeigt keine belegten Tage | WP API `/availability` prüfen; CORS? Domain in WP Plugin konfiguriert? |
| Buchung geht nicht | WP API `/book` prüfen; CORS? Nonce? Admin-Ajax erreichbar? |
| Design bricht | CSS-Klassen prüfen; Preset-CSS geladen? Browser-Cache leeren |
| Deploy hängt | Cloudflare Pages Logs prüfen; `dist/` Struktur korrekt? |

---

## 📄 Lizenz

MIT — Frei nutzbar, anpassbar, erweiterbar.

---

**Viel Erfolg mit deinen Ferienwohnungen!** 🏖️