<?php
/**
 * Admin Interface - MenÃ¼s, Seiten, AJAX-Handler
 */

namespace FH_Headless;

class Admin {

    private static $instance = null;

    public static function instance(): self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function register_menu(): void {
        // HauptmenÃ¼
        $hook = add_menu_page(
            'Ferienwohnungen Headless',
            'Ferienwohnungen',
            'manage_options',
            'fh-headless',
            [ $this, 'render_dashboard' ],
            'dashicons-building',
            56
        );

        // UntermenÃ¼s
        add_submenu_page(
            'fh-headless',
            'Buchungen',
            'Buchungen',
            'manage_options',
            'fh-headless-bookings',
            [ $this, 'render_bookings' ]
        );

        add_submenu_page(
            'fh-headless',
            'Import',
            'Import',
            'manage_options',
            'fh-headless-import',
            [ $this, 'render_import' ]
        );

        add_submenu_page(
            'fh-headless',
            'Frontend-HTML',
            'Frontend-HTML',
            'manage_options',
            'fh-headless-html-import',
            [ $this, 'render_html_import' ]
        );

        add_submenu_page(
            'fh-headless',
            'E-Mail Vorlagen',
            'E-Mail Vorlagen',
            'manage_options',
            'fh-headless-email-templates',
            [ $this, 'render_email_templates' ]
        );

        add_submenu_page(
            'fh-headless',
            'SMTP Einstellungen',
            'SMTP Einstellungen',
            'manage_options',
            'fh-headless-smtp',
            [ $this, 'render_smtp_settings' ]
        );

        // Assets fÃ¼r Admin-Seiten
        add_action( "load-{$hook}", [ $this, 'enqueue_dashboard_assets' ] );
    }

    public function enqueue_dashboard_assets(): void {
        // Bereits in Plugin-Hauptdatei geladen
    }

    // ==================== DASHBOARD ====================

    public function render_dashboard(): void {
        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-database.php';
        $db = Database::instance();
        $properties = $db->get_all_properties();

        $total_bookings = 0;
        $open_requests = 0;
        foreach ( $properties as $p ) {
            $bookings = $db->get_bookings( $p['id'] );
            $total_bookings += count( $bookings );
            foreach ( $bookings as $b ) {
                if ( $b['status'] === 'request' ) $open_requests++;
            }
        }
        ?>
        <meta charset="UTF-8">
        <div class="wrap fh-headless-wrap">
            <h1>Ferienwohnungen Headless API</h1>
            
            <div class="fh-dashboard-grid">
                <div class="fh-card">
                    <h2>Ãœbersicht</h2>
                    <ul>
                        <li><strong>Ferienwohnungen:</strong> <?php echo count( $properties ); ?></li>
                        <li><strong>Gesamte Buchungen:</strong> <?php echo $total_bookings; ?></li>
                        <li><strong>Offene Anfragen:</strong> <?php echo $open_requests; ?></li>
                        <li><strong>API Namespace:</strong> <code>fh/v1</code></li>
                        <li><strong>Version:</strong> <?php echo FH_HEADLESS_VERSION; ?></li>
                    </ul>
                </div>

                <div class="fh-card">
                    <h2>API Endpunkte</h2>
                    <p>Basis-URL: <code><?php echo esc_url( rest_url( FH_HEADLESS_API_NAMESPACE ) ); ?></code></p>
                    <ul>
                        <li><code>GET /health</code> â€“ Health Check</li>
                        <li><code>GET /quote</code> â€“ Preisberechnung</li>
                        <li><code>GET /availability</code> â€“ Belegungskalender</li>
                        <li><code>POST /book</code> â€“ Buchungsanfrage</li>
                        <li><code>GET /content/{key}</code> â€“ Inhalt (AGB, etc.)</li>
                    </ul>
                </div>

                <div class="fh-card">
                    <h2>Schnellzugriff</h2>
                    <p>
                        <a href="<?php echo admin_url( 'admin.php?page=fh-headless-import' ); ?>" class="button button-primary">Neue Ferienwohnung importieren</a>
                    </p>
                    <p>
                        <a href="<?php echo admin_url( 'admin.php?page=fh-headless-bookings' ); ?>" class="button">Buchungen verwalten</a>
                    </p>
                    <p>
                        <a href="<?php echo admin_url( 'admin.php?page=fh-headless-email-templates' ); ?>" class="button">E-Mail Vorlagen</a>
                    </p>
                </div>
            </div>

            <div class="fh-card">
                <h2>Eingerichtete Ferienwohnungen</h2>
                <?php if ( empty( $properties ) ): ?>
                    <p>Noch keine Ferienwohnungen eingerichtet. <a href="<?php echo admin_url( 'admin.php?page=fh-headless-import' ); ?>">Jetzt importieren</a>.</p>
                <?php else: ?>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th>Domain</th>
                                <th>Name (DE)</th>
                                <th>Name (EN)</th>
                                <th>Ort</th>
                                <th>Basispreis</th>
                                <th>Max. GÃ¤ste</th>
                                <th>Buchungen</th>
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ( $properties as $p ): 
                                $bookings = $db->get_bookings( $p['id'] );
                                $open = array_filter( $bookings, fn($b) => $b['status'] === 'request' );
                            ?>
                            <tr>
                                <td><strong><?php echo esc_html( $p['domain'] ); ?></strong></td>
                                <td><?php echo esc_html( $p['name_de'] ); ?></td>
                                <td><?php echo esc_html( $p['name_en'] ); ?></td>
                                <td><?php echo esc_html( $p['place_de'] ); ?></td>
                                <td><?php echo number_format( $p['price_per_night'], 2, ',', '.' ) . ' ' . $p['currency']; ?></td>
                                <td><?php echo (int) $p['max_guests']; ?></td>
                                <td><?php echo count( $bookings ); ?> (<?php echo count( $open ); ?> offen)</td>
                                <td>
                                    <a href="<?php echo admin_url( 'admin.php?page=fh-headless-bookings&property=' . $p['id'] ); ?>" class="button button-small">Buchungen</a>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }

    // ==================== BUCHUNGEN ====================

    public function render_bookings(): void {
        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-database.php';
        $db = Database::instance();

        $property_id = isset( $_GET['property'] ) ? intval( $_GET['property'] ) : 0;
        $status_filter = isset( $_GET['status'] ) ? sanitize_text_field( $_GET['status'] ) : '';

        $properties = $db->get_all_properties();

        if ( $property_id ) {
            $bookings = $db->get_bookings( $property_id, $status_filter );
            $property = $db->get_property_by_id( $property_id );
        } else {
            // Alle Buchungen aller Properties
            $bookings = [];
            foreach ( $properties as $p ) {
                $b = $db->get_bookings( $p['id'], $status_filter );
                foreach ( $b as $booking ) {
                    $booking['property_name'] = $p['name_de'];
                    $booking['property_domain'] = $p['domain'];
                    $bookings[] = $booking;
                }
            }
            // Nach Datum sortieren
            usort( $bookings, fn($a, $b) => strtotime( $b['created_at'] ) - strtotime( $a['created_at'] ) );
        }
        ?>
        <meta charset="UTF-8">
        <div class="wrap fh-headless-wrap">
            <h1>Buchungen verwalten</h1>

            <form method="get" class="fh-filter-form">
                <input type="hidden" name="page" value="fh-headless-bookings">
                <label for="property">Ferienwohnung:</label>
                <select name="property" id="property">
                    <option value="">Alle</option>
                    <?php foreach ( $properties as $p ): ?>
                        <option value="<?php echo $p['id']; ?>" <?php selected( $property_id, $p['id'] ); ?>>
                            <?php echo esc_html( $p['name_de'] . ' (' . $p['domain'] . ')' ); ?>
                        </option>
                    <?php endforeach; ?>
                </select>

                <label for="status">Status:</label>
                <select name="status" id="status">
                    <option value="">Alle</option>
                    <option value="request" <?php selected( $status_filter, 'request' ); ?>>Anfrage (offen)</option>
                    <option value="confirmed" <?php selected( $status_filter, 'confirmed' ); ?>>BestÃ¤tigt</option>
                    <option value="rejected" <?php selected( $status_filter, 'rejected' ); ?>>Abgelehnt</option>
                </select>

                <input type="submit" class="button" value="Filtern">
                <?php if ( $property_id || $status_filter ): ?>
                    <a href="<?php echo admin_url( 'admin.php?page=fh-headless-bookings' ); ?>" class="button">ZurÃ¼cksetzen</a>
                <?php endif; ?>
            </form>

            <?php if ( empty( $bookings ) ): ?>
                <div class="fh-card"><p>Keine Buchungen gefunden.</p></div>
            <?php else: ?>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th>Buchungsnr.</th>
                            <?php if ( ! $property_id ): ?><th>Ferienwohnung</th><?php endif; ?>
                            <th>Gast</th>
                            <th>E-Mail</th>
                            <th>Anreise</th>
                            <th>Abreise</th>
                            <th>NÃ¤chte</th>
                            <th>Gesamt</th>
                            <th>Status</th>
                            <th>Erstellt</th>
                            <th>Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ( $bookings as $b ): 
                            $arrival = strtotime( $b['arrival'] );
                            $departure = strtotime( $b['departure'] );
                            $nights = ( $departure - $arrival ) / DAY_IN_SECONDS;
                            $status_class = 'fh-status-' . $b['status'];
                            $status_label = [
                                'request'   => 'Anfrage',
                                'confirmed' => 'BestÃ¤tigt',
                                'rejected'  => 'Abgelehnt',
                            ][ $b['status'] ] ?? $b['status'];
                        ?>
                        <tr>
                            <td><strong><?php echo esc_html( $b['booking_no'] ); ?></strong></td>
                            <?php if ( ! $property_id ): ?>
                                <td><?php echo esc_html( $b['property_name'] ); ?><br><small><?php echo esc_html( $b['property_domain'] ); ?></small></td>
                            <?php endif; ?>
                            <td><?php echo esc_html( $b['guest_name'] ); ?></td>
                            <td><?php echo esc_html( $b['guest_email'] ); ?></td>
                            <td><?php echo date( 'd.m.Y', $arrival ); ?></td>
                            <td><?php echo date( 'd.m.Y', $departure ); ?></td>
                            <td><?php echo $nights; ?></td>
                            <td><?php echo number_format( $b['total_price'], 2, ',', '.' ) . ' ' . $b['currency']; ?></td>
                            <td><span class="fh-status-badge <?php echo $status_class; ?>"><?php echo $status_label; ?></span></td>
                            <td><?php echo date( 'd.m.Y H:i', strtotime( $b['created_at'] ) ); ?></td>
                            <td>
                                <?php if ( $b['status'] === 'request' ): ?>
                                    <button class="button button-small fh-btn-confirm" data-booking-id="<?php echo $b['id']; ?>" data-nonce="<?php echo wp_create_nonce( 'fh_headless_nonce' ); ?>">BestÃ¤tigen</button>
                                    <button class="button button-small fh-btn-reject" data-booking-id="<?php echo $b['id']; ?>" data-nonce="<?php echo wp_create_nonce( 'fh_headless_nonce' ); ?>" style="margin-left: 5px;">Ablehnen</button>
                                <?php else: ?>
                                    <button class="button button-small fh-btn-preview" data-booking-id="<?php echo $b['id']; ?>" data-type="<?php echo $b['status'] === 'confirmed' ? 'confirmation' : 'rejection'; ?>" data-nonce="<?php echo wp_create_nonce( 'fh_headless_nonce' ); ?>">E-Mail Vorschau</button>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
        <?php
    }

    // ==================== IMPORT ====================

    public function render_import(): void {
        ?>
        <meta charset="UTF-8">
        <div class="wrap fh-headless-wrap">
            <h1>Ferienwohnung importieren (Komplett-JSON)</h1>

            <div class="fh-card">
                <h2>Anleitung</h2>
                <p>FÃ¼gen Sie das vollstÃ¤ndige JSON einer Ferienwohnung ein oder laden Sie eine <code>.json</code>-Datei hoch. Das JSON muss alle Daten enthalten: Ferienwohnung, saisonale Preise, EigentÃ¼merdaten und optional E-Mail-Vorlagen.</p>
                
                <h3>Beispiel-Struktur:</h3>
                <pre><code><?php echo esc_html( json_encode( $this->get_example_json(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) ); ?></code></pre>
            </div>

            <div class="fh-card">
                <h2>Import</h2>
                <form id="fh-import-form" method="post" enctype="multipart/form-data">
                    <div class="fh-form-group">
                        <label for="json_input">JSON einfÃ¼gen:</label>
                        <textarea name="json" id="json_input" rows="15" style="width: 100%; font-family: monospace; font-size: 13px;" placeholder='{ "domain": "villa-seeblick.de", ... }'></textarea>
                    </div>
                    <div class="fh-form-group">
                        <label for="json_file">Oder .json-Datei hochladen:</label>
                        <input type="file" name="json_file" id="json_file" accept=".json">
                    </div>
                    <button type="button" id="fh-import-preview" class="button button-secondary">Vorschau anzeigen</button>
                    <button type="button" id="fh-import-execute" class="button button-primary" style="display:none; margin-left: 10px;">Importieren</button>
                </form>

                <div id="fh-import-preview-area" style="display:none; margin-top: 20px;"></div>
                <div id="fh-import-result" style="display:none; margin-top: 20px;"></div>
            </div>
        </div>
        <?php
    }

    // ==================== FRONTEND-HTML IMPORT ====================

    public function render_html_import(): void {
        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-database.php';
        $db = Database::instance();
        $properties = $db->get_all_properties();
        ?>
        <meta charset="UTF-8">
        <div class="wrap fh-headless-wrap">
            <h1>Frontend-HTML importieren & verwalten</h1>

            <div class="fh-card">
                <h2>Was macht das?</h2>
                <p>Hier laden Sie die <strong>komplette HTML-Datei</strong> (das Frontend) fÃ¼r eine Ferienwohnung hoch. Das HTML wird in der Datenbank gespeichert und kann dann:</p>
                <ul>
                    <li>Als <code>index.html</code> heruntergeladen werden (fÃ¼r FTP-Upload auf den Webspace der Domain)</li>
                    <li>Per Klick deployt werden (schreibt die Datei in <code>wp-content/uploads/fh-frontends/</code>)</li>
                    <li>Ãœber einen PHP-Router direkt ausgeliefert werden (siehe unten)</li>
                </ul>
                <p><strong>Wichtig:</strong> Die HTML-Datei muss die Variable <code>CONFIG.apiBase</code> auf Ihre WP-REST-URL setzen (z. B. <code>https://ihre-domain.de/wp-json/fh/v1</code>).</p>
            </div>

            <div class="fh-card">
                <h2>HTML importieren</h2>
                <form id="fh-html-import-form" method="post" enctype="multipart/form-data">
                    <div class="fh-form-group">
                        <label for="html_property">Ferienwohnung auswÃ¤hlen:</label>
                        <select name="property_id" id="html_property" required>
                            <option value="">â€“ Bitte wÃ¤hlen â€“</option>
                            <?php foreach ( $properties as $p ): ?>
                                <option value="<?php echo $p['id']; ?>">
                                    <?php echo esc_html( $p['name_de'] . ' (' . $p['domain'] . ')' ); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <p class="description">WÃ¤hlen Sie zuerst die Ferienwohnung, dann HTML laden oder hochladen.</p>
                    </div>

                    <div class="fh-form-group">
                        <label for="html_input">HTML einfÃ¼gen (Textarea):</label>
                        <textarea name="html" id="html_input" rows="12" style="width: 100%; font-family: monospace; font-size: 13px;" placeholder="<!DOCTYPE html>..."></textarea>
                    </div>

                    <div class="fh-form-group">
                        <label for="html_file">Oder .html-Datei hochladen:</label>
                        <input type="file" name="html_file" id="html_file" accept=".html,.htm">
                    </div>

                    <button type="button" id="fh-html-import-preview" class="button button-secondary">Vorschau / PrÃ¼fen</button>
                    <button type="button" id="fh-html-import-execute" class="button button-primary" style="display:none; margin-left: 10px;">Speichern in DB</button>
                    <button type="button" id="fh-html-download" class="button" style="display:none; margin-left: 10px;">Als index.html herunterladen</button>
                </form>

                <div id="fh-html-import-preview-area" style="display:none; margin-top: 20px;"></div>
                <div id="fh-html-import-result" style="display:none; margin-top: 20px;"></div>
            </div>

            <div class="fh-card">
                <h2>Gespeicherte Frontend-HTMLs</h2>
                <?php if ( empty( $properties ) ): ?>
                    <p>Keine Ferienwohnungen vorhanden. Erst <a href="<?php echo admin_url( 'admin.php?page=fh-headless-import' ); ?>">JSON importieren</a>.</p>
                <?php else: ?>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th>Domain</th>
                                <th>Name</th>
                                <th>HTML gespeichert</th>
                                <th>GrÃ¶ÃŸe</th>
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ( $properties as $p ):
                                $html = $db->get_property_frontend_html( $p['id'] );
                                $has_html = ! empty( $html );
                                $size = $has_html ? round( strlen( $html ) / 1024, 1 ) . ' KB' : 'â€”';
                            ?>
                            <tr>
                                <td><strong><?php echo esc_html( $p['domain'] ); ?></strong></td>
                                <td><?php echo esc_html( $p['name_de'] ); ?></td>
                                <td><?php echo $has_html ? '<span style="color:#46b450;">âœ“ Ja</span>' : '<span style="color:#a83232;">âœ— Nein</span>'; ?></td>
                                <td><?php echo $size; ?></td>
                                <td>
                                    <button type="button" class="button button-small fh-btn-load-html" data-property-id="<?php echo $p['id']; ?>" data-nonce="<?php echo wp_create_nonce( 'fh_headless_nonce' ); ?>">Laden / Bearbeiten</button>
                                    <?php if ( $has_html ): ?>
                                        <button type="button" class="button button-small fh-btn-download-html" data-property-id="<?php echo $p['id']; ?>" data-nonce="<?php echo wp_create_nonce( 'fh_headless_nonce' ); ?>" style="margin-left: 5px;">Herunterladen</button>
                                    <?php endif; ?>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>

            <div class="fh-card" style="margin-top: 20px;">
                <h2>Deployment-Optionen</h2>
                <h3>Option A: Manuell per FTP (einfachster Weg)</h3>
                <ol>
                    <li>HTML hier speichern â†’ â€žAls index.html herunterladenâ€œ</li>
                    <li>Datei per FTP/SFTP in den Document-Root der Addon-Domain hochladen (z. B. <code>/public_html/villa-seeblick.de/index.html</code>)</li>
                    <li>Fertig â€“ die Domain liefert das Frontend aus</li>
                </ol>

                <h3>Option B: PHP-Router (alle Domains auf WP-Ordner)</h3>
                <p>Wenn <strong>alle Addon-Domains auf denselben WP-Ordner</code> zeigen, kÃ¶nnen Sie nicht verschiedene <code>index.html</code> Dateien ablegen. LÃ¶sung:</p>
                <ol>
                    <li>Erstellen Sie eine Datei <code>fh-frontend.php</code> im WP-Root (neben <code>index.php</code>):</li>
                </ol>
                <p><em>Der PHP-Router-Code ist im <a href="<?php echo esc_url( plugin_dir_url( __FILE__ ) . '../../README.md' ); ?>" target="_blank">README.md</a> des Plugins dokumentiert. Kurzversion:</em></p>
<pre><code>// fh-frontend.php im WP-Root anlegen
// 1. Domain aus HTTP_HOST / X-Forwarded-Host ermitteln
// 2. frontend_html aus DB laden (wp_fh_properties)
// 3. HTML ausgeben oder WP normal laden als Fallback</code></pre>
                <p>Dann in <code>.htaccess</code> (vor WP-Regeln) oder nginx-Config: Alle Requests auf <code>fh-frontend.php</code> umleiten, wenn Domain eine Ferienwohnung ist.</p>
                <p><strong>Oder einfacher:</strong> Nutzen Sie Option A (FTP) â€“ jede Domain hat ihren eigenen Document-Root (Subfolder), dort liegt die <code>index.html</code>.</p>
            </div>
        </div>
        <?php
    }

    private function get_example_json(): array {
        return [
            'domain'              => 'villa-seeblick.de',
            'name_de'             => 'Villa Seeblick',
            'name_en'             => 'Villa Lake View',
            'place_de'            => 'Mustersee',
            'place_en'            => 'Sample Lake',
            'price_per_night'     => 150.00,
            'currency'            => 'EUR',
            'max_guests'          => 6,
            'min_nights'          => 3,
            'max_nights'          => 21,
            'downpayment_percent' => 25.00,
            'description_de'      => 'WunderschÃ¶ne Villa direkt am See mit eigenem Bootssteg.',
            'description_en'      => 'Beautiful villa directly on the lake with private jetty.',
            'images'              => [
                'https://example.com/image1.jpg',
                'https://example.com/image2.jpg'
            ],
            'owner_name'          => 'Max Mustermann',
            'owner_address'       => 'SeestraÃŸe 1, 12345 Mustersee',
            'owner_email'         => 'max@villa-seeblick.de',
            'owner_phone'         => '+49 123 456789',
            'owner_whatsapp'      => '+49 123 456789',
            'owner_website'       => 'https://villa-seeblick.de',
            'seasons'             => [
                [
                    'name_de'        => 'Nebensaison',
                    'name_en'        => 'Low Season',
                    'start_month_day'=> '01-01',
                    'end_month_day'  => '04-30',
                    'price_per_night'=> 120.00,
                    'is_active'      => true,
                ],
                [
                    'name_de'        => 'Hauptsaison',
                    'name_en'        => 'High Season',
                    'start_month_day'=> '05-01',
                    'end_month_day'  => '09-30',
                    'price_per_night'=> 180.00,
                    'is_active'      => true,
                ],
                [
                    'name_de'        => 'Weihnachten/Silvester',
                    'name_en'        => 'Christmas/New Year',
                    'start_month_day'=> '12-20',
                    'end_month_day'  => '01-06',
                    'price_per_night'=> 220.00,
                    'is_active'      => true,
                ],
            ],
            'email_templates'     => [
                'confirmation' => [
                    'de' => [
                        'subject' => 'Ihre Buchung bei Villa Seeblick: {booking_no}',
                        'body'    => '<p>Individuelle BestÃ¤tigung...</p>'
                    ],
                    'en' => [
                        'subject' => 'Your booking at Villa Lake View: {booking_no}',
                        'body'    => '<p>Custom confirmation...</p>'
                    ],
                ],
                'rejection' => [
                    'de' => [
                        'subject' => 'Absage: {booking_no}',
                        'body'    => '<p>Individuelle Absage...</p>'
                    ],
                    'en' => [
                        'subject' => 'Declined: {booking_no}',
                        'body'    => '<p>Custom rejection...</p>'
                    ],
                ],
            ],
        ];
    }

    // ==================== E-MAIL VORLAGEN ====================

    public function render_email_templates(): void {
        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-email.php';
        $email = Email::instance();
        $templates = $email->get_all_templates();

        // Gruppieren nach Type
        $grouped = [];
        foreach ( $templates as $t ) {
            $grouped[ $t['template_type'] ][ $t['lang'] ] = $t;
        }

        $types = [ 'confirmation' => 'BestÃ¤tigung', 'rejection' => 'Absage' ];
        $langs = [ 'de' => 'Deutsch', 'en' => 'Englisch' ];
        ?>
        <meta charset="UTF-8">
        <div class="wrap fh-headless-wrap">
            <h1>E-Mail Vorlagen</h1>

            <div class="fh-card">
                <p>Hier kÃ¶nnen Sie die E-Mail-Vorlagen fÃ¼r BuchungsbestÃ¤tigungen und Absagen bearbeiten. VerfÃ¼gbare Platzhalter:</p>
                <ul>
                    <li><code>{guest_name}</code>, <code>{guest_email}</code>, <code>{guest_street}</code>, <code>{guest_zip}</code>, <code>{guest_city}</code>, <code>{guest_country}</code></li>
                    <li><code>{booking_no}</code>, <code>{token}</code>, <code>{arrival}</code>, <code>{departure}</code></li>
                    <li><code>{adults}</code>, <code>{children}</code>, <code>{total}</code>, <code>{downpayment}</code>, <code>{remainder}</code>, <code>{currency}</code>, <code>{downpayment_percent}</code></li>
                    <li><code>{property_name}</code>, <code>{property_place}</code></li>
                    <li><code>{owner_name}</code>, <code>{owner_address}</code>, <code>{owner_email}</code>, <code>{owner_phone}</code>, <code>{owner_whatsapp}</code>, <code>{owner_website}</code></li>
                    <li><code>{message}</code>, <code>{confirmation_url}</code></li>
                </ul>
            </div>

            <?php foreach ( $types as $type_key => $type_label ): ?>
                <div class="fh-card" style="margin-top: 20px;">
                    <h2><?php echo $type_label; ?> E-Mails</h2>
                    <?php foreach ( $langs as $lang_key => $lang_label ): 
                        $template = $grouped[ $type_key ][ $lang_key ] ?? [
                            'subject' => '',
                            'body'    => '',
                        ];
                    ?>
                        <div class="fh-template-editor" data-type="<?php echo $type_key; ?>" data-lang="<?php echo $lang_key; ?>">
                            <h3><?php echo $lang_label; ?></h3>
                            <div class="fh-form-group">
                                <label>Betreff:</label>
                                <input type="text" class="fh-template-subject" value="<?php echo esc_attr( $template['subject'] ); ?>" style="width: 100%;">
                            </div>
                            <div class="fh-form-group">
                                <label>Inhalt (HTML):</label>
                                <textarea class="fh-template-body" rows="15" style="width: 100%; font-family: monospace; font-size: 13px;"><?php echo esc_textarea( $template['body'] ); ?></textarea>
                            </div>
                            <div class="fh-template-actions">
                                <button type="button" class="button fh-btn-preview-template" data-type="<?php echo $type_key; ?>" data-lang="<?php echo $lang_key; ?>">Vorschau</button>
                                <button type="button" class="button button-primary fh-btn-save-template" data-type="<?php echo $type_key; ?>" data-lang="<?php echo $lang_key; ?>" style="margin-left: 10px;">Speichern</button>
                                <span class="fh-template-status"></span>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endforeach; ?>

            <div id="fh-email-preview-modal" class="fh-modal" style="display:none;">
                <div class="fh-modal-content">
                    <h3>E-Mail Vorschau</h3>
                    <button class="fh-modal-close">&times;</button>
                    <iframe id="fh-email-preview-frame" style="width: 100%; height: 500px; border: 1px solid #ddd;"></iframe>
                </div>
            </div>
        </div>
        <?php
    }

    // ==================== SMTP EINSTELLUNGEN ====================

    public function render_smtp_settings(): void {
        $email = Email::instance();
        $settings = $email->get_smtp_settings();
        ?>
        <meta charset="UTF-8">
        <div class="wrap fh-headless-wrap">
            <h1>SMTP Einstellungen</h1>

            <div class="fh-card">
                <p>StandardmÃ¤ÃŸig nutzt das Plugin <code>wp_mail()</code> (PHP mail() oder konfigurierte SMTP-Plugins). Hier kÃ¶nnen Sie optional einen eigenen SMTP-Server konfigurieren.</p>
            </div>

            <div class="fh-card">
                <h2>Konfiguration</h2>
                <form id="fh-smtp-form" method="post">
                    <div class="fh-form-group">
                        <label>
                            <input type="checkbox" name="smtp_enabled" value="1" <?php checked( $settings['enabled'] ); ?>> SMTP aktivieren
                        </label>
                    </div>

                    <div class="fh-form-row">
                        <div class="fh-form-group">
                            <label for="smtp_host">SMTP Host:</label>
                            <input type="text" name="smtp_host" id="smtp_host" value="<?php echo esc_attr( $settings['host'] ); ?>" placeholder="smtp.example.com">
                        </div>
                        <div class="fh-form-group">
                            <label for="smtp_port">Port:</label>
                            <input type="number" name="smtp_port" id="smtp_port" value="<?php echo esc_attr( $settings['port'] ); ?>" placeholder="587">
                        </div>
                    </div>

                    <div class="fh-form-row">
                        <div class="fh-form-group">
                            <label for="smtp_encryption">VerschlÃ¼sselung:</label>
                            <select name="smtp_encryption" id="smtp_encryption">
                                <option value="tls" <?php selected( $settings['encryption'], 'tls' ); ?>>TLS (STARTTLS, Port 587)</option>
                                <option value="ssl" <?php selected( $settings['encryption'], 'ssl' ); ?>>SSL (Port 465)</option>
                                <option value="none" <?php selected( $settings['encryption'], 'none' ); ?>>Keine</option>
                            </select>
                        </div>
                    </div>

                    <div class="fh-form-group">
                        <label for="smtp_username">Benutzername:</label>
                        <input type="text" name="smtp_username" id="smtp_username" value="<?php echo esc_attr( $settings['username'] ); ?>">
                    </div>

                    <div class="fh-form-group">
                        <label for="smtp_password">Passwort:</label>
                        <input type="password" name="smtp_password" id="smtp_password" value="<?php echo esc_attr( $settings['password'] ); ?>" autocomplete="current-password">
                        <p class="description">Wird verschlÃ¼sselt in der Datenbank gespeichert.</p>
                    </div>

                    <div class="fh-form-row">
                        <div class="fh-form-group">
                            <label for="smtp_from_email">Absender E-Mail:</label>
                            <input type="email" name="smtp_from_email" id="smtp_from_email" value="<?php echo esc_attr( $settings['from_email'] ); ?>" placeholder="noreply@example.com">
                        </div>
                        <div class="fh-form-group">
                            <label for="smtp_from_name">Absender Name:</label>
                            <input type="text" name="smtp_from_name" id="smtp_from_name" value="<?php echo esc_attr( $settings['from_name'] ); ?>" placeholder="Ferienwohnungen">
                        </div>
                    </div>

                    <button type="button" id="fh-smtp-save" class="button button-primary">Einstellungen speichern</button>
                    <button type="button" id="fh-smtp-test" class="button" style="margin-left: 10px;">Test-E-Mail senden</button>
                </form>

                <div id="fh-smtp-test-area" style="display:none; margin-top: 15px;">
                    <label>Test-E-Mail an:</label>
                    <input type="email" id="fh-smtp-test-email" placeholder="ihre@email.de" style="width: 300px;">
                    <button type="button" id="fh-smtp-test-send" class="button" style="margin-left: 10px;">Senden</button>
                </div>
            </div>
        </div>
        <?php
    }
}





