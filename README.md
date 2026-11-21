# Ferienwohnungen Headless – Komplettes System

Ein WordPress-Plugin + Frontend-Template für die Verwaltung beliebig vieler Ferienwohnungen aus **einem** WordPress-Backend. Jede Ferienwohnung hat ihre **eigene Domain** (Addon-Domain), das Frontend ist eine **einzige HTML-Datei** (offline-fähig, alles eingebettet).

---

## 🎯 Ziel

> **Neue Ferienwohnung in Minuten online bringen:**
> 1. Inserat finden (Airbnb, Hometogo, FeWo-direkt, …)
> 2. KI generiert **Frontend (HTML)** + **Import-JSON** (Prompt siehe `KI-PROMPT.md`)
> 3. JSON im WP-Backend importieren (ein Klick)
> 4. HTML-Datei speichern & testen
> 5. Online stellen (Addon-Domain auf WP-Ordner zeigen lassen)

---

## 📁 Projektstruktur

```
ferienwohnungen-headless/
├── ferienwohnungen-headless.php      # Haupt-Plugin-Datei
├── includes/
│   ├── class-database.php            # DB-Tabellen & CRUD
│   ├── class-domain-resolver.php     # Domain-Erkennung (X-Forwarded-Host → HTTP_HOST → ?domain=)
│   ├── class-api.php                 # REST API Endpunkte (fh/v1)
│   ├── class-email.php               # E-Mail-Vorlagen, Versand (wp_mail + SMTP), Preview
│   └── class-admin.php               # Admin-UI (Buchungen, Import, E-Mail-Templates, SMTP)
├── admin/
│   ├── css/admin.css                 # Admin-Styles
│   └── js/admin.js                   # Admin-JS (AJAX, Modals, Validierung)
├── frontend-beispiel.html            # Beispiel-Frontend (eine Datei, alles eingebettet)
├── KI-PROMPT.md                      # Prompt für KI: Inserat → HTML + JSON
└── README.md                         # Diese Datei
```

---

## 🔌 Installation

1. Ordner `ferienwohnungen-headless` nach `wp-content/plugins/` kopieren
2. Plugin im WP-Admin aktivieren
3. Bei Aktivierung werden automatisch 5 Tabellen angelegt:
   - `wp_fh_properties` – Ferienwohnungen (einmal pro Domain)
   - `wp_fh_seasons` – Saisonale Preise
   - `wp_fh_bookings` – Buchungsanfragen (Status: request/confirmed/rejected)
   - `wp_fh_email_templates` – E-Mail-Vorlagen (Bestätigung/Absage × DE/EN)
   - `wp_fh_content_blocks` – Inhalte (AGB, Datenschutz, Impressum, …)

---

## ⚙️ Konfiguration

### 1. Domains einrichten (cPanel / Plesk / nginx)
Alle Addon-Domains zeigen auf **denselben WordPress-Installationsordner**.
Beispiel:
- `villa-seeblick.de` → `/home/user/public_html/`
- `haus-am-see.de` → `/home/user/public_html/`

Das Plugin erkennt automatisch anhand des `Host`-Headers, welche Ferienwohnung gemeint ist.

### 2. Erste Ferienwohnung importieren
WP-Admin → **Ferienwohnungen → Import**
- JSON aus KI-Ausgabe einfügen oder `.json` hochladen
- **Vorschau** prüft: Domain, Name, Saisons-Anzahl, Insert/Update
- **Bestätigen** → alles in DB geschrieben (Property + Seasons + Owner + Email-Templates)

### 3. SMTP (optional)
WP-Admin → **Ferienwohnungen → SMTP Einstellungen**
- Standard: `wp_mail()` (funktioniert auf den meisten Hostern)
- Optional: Eigenen SMTP-Server eintragen (Host, Port, User, Pass, TLS/SSL, From)
- Test-E-Mail versenden

### 4. E-Mail-Vorlagen anpassen
WP-Admin → **Ferienwohnungen → E-Mail Vorlagen**
- `confirmation` (Bestätigung) + `rejection` (Absage) jeweils DE/EN
- Platzhalter: `{guest_name}`, `{booking_no}`, `{arrival}`, `{departure}`, `{total}`, `{downpayment}`, `{remainder}`, `{currency}`, `{downpayment_percent}`, `{property_name}`, `{owner_name}`, `{owner_address}`, `{owner_email}`, `{owner_phone}`, `{confirmation_url}`, …
- **Vorschau** mit Dummy-Daten vor dem Speichern

### 5. Inhalte (AGB, Datenschutz, …)
WP-Admin → **Ferienwohnungen → Buchungen** → Ferienwohnung wählen
- Oder per API: `GET /fh/v1/content/terms?lang=de`
- Falls leer → Plugin liefert Defaults

---

## 🌐 REST API (Namespace: `fh/v1`)

| Endpoint | Methode | Parameter | Beschreibung |
|----------|---------|-----------|--------------|
| `/health` | GET | – | Health Check: `{status, property, version}` |
| `/quote` | GET | `arrival`, `departure`, `adults`, `children`, `lang` | Preisberechnung mit Saisonpreisen, Anzahlung, Rest |
| `/availability` | GET | `lang` | `{booked:[], today, min_nights, max_nights}` |
| `/book` | POST | `guest_name`, `guest_email`, `guest_street`, `guest_zip`, `guest_city`, `guest_country`, `arrival`, `departure`, `adults`, `children`, `lang`, `message` | Erstellt Buchung mit Status `request`, gibt `{success, booking_no, token, confirmation_url}` |
| `/content/{key}` | GET | `key` (home,terms,privacy,confirm,cancellation,imprint), `lang` | HTML-Inhalt für Modals/Seiten |

**Wichtig:** Jeder Request **muss** `lang=de` oder `lang=en` enthalten (Query-Param).

---

## 🏠 Domain-Erkennung (Priorität)

1. `X-Forwarded-Host` Header (Cloudflare, Reverse Proxy, Load Balancer)
2. `HTTP_HOST` (normaler Direktzugriff)
3. Query-Parameter `?domain=...` (lokaler Test: `localhost?domain=villa-seeblick.de`)
4. `SERVER_NAME` (Fallback)

→ Domain wird getrimmt, `www.` entfernt, lowercase → Lookup in `wp_fh_properties.domain` (UNIQUE).
→ Kein Treffer = **404** mit Message „Keine Ferienwohnung für diese Domain konfiguriert“.

---

## 📦 Import-JSON Schema (für KI)

```json
{
  "domain": "villa-seeblick.de",
  "name_de": "Villa Seeblick",
  "name_en": "Villa Lake View",
  "place_de": "Mustersee",
  "place_en": "Sample Lake",
  "price_per_night": 150.00,
  "currency": "EUR",
  "max_guests": 6,
  "min_nights": 3,
  "max_nights": 21,
  "downpayment_percent": 25.00,
  "description_de": "HTML...",
  "description_en": "HTML...",
  "images": ["data:image/webp;base64,...", "..."],
  "owner_name": "Max Mustermann",
  "owner_address": "Seestraße 1, 12345 Mustersee",
  "owner_email": "max@villa-seeblick.de",
  "owner_phone": "+49 123 456789",
  "owner_whatsapp": "+49 123 456789",
  "owner_website": "https://villa-seeblick.de",
  "seasons": [
    { "name_de": "Nebensaison", "name_en": "Low Season", "start_month_day": "01-01", "end_month_day": "04-30", "price_per_night": 120.00, "is_active": true },
    { "name_de": "Hauptsaison", "name_en": "High Season", "start_month_day": "05-01", "end_month_day": "09-30", "price_per_night": 180.00, "is_active": true },
    { "name_de": "Weihnachten", "name_en": "Christmas", "start_month_day": "12-20", "end_month_day": "01-06", "price_per_night": 220.00, "is_active": true }
  ],
  "email_templates": {
    "confirmation": { "de": { "subject": "...", "body": "..." }, "en": { ... } },
    "rejection": { "de": { ... }, "en": { ... } }
  }
}
```

**Saisons:** `start_month_day` / `end_month_day` als `MM-DD`. Über Jahreswechsel möglich (z. B. `12-20` → `01-06`). Plugin nutzt Basispreis wenn keine Saison matcht.

---

## 🖥️ Frontend (`frontend-beispiel.html`)

**Eine einzige HTML-Datei** – funktioniert per Doppelklick (`file://`), alles eingebettet:
- CSS im `<style>`, JS im `<script>`
- Bilder als **Base64 Data-URIs** im `images`-Array
- Keine externen Requests (Fonts, CDN, Frameworks)
- **Features:**
  - DE/EN Umschaltung (überträgt `lang` an jeden API-Call)
  - Bilder-Slider + Thumbnails (Touch/Swipe, Pfeile, Tastatur)
  - Belegungskalender (Monatsnavigation, belegte Tage rot, Mindestnächte)
  - Preisstaffelung (Saison-Breakdown aus `/quote`)
  - Anfrageformular (Validierung, AGB-Checkbox)
  - Zwei Absende-Wege: **mailto:** (offline) + **API** (online)
  - Content-Modals für AGB, Datenschutz, Impressum, Stornierung (laden via `/content/{key}`)
  - Toasts für Success/Error
  - Voll barrierefrei (ARIA, Fokus, Kontraste)

**Konfiguration** (ganz oben im Script):
```js
const CONFIG = {
  apiBase: 'https://DEINE-DOMAIN.de/wp-json/fh/v1',
  propertyDomain: 'villa-seeblick.de',
  defaultLang: 'de',
  fallback: { ... } // Wird durch API überschrieben
};
```

---

## 📧 Buchungs-Workflow

1. Gast füllt Formular aus → `POST /book`
2. Backend speichert Buchung, Status = **`request`**
3. WP-Admin → **Buchungen** → Liste aller Anfragen (filterbar nach Property/Status)
4. Vermieter klickt **„Bestätigen“** oder **„Ablehnen“**
5. Status ändert sich → `confirmed` / `rejected`
6. **Automatisch** wird E-Mail an Gast gesendet (Vorlage aus Backend, Platzhalter ersetzt)
7. Bei Bestätigung: `confirmed_at` Timestamp gesetzt

---

## 🛠️ Entwicklung / Debugging

### Lokales Testen ohne echte Domain
```
http://localhost/wp-json/fh/v1/quote?arrival=2024-07-15&departure=2024-07-22&adults=2&lang=de&domain=villa-seeblick.de
```
→ `domain`-Parameter simuliert die Addon-Domain.

### Health Check
```
https://villa-seeblick.de/wp-json/fh/v1/health
→ { "status": "ok", "property": "villa-seeblick.de", "version": "1.0.0" }
```

### Logs
- PHP-Errors: WP `debug.log` (`WP_DEBUG_LOG`)
- API-Requests: Browser DevTools → Network
- E-Mail-Versand: `error_log()` in `class-email.php` (SMTP-Fehler)

---

## 🔐 Sicherheit

- Alle API-Endpunkte: `permission_callback => __return_true` (öffentlich, da headless)
- Domain-Validierung: Nur konfigurierte Domains liefern Daten
- Buchungs-Token: 64 Hex-Zeichen (`random_bytes(32)`), für Bestätigungs-URL
- Nonces in Admin-AJAX (`fh_headless_nonce`)
- Capability Checks: `manage_options` für alle Admin-Aktionen
- Input-Sanitization: `sanitize_text_field`, `sanitize_email`, `wp_kses_post`, `intval`, `floatval`
- Prepared Statements via `$wpdb->prepare()`

---

## 📋 Anforderungen

- **WordPress** 6.0+
- **PHP** 8.1+
- **MySQL/MariaDB** mit `utf8mb4_unicode_ci`
- `mod_rewrite` / Pretty Permalinks (für REST API)
- cPanel/Plesk/Server mit Addon-Domain-Support (oder nginx-VHost-Konfiguration)

---

## 🚀 Deployment-Checkliste

- [ ] Plugin installiert & aktiviert
- [ ] Addon-Domains auf WP-Ordner zeigen
- [ ] Erste Ferienwohnung per Import-JSON angelegt
- [ ] SMTP getestet (oder `wp_mail()` funktioniert)
- [ ] E-Mail-Vorlagen geprüft (Vorschau)
- [ ] Frontend-HTML auf Domain gelegt (oder per Webserver ausgeliefert)
- [ ] `apiBase` im Frontend auf korrekte Domain gesetzt
- [ ] Test-Buchung: Anfrage → Admin bestätigt → E-Mail ankommt
- [ ] Health-Check aller Domains grün

---

## 📄 Lizenz

GPL-2.0-or-later – Freie Nutzung, Anpassung, Weitergabe.

---

## 🤝 Support / Weiterentwicklung

Bei Fragen oder Feature-Wünschen: Issue erstellen oder direkt im Code anpassen (modular aufgebaute Klassen).

**Viel Erfolg mit deinen Ferienwohnungen!** 🏖️