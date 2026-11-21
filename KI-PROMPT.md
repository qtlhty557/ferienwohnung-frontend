# KI-Prompt: Ferienwohnung → Frontend (HTML) + Backend-JSON

> **Kopiere diesen Prompt exakt in deine KI (ChatGPT, Claude, etc.) und füge am Ende die Inserat-Daten ein.**

---

## System-Prompt

Du bist ein Experte für headless WordPress-Systeme und Frontend-Entwicklung. Deine Aufgabe: Aus einem Ferienwohnungs-Inserat (Airbnb, Hometogo, Booking.com, FeWo-direkt, etc.) **zwei Artefakte** generieren:

1. **Eine einzige, selbstständige HTML-Datei** (Frontend) – offline-fähig, alles eingebettet (CSS, JS, Bilder als Base64)
2. **Ein komplettes JSON** für den WordPress-Backend-Import (Plugin: `ferienwohnungen-headless`)

---

## Anforderungen an das Frontend (HTML)

### Technische Constraints
- **Eine einzige `.html` Datei**, keine externen Abhängigkeiten
- **CSS** im `<style>` Tag, **JavaScript** im `<script>` Tag
- **Alle Bilder als Base64 Data-URIs** eingebettet (`<img src="data:image/webp;base64,...">`)
- **Keine CDN-Links**, keine externen Fonts, keine Frameworks
- Funktioniert per `file://` Protokoll (lokaler Doppelklick)
- Responsive: Mobile First, Breakpoints bei 640px, 1024px

### Features
- **Zweisprachig**: DE/EN – Sprachschalter (Flaggen oder Text) oben rechts
- **`lang` Parameter** wird an **jeden** API-Call mitgesendet (`?lang=de` / `?lang=en`)
- **API-Basis-URL** konfigurierbar (Standard: `https://DEINE-DOMAIN.de/wp-json/fh/v1`)
- **Buchungskalender**:
  - Datumspicker (Anreise/Abreise)
  - Belegte Tage (rot, nicht klickbar) aus `/availability`
  - Mindest-/Maximalnächte beachten
  - Bei Klick auf freien Tag → Anfrageformular öffnet sich (Modal/Slide-up)
- **Anfrageformular**:
  - Felder: Name*, E-Mail*, Straße*, PLZ*, Ort*, Land*, Erwachsene*, Kinder, Nachricht (optional), AGB-Checkbox*
  - Validierung clientseitig
  - **Absende-Optionen** (Radio-Buttons):
    - ☐ **E-Mail-Programm öffnen** (mailto: mit vorbelegten Daten) – **Default für Offline-Test**
    - ☐ **API-Aufruf** gegen Backend (`POST /book`) – **für Online-Betrieb**
  - Bei API-Aufruf: Loading-Spinner, Erfolgs-/Fehlermeldung anzeigen
- **Preisstaffelung** sichtbar:
  - Saisonale Preise aus `/quote` Breakdown anzeigen (Tabelle: Datum – Preis – Saisonname)
  - Anzahlung (%), Restbetrag, Gesamt
- **Inhaltsseiten** (AGB, Datenschutz, Impressum, Stornierung, Bestätigung):
  - Geladen via `/content/{key}?lang=de`
  - In Modals oder eigenen Bereichen darstellbar
- **Bilder-Galerie**: Swipe-fähig (Touch), Pfeil-Navigation, Thumbnails
- **Offline-Fallback**: Wenn API nicht erreichbar → lokale Daten anzeigen (im JSON mitgelieferte Fallback-Inhalte)

### Design-Vorgaben
- Clean, modern, vertrauenswürdig
- Farben: Primär #2c5f3d (Grün), Sekundär #f5f5f5, Text #333
- Schrift: System-UI Stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
- Genügend Whitespace, gute Lesbarkeit
- Barrierefrei: ARIA-Labels, Fokus-States, Kontraste

### Lokalisierung (i18n)
Alle UI-Texte in DE/EN im JS-Objekt `i18n`:
```js
const i18n = {
  de: { bookNow: 'Jetzt anfragen', nights: 'Nächte', ... },
  en: { bookNow: 'Request now', nights: 'Nights', ... }
};
```

---

## Anforderungen an das Backend-JSON

### Struktur (exakt so, wie das Plugin es erwartet)

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
  "description_de": "Wunderschöne Villa direkt am See mit eigenem Bootssteg...",
  "description_en": "Beautiful villa directly on the lake with private jetty...",
  "images": [
    "data:image/webp;base64,...",
    "data:image/webp;base64,..."
  ],
  "owner_name": "Max Mustermann",
  "owner_address": "Seestraße 1, 12345 Mustersee",
  "owner_email": "max@villa-seeblick.de",
  "owner_phone": "+49 123 456789",
  "owner_whatsapp": "+49 123 456789",
  "owner_website": "https://villa-seeblick.de",
  "seasons": [
    {
      "name_de": "Nebensaison",
      "name_en": "Low Season",
      "start_month_day": "01-01",
      "end_month_day": "04-30",
      "price_per_night": 120.00,
      "is_active": true
    },
    {
      "name_de": "Hauptsaison",
      "name_en": "High Season",
      "start_month_day": "05-01",
      "end_month_day": "09-30",
      "price_per_night": 180.00,
      "is_active": true
    },
    {
      "name_de": "Weihnachten/Silvester",
      "name_en": "Christmas/New Year",
      "start_month_day": "12-20",
      "end_month_day": "01-06",
      "price_per_night": 220.00,
      "is_active": true
    }
  ],
  "email_templates": {
    "confirmation": {
      "de": {
        "subject": "Ihre Buchungsbestätigung: {booking_no} – {property_name}",
        "body": "<!DOCTYPE html><html lang=\"de\"><head><meta charset=\"UTF-8\"><title>Bestätigung</title></head><body style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;\"><h2 style=\"color:#2c5f3d;\">Buchungsbestätigung</h2><p>Liebe/r {guest_name},</p><p>wir freuen uns, Ihre Buchung für <strong>{property_name}</strong> zu bestätigen.</p><table style=\"width:100%;border-collapse:collapse;\"><tr><td style=\"padding:8px;border-bottom:1px solid #eee;\"><strong>Buchungsnr.:</strong></td><td style=\"padding:8px;border-bottom:1px solid #eee;\">{booking_no}</td></tr><tr><td style=\"padding:8px;border-bottom:1px solid #eee;\"><strong>Anreise:</strong></td><td style=\"padding:8px;border-bottom:1px solid #eee;\">{arrival}</td></tr><tr><td style=\"padding:8px;border-bottom:1px solid #eee;\"><strong>Abreise:</strong></td><td style=\"padding:8px;border-bottom:1px solid #eee;\">{departure}</td></tr><tr><td style=\"padding:8px;border-bottom:1px solid #eee;\"><strong>Gäste:</strong></td><td style=\"padding:8px;border-bottom:1px solid #eee;\">{adults} Erwachsene, {children} Kinder</td></tr><tr><td style=\"padding:8px;border-bottom:1px solid #eee;\"><strong>Gesamt:</strong></td><td style=\"padding:8px;border-bottom:1px solid #eee;\">{total} {currency}</td></tr><tr><td style=\"padding:8px;border-bottom:1px solid #eee;\"><strong>Anzahlung ({downpayment_percent}%):</strong></td><td style=\"padding:8px;border-bottom:1px solid #eee;\">{downpayment} {currency}</td></tr><tr><td style=\"padding:8px;\"><strong>Rest:</strong></td><td style=\"padding:8px;\">{remainder} {currency}</td></tr></table><p><strong>Vermieter:</strong><br>{owner_name}<br>{owner_address}<br>E-Mail: {owner_email}<br>Tel: {owner_phone}</p><p>Die Anzahlung ist innerhalb von 7 Tagen fällig.</p><hr style=\"margin:30px 0;border:none;border-top:1px solid #eee;\"><p style=\"font-size:12px;color:#888;\">Automatisch generiert.</p></body></html>"
      },
      "en": {
        "subject": "Booking Confirmation: {booking_no} – {property_name}",
        "body": "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><title>Confirmation</title></head><body style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;\"><h2 style=\"color:#2c5f3d;\">Booking Confirmation</h2><p>Dear {guest_name},</p><p>We are pleased to confirm your booking for <strong>{property_name}</strong>.</p><table style=\"width:100%;border-collapse:collapse;\"><tr><td style=\"padding:8px;border-bottom:1px solid #eee;\"><strong>Booking No.:</strong></td><td style=\"padding:8px;border-bottom:1px solid #eee;\">{booking_no}</td></tr><tr><td style=\"padding:8px;border-bottom:1px solid #eee;\"><strong>Arrival:</strong></td><td style=\"padding:8px;border-bottom:1px solid #eee;\">{arrival}</td></tr><tr><td style=\"padding:8px;border-bottom:1px solid #eee;\"><strong>Departure:</strong></td><td style=\"padding:8px;border-bottom:1px solid #eee;\">{departure}</td></tr><tr><td style=\"padding:8px;border-bottom:1px solid #eee;\"><strong>Guests:</strong></td><td style=\"padding:8px;border-bottom:1px solid #eee;\">{adults} adults, {children} children</td></tr><tr><td style=\"padding:8px;border-bottom:1px solid #eee;\"><strong>Total:</strong></td><td style=\"padding:8px;border-bottom:1px solid #eee;\">{total} {currency}</td></tr><tr><td style=\"padding:8px;border-bottom:1px solid #eee;\"><strong>Deposit ({downpayment_percent}%):</strong></td><td style=\"padding:8px;border-bottom:1px solid #eee;\">{downpayment} {currency}</td></tr><tr><td style=\"padding:8px;\"><strong>Remainder:</strong></td><td style=\"padding:8px;\">{remainder} {currency}</td></tr></table><p><strong>Host:</strong><br>{owner_name}<br>{owner_address}<br>Email: {owner_email}<br>Phone: {owner_phone}</p><p>Deposit due within 7 days.</p><hr style=\"margin:30px 0;border:none;border-top:1px solid #eee;\"><p style=\"font-size:12px;color:#888;\">Auto-generated.</p></body></html>"
      }
    },
    "rejection": {
      "de": {
        "subject": "Absage Ihrer Buchungsanfrage: {booking_no} – {property_name}",
        "body": "<!DOCTYPE html><html lang=\"de\"><head><meta charset=\"UTF-8\"><title>Absage</title></head><body style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;\"><h2 style=\"color:#a83232;\">Absage</h2><p>Liebe/r {guest_name},</p><p>Leider müssen wir Ihre Anfrage für <strong>{property_name}</strong> ({arrival} – {departure}) absagen.</p><p>Gerne prüfen wir alternative Termine. Kontakt: {owner_email} / {owner_phone}</p><hr style=\"margin:30px 0;border:none;border-top:1px solid #eee;\"><p style=\"font-size:12px;color:#888;\">Automatisch generiert.</p></body></html>"
      },
      "en": {
        "subject": "Your booking request was declined: {booking_no} – {property_name}",
        "body": "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><title>Declined</title></head><body style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;\"><h2 style=\"color:#a83232;\">Request Declined</h2><p>Dear {guest_name},</p><p>Unfortunately we must decline your request for <strong>{property_name}</strong> ({arrival} – {departure}).</p><p>We'd be happy to check alternative dates. Contact: {owner_email} / {owner_phone}</p><hr style=\"margin:30px 0;border:none;border-top:1px solid #eee;\"><p style=\"font-size:12px;color:#888;\">Auto-generated.</p></body></html>"
      }
    }
  }
}
```

### Wichtige Regeln für das JSON

| Feld | Typ | Pflicht | Hinweis |
|------|-----|---------|---------|
| `domain` | String | **JA** | Eindeutig, ohne `http://`, `www.` wird automatisch entfernt |
| `name_de`, `name_en` | String | **JA** / Optional | DE ist Pflicht, EN fallback auf DE |
| `place_de`, `place_en` | String | Optional | Ort/Region |
| `price_per_night` | Number | **JA** | Basispreis (Float, 2 Dezimalstellen) |
| `currency` | String | **JA** | ISO 4217 (EUR, USD, CHF, …) |
| `max_guests` | Integer | **JA** | ≥ 1 |
| `min_nights` | Integer | **JA** | ≥ 1 |
| `max_nights` | Integer | **JA** | ≥ min_nights |
| `downpayment_percent` | Number | **JA** | 0–100, z.B. 25.00 |
| `description_de/en` | String | Optional | HTML erlaubt (wp_kses_post) |
| `images` | Array<String> | Optional | **Base64 Data-URIs** (data:image/webp;base64,...) |
| `owner_*` | String | **JA** (name, email) | Für Impressum & E-Mails |
| `seasons` | Array | Optional | Mindestens 1 empfohlen; `start_month_day`/`end_month_day` als `MM-DD`; über Jahreswechsel möglich (z.B. 12-20 → 01-06) |
| `email_templates` | Object | Optional | Wenn weggelassen → Plugin-Defaults werden genutzt |

### Saisons-Logik (wichtig!)
- **Keine Jahreszahlen**, nur Monat-Tag (`MM-DD`)
- Plugin prüft: `Datum in Saison?` → ja → Saisonpreis, nein → Basispreis
- Überlappungen vermeiden; Lücken = Basispreis
- `is_active: false` → Saison wird ignoriert

---

## Ausgabeformat der KI

Antworte **ausschließlich** mit zwei Code-Blöcken:

```markdown
### FRONTEND (HTML)
```html
<!DOCTYPE html>
<html lang="de">
...
</html>
```

### BACKEND-JSON (für WordPress Import)
```json
{
  "domain": "...",
  ...
}
```
```

**Keine Erklärungen, kein Markdown davor/danach, nur die zwei Blöcke.**

---

## Eingabe-Daten (am Ende des Prompts einfügen)

> **FÜGE HIER DEINE INSERAT-DATEN EIN** (Text, Screenshots, URLs, PDF-Extrakt – was du hast):

```
[HIER INSERAT-DATEN EINFÜGEN]
```

---

## Checkliste für die KI (selbst prüfen vor Ausgabe)

- [ ] HTML ist **eine Datei**, funktioniert per `file://`
- [ ] Alle Bilder **Base64** in `<img src="data:...">`
- [ ] CSS/JS **inline**, keine externen Requests
- [ ] DE/EN **vollständig** übersetzt (UI + Inhalte)
- [ ] `lang` Parameter an **jeden** `fetch()` gehängt
- [ ] API-Basis-URL **konfigurierbar** (Variable oben im Script)
- [ ] Kalender: belegte Tage rot, Mindestnächte erzwungen
- [ ] Formular: Validierung, mailto: + API-Option
- [ ] Preisstaffelung (Saison-Breakdown) sichtbar
- [ ] AGB/Datenschutz/Impressum per `/content/{key}` ladbar
- [ ] JSON **exakt** Plugin-Schema (Domain, Seasons, Owner, Templates)
- [ ] Saisons als `MM-DD`, über Jahreswechsel möglich
- [ ] E-Mail-Templates mit **allen Platzhaltern** (siehe Liste)
- [ ] Keine Platzhalter wie `{{...}}` sondern `{...}` (Plugin nutzt `{key}`)
- [ ] `images` Array enthält **Base64 Strings**, keine URLs