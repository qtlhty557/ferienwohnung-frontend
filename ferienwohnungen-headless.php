<?php
/**
 * Plugin Name: Ferienwohnungen Headless API
 * Plugin URI: https://example.com
 * Description: Headless REST API für Ferienwohnungen mit Domain-basiertem Routing, saisonalen Preisen, Buchungs-Workflow und Import-System.
 * Version: 1.0.0
 * Author: Dein Name
 * License: GPL-2.0-or-later
 * Text Domain: fh-headless
 * Requires at least: 6.0
 * Requires PHP: 8.1
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'FH_HEADLESS_VERSION', '1.0.0' );
define( 'FH_HEADLESS_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'FH_HEADLESS_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'FH_HEADLESS_API_NAMESPACE', 'fh/v1' );

// Autoloader für Klassen (Dateien heißen class-*.php)
spl_autoload_register( function ( $class ) {
    $prefix = 'FH_Headless\\';
    $base_dir = FH_HEADLESS_PLUGIN_DIR . 'includes/';

    $len = strlen( $prefix );
    if ( strncmp( $class, $prefix, $len ) !== 0 ) {
        return;
    }

    $relative_class = substr( $class, $len );
    // Class-Name zu Dateiname: Database -> class-database.php
    $file_name = 'class-' . strtolower( str_replace( '\\', '-', $relative_class ) ) . '.php';
    $file = $base_dir . $file_name;

    if ( file_exists( $file ) ) {
        require_once $file;
    }
} );

/**
 * Hauptklasse des Plugins
 */
final class FH_Headless_Plugin {

    private static $instance = null;

    public static function instance(): self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->init_hooks();
    }

    private function init_hooks(): void {
        // Activation / Deactivation
        register_activation_hook( __FILE__, [ $this, 'activate' ] );
        register_deactivation_hook( __FILE__, [ $this, 'deactivate' ] );

        // Init
        add_action( 'plugins_loaded', [ $this, 'load_textdomain' ] );
        add_action( 'init', [ $this, 'init' ], 10 );
        add_action( 'rest_api_init', [ $this, 'register_rest_routes' ] );

        // Admin
        add_action( 'admin_menu', [ $this, 'admin_menu' ] );
        add_action( 'admin_enqueue_scripts', [ $this, 'admin_enqueue_scripts' ] );
        add_action( 'wp_ajax_fh_import_preview', [ $this, 'ajax_import_preview' ] );
        add_action( 'wp_ajax_fh_import_execute', [ $this, 'ajax_import_execute' ] );
        add_action( 'wp_ajax_fh_html_import_preview', [ $this, 'ajax_html_import_preview' ] );
        add_action( 'wp_ajax_fh_html_import_execute', [ $this, 'ajax_html_import_execute' ] );
        add_action( 'wp_ajax_fh_html_download', [ $this, 'ajax_html_download' ] );
        add_action( 'wp_ajax_fh_booking_action', [ $this, 'ajax_booking_action' ] );
        add_action( 'wp_ajax_fh_email_preview', [ $this, 'ajax_email_preview' ] );
        add_action( 'wp_ajax_fh_save_email_template', [ $this, 'ajax_save_email_template' ] );
        add_action( 'wp_ajax_fh_save_smtp_settings', [ $this, 'ajax_save_smtp_settings' ] );
        add_action( 'wp_ajax_fh_test_smtp', [ $this, 'ajax_test_smtp' ] );
    }

    public function load_textdomain(): void {
        load_plugin_textdomain( 'fh-headless', false, dirname( plugin_basename( __FILE__ ) ) . '/languages/' );
    }

    public function activate(): void {
        // DB Tabellen erstellen
        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-database.php';
        FH_Headless\Database::instance()->create_tables();

        // Default Email Templates setzen
        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-email.php';
        FH_Headless\Email::instance()->set_default_templates();

        flush_rewrite_rules();
    }

    public function deactivate(): void {
        flush_rewrite_rules();
    }

    public function init(): void {
        // Domain Resolver früh laden
        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-domain-resolver.php';
        FH_Headless\Domain_Resolver::instance();
    }

    public function register_rest_routes(): void {
        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-api.php';
        FH_Headless\API::instance()->register_routes();
    }

    public function admin_menu(): void {
        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-admin.php';
        FH_Headless\Admin::instance()->register_menu();
    }

    public function admin_enqueue_scripts( $hook ): void {
        // DEBUG: Log the hook
        error_log( 'FH Headless admin_enqueue_scripts hook: ' . $hook );

        // Erlaubte Hooks: Hauptmenü, alle Submenüs, und direkte Page-Hooks
        // Der Hook nutzt den Menu-Slug "ferienwohnungen" (nicht "fh-headless")
        $allowed = [
            'toplevel_page_ferienwohnungen',
            'ferienwohnungen_page_fh-headless-bookings',
            'ferienwohnungen_page_fh-headless-import',
            'ferienwohnungen_page_fh-headless-html-import',
            'ferienwohnungen_page_fh-headless-email-templates',
            'ferienwohnungen_page_fh-headless-smtp',
        ];
        // Fallback: String enthält 'fh-headless' oder 'ferienwohnungen'
        if ( ! in_array( $hook, $allowed, true ) && strpos( $hook, 'fh-headless' ) === false && strpos( $hook, 'ferienwohnungen' ) === false ) {
            error_log( 'FH Headless: Hook not allowed, returning early: ' . $hook );
            return;
        }

        wp_enqueue_style(
            'fh-headless-admin',
            FH_HEADLESS_PLUGIN_URL . 'admin/css/admin.css',
            [],
            FH_HEADLESS_VERSION
        );

        wp_enqueue_script(
            'fh-headless-admin',
            FH_HEADLESS_PLUGIN_URL . 'admin/js/admin.js',
            [ 'jquery' ],
            FH_HEADLESS_VERSION,
            true
        );

        wp_localize_script( 'fh-headless-admin', 'fhAjax', [
            'ajaxurl' => admin_url( 'admin-ajax.php' ),
            'nonce'   => wp_create_nonce( 'fh_headless_nonce' ),
        ] );
    }

    // AJAX Handlers
    private function get_json_from_request(): string {
        // 1. $_POST (Standard bei application/x-www-form-urlencoded)
        if ( ! empty( $_POST['json'] ) ) {
            return wp_unslash( $_POST['json'] );
        }
        // 2. $_REQUEST (fängt auch multipart/form-data ohne Datei)
        if ( ! empty( $_REQUEST['json'] ) ) {
            return wp_unslash( $_REQUEST['json'] );
        }
        // 3. php://input (roher Request-Body, z. B. bei application/json)
        $raw = file_get_contents( 'php://input' );
        if ( $raw ) {
            $parsed = [];
            parse_str( $raw, $parsed );
            if ( ! empty( $parsed['json'] ) ) {
                return wp_unslash( $parsed['json'] );
            }
            // Falls der gesamte Body das JSON ist
            if ( str_starts_with( trim( $raw ), '{' ) ) {
                return $raw;
            }
        }
        // 4. Datei-Upload
        if ( isset( $_FILES['json_file'] ) && $_FILES['json_file']['error'] === UPLOAD_ERR_OK ) {
            return file_get_contents( $_FILES['json_file']['tmp_name'] );
        }
        return '';
    }

    public function ajax_import_preview(): void {
        check_ajax_referer( 'fh_headless_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Keine Berechtigung' );
        }

        $json = $this->get_json_from_request();

        if ( empty( $json ) ) {
            // Debug-Info für Entwicklung
            error_log( 'FH Import Preview - Empty JSON. POST: ' . print_r( array_keys( $_POST ), true ) . ' FILES: ' . print_r( array_keys( $_FILES ), true ) );
            wp_send_json_error( 'Kein JSON angegeben. Bitte Textarea füllen oder Datei hochladen.' );
        }

        $data = json_decode( $json, true );
        if ( json_last_error() !== JSON_ERROR_NONE ) {
            wp_send_json_error( 'Ungültiges JSON: ' . json_last_error_msg() );
        }

        $preview = $this->generate_import_preview( $data );
        wp_send_json_success( $preview );
    }

    public function ajax_import_execute(): void {
        check_ajax_referer( 'fh_headless_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Keine Berechtigung' );
        }

        $json = $this->get_json_from_request();

        if ( empty( $json ) ) {
            error_log( 'FH Import Execute - Empty JSON. POST keys: ' . implode( ', ', array_keys( $_POST ) ) );
            wp_send_json_error( 'Kein JSON angegeben. Bitte Textarea füllen oder Datei hochladen.' );
        }

        $data = json_decode( $json, true );
        if ( json_last_error() !== JSON_ERROR_NONE ) {
            wp_send_json_error( 'Ungültiges JSON' );
        }

        $result = $this->execute_import( $data );
        wp_send_json_success( $result );
    }

    public function ajax_booking_action(): void {
        check_ajax_referer( 'fh_headless_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Keine Berechtigung' );
        }

        $booking_id = isset( $_POST['booking_id'] ) ? intval( $_POST['booking_id'] ) : 0;
        $action     = isset( $_POST['action_type'] ) ? sanitize_text_field( $_POST['action_type'] ) : '';

        if ( ! $booking_id || ! in_array( $action, [ 'confirm', 'reject' ], true ) ) {
            wp_send_json_error( 'Ungültige Parameter' );
        }

        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-database.php';
        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-email.php';

        $db    = FH_Headless\Database::instance();
        $email = FH_Headless\Email::instance();

        $booking = $db->get_booking( $booking_id );
        if ( ! $booking ) {
            wp_send_json_error( 'Buchung nicht gefunden' );
        }

        $new_status = $action === 'confirm' ? 'confirmed' : 'rejected';
        $db->update_booking_status( $booking_id, $new_status );

        // E-Mail senden
        $property = $db->get_property_by_id( $booking['property_id'] );
        $email->send_booking_response( $booking, $property, $new_status );

        wp_send_json_success( [
            'message' => $action === 'confirm' ? 'Buchung bestätigt und E-Mail versendet' : 'Buchung abgelehnt und E-Mail versendet',
            'status'  => $new_status,
        ] );
    }

    public function ajax_email_preview(): void {
        check_ajax_referer( 'fh_headless_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Keine Berechtigung' );
        }

        $template_type = isset( $_POST['template_type'] ) ? sanitize_text_field( $_POST['template_type'] ) : '';
        $lang          = isset( $_POST['lang'] ) ? sanitize_text_field( $_POST['lang'] ) : 'de';
        $booking_id    = isset( $_POST['booking_id'] ) ? intval( $_POST['booking_id'] ) : 0;

        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-database.php';
        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-email.php';

        $db    = FH_Headless\Database::instance();
        $email = FH_Headless\Email::instance();

        $booking = $booking_id ? $db->get_booking( $booking_id ) : $db->get_dummy_booking();
        $property = $booking ? $db->get_property_by_id( $booking['property_id'] ) : $db->get_dummy_property();

        $preview = $email->render_template( $template_type, $lang, $booking, $property );
        wp_send_json_success( $preview );
    }

    public function ajax_save_email_template(): void {
        check_ajax_referer( 'fh_headless_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Keine Berechtigung' );
        }

        $template_type = isset( $_POST['template_type'] ) ? sanitize_text_field( $_POST['template_type'] ) : '';
        $lang          = isset( $_POST['lang'] ) ? sanitize_text_field( $_POST['lang'] ) : 'de';
        $subject       = isset( $_POST['subject'] ) ? wp_unslash( $_POST['subject'] ) : '';
        $body          = isset( $_POST['body'] ) ? wp_unslash( $_POST['body'] ) : '';

        if ( empty( $template_type ) || empty( $subject ) || empty( $body ) ) {
            wp_send_json_error( 'Alle Felder sind erforderlich' );
        }

        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-email.php';
        $email = FH_Headless\Email::instance();
        $email->save_template( $template_type, $lang, $subject, $body );

        wp_send_json_success( [ 'message' => 'Vorlage gespeichert' ] );
    }

    public function ajax_save_smtp_settings(): void {
        check_ajax_referer( 'fh_headless_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Keine Berechtigung' );
        }

        $settings = [
            'enabled'      => isset( $_POST['smtp_enabled'] ) ? true : false,
            'host'         => isset( $_POST['smtp_host'] ) ? sanitize_text_field( $_POST['smtp_host'] ) : '',
            'port'         => isset( $_POST['smtp_port'] ) ? intval( $_POST['smtp_port'] ) : 587,
            'username'     => isset( $_POST['smtp_username'] ) ? sanitize_text_field( $_POST['smtp_username'] ) : '',
            'password'     => isset( $_POST['smtp_password'] ) ? wp_unslash( $_POST['smtp_password'] ) : '',
            'encryption'   => isset( $_POST['smtp_encryption'] ) ? sanitize_text_field( $_POST['smtp_encryption'] ) : 'tls',
            'from_email'   => isset( $_POST['smtp_from_email'] ) ? sanitize_email( $_POST['smtp_from_email'] ) : '',
            'from_name'    => isset( $_POST['smtp_from_name'] ) ? sanitize_text_field( $_POST['smtp_from_name'] ) : '',
        ];

        update_option( 'fh_headless_smtp', $settings );
        wp_send_json_success( [ 'message' => 'SMTP-Einstellungen gespeichert' ] );
    }

    public function ajax_test_smtp(): void {
        check_ajax_referer( 'fh_headless_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Keine Berechtigung' );
        }

        $to = isset( $_POST['test_email'] ) ? sanitize_email( $_POST['test_email'] ) : '';
        if ( ! $to ) {
            wp_send_json_error( 'Keine E-Mail-Adresse angegeben' );
        }

        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-email.php';
        $email = FH_Headless\Email::instance();
        $result = $email->send_test_email( $to );

        if ( $result ) {
            wp_send_json_success( [ 'message' => 'Test-E-Mail versendet' ] );
        } else {
            wp_send_json_error( 'Versand fehlgeschlagen. Prüfe SMTP-Einstellungen.' );
        }
    }

    private function generate_import_preview( array $data ): array {
        $required = [ 'domain', 'name_de', 'price_per_night', 'currency', 'max_guests', 'min_nights', 'max_nights', 'downpayment_percent', 'owner_name', 'owner_email' ];
        foreach ( $required as $field ) {
            if ( empty( $data[ $field ] ) ) {
                return [ 'error' => "Pflichtfeld fehlt: $field" ];
            }
        }

        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-database.php';
        $db = FH_Headless\Database::instance();
        $existing = $db->get_property_by_domain( $data['domain'] );

        $seasons_count = isset( $data['seasons'] ) && is_array( $data['seasons'] ) ? count( $data['seasons'] ) : 0;

        return [
            'domain'         => $data['domain'],
            'name'           => $data['name_de'],
            'seasons_count'  => $seasons_count,
            'action'         => $existing ? 'update' : 'insert',
            'property_id'    => $existing ? $existing['id'] : null,
            'has_owner_data' => ! empty( $data['owner_name'] ) && ! empty( $data['owner_email'] ),
        ];
    }

    private function execute_import( array $data ): array {
        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-database.php';
        $db = FH_Headless\Database::instance();

        $existing = $db->get_property_by_domain( $data['domain'] );

        $property_data = [
            'domain'             => strtolower( trim( $data['domain'] ) ),
            'name_de'            => sanitize_text_field( $data['name_de'] ),
            'name_en'            => isset( $data['name_en'] ) ? sanitize_text_field( $data['name_en'] ) : '',
            'place_de'           => isset( $data['place_de'] ) ? sanitize_text_field( $data['place_de'] ) : '',
            'place_en'           => isset( $data['place_en'] ) ? sanitize_text_field( $data['place_en'] ) : '',
            'price_per_night'    => floatval( $data['price_per_night'] ),
            'currency'           => sanitize_text_field( $data['currency'] ),
            'max_guests'         => intval( $data['max_guests'] ),
            'min_nights'         => intval( $data['min_nights'] ),
            'max_nights'         => intval( $data['max_nights'] ),
            'downpayment_percent'=> floatval( $data['downpayment_percent'] ),
            'description_de'     => isset( $data['description_de'] ) ? wp_kses_post( $data['description_de'] ) : '',
            'description_en'     => isset( $data['description_en'] ) ? wp_kses_post( $data['description_en'] ) : '',
            'images'             => isset( $data['images'] ) && is_array( $data['images'] ) ? wp_json_encode( $data['images'] ) : '[]',
            'frontend_html'      => isset( $data['frontend_html'] ) ? $data['frontend_html'] : '',
            'owner_name'         => sanitize_text_field( $data['owner_name'] ),
            'owner_address'      => isset( $data['owner_address'] ) ? sanitize_textarea_field( $data['owner_address'] ) : '',
            'owner_email'        => sanitize_email( $data['owner_email'] ),
            'owner_phone'        => isset( $data['owner_phone'] ) ? sanitize_text_field( $data['owner_phone'] ) : '',
            'owner_whatsapp'     => isset( $data['owner_whatsapp'] ) ? sanitize_text_field( $data['owner_whatsapp'] ) : '',
            'owner_website'      => isset( $data['owner_website'] ) ? esc_url_raw( $data['owner_website'] ) : '',
        ];

        if ( $existing ) {
            $property_id = $db->update_property( $existing['id'], $property_data );
            $action = 'updated';
        } else {
            $property_id = $db->insert_property( $property_data );
            $action = 'created';
        }

        // Saisons importieren
        if ( isset( $data['seasons'] ) && is_array( $data['seasons'] ) ) {
            $db->delete_seasons( $property_id );
            foreach ( $data['seasons'] as $season ) {
                $season_data = [
                    'property_id'    => $property_id,
                    'name_de'        => sanitize_text_field( $season['name_de'] ?? '' ),
                    'name_en'        => sanitize_text_field( $season['name_en'] ?? '' ),
                    'start_month_day'=> sanitize_text_field( $season['start_month_day'] ?? '' ),
                    'end_month_day'  => sanitize_text_field( $season['end_month_day'] ?? '' ),
                    'price_per_night'=> floatval( $season['price_per_night'] ?? 0 ),
                    'is_active'      => isset( $season['is_active'] ) ? (bool) $season['is_active'] : true,
                ];
                $db->insert_season( $season_data );
            }
        }

        // Email Templates importieren falls vorhanden
        if ( isset( $data['email_templates'] ) && is_array( $data['email_templates'] ) ) {
            require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-email.php';
            $email = FH_Headless\Email::instance();
            foreach ( $data['email_templates'] as $type => $langs ) {
                foreach ( $langs as $lang => $template ) {
                    if ( isset( $template['subject'] ) && isset( $template['body'] ) ) {
                        $email->save_template( $type, $lang, $template['subject'], $template['body'] );
                    }
                }
            }
        }

        return [
            'success'     => true,
            'property_id' => $property_id,
            'action'      => $action,
            'message'     => "Ferienwohnung {$data['domain']} erfolgreich $action.",
        ];
    }

    // ==================== HTML IMPORT AJAX ====================

    public function ajax_html_import_preview(): void {
        check_ajax_referer( 'fh_headless_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Keine Berechtigung' );
        }

        $html = '';
        if ( isset( $_POST['html'] ) ) {
            $html = wp_unslash( $_POST['html'] );
        } elseif ( isset( $_FILES['html_file'] ) && $_FILES['html_file']['error'] === UPLOAD_ERR_OK ) {
            $html = file_get_contents( $_FILES['html_file']['tmp_name'] );
        } elseif ( isset( $_POST['property_id'] ) ) {
            require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-database.php';
            $db = Database::instance();
            $html = $db->get_property_frontend_html( intval( $_POST['property_id'] ) );
        }

        if ( empty( $html ) ) {
            wp_send_json_error( 'Kein HTML angegeben' );
        }

        $dom = new \DOMDocument();
        libxml_use_internal_errors( true );
        // HTML5-tolerant parsen: ENT_HTML5, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        $dom->loadHTML( '<?xml encoding="UTF-8">' . $html, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD );
        $errors = libxml_get_errors();
        libxml_clear_errors();

        // Nur echte Fehler filtern (keine HTML5-Warnungen für header, nav, section, svg etc.)
        $real_errors = array_filter( $errors, function( $e ) {
            $msg = $e->message;
            return ! preg_match( '/(header|nav|section|article|aside|footer|main|svg|figure|figcaption|details|summary|time|mark|template|slot|canvas|video|audio|source|track|embed|object|param|iframe|picture|portal)/i', $msg );
        } );

        $warning = '';
        if ( ! empty( $real_errors ) ) {
            $warning = 'HTML enthält Fehler (wird aber gespeichert): ' . implode( '; ', array_map( fn($e) => $e->message, $real_errors ) );
        }

        $size = strlen( $html );
        $size_kb = round( $size / 1024, 1 );

        // Explizit UTF-8 Header setzen
        header( 'Content-Type: application/json; charset=UTF-8' );
        wp_send_json_success( [
            'size'      => $size,
            'size_kb'   => $size_kb,
            'warning'   => $warning,
            'preview'   => substr( $html, 0, 500 ) . ( $size > 500 ? '...' : '' ),
        ] );
    }

    public function ajax_html_import_execute(): void {
        check_ajax_referer( 'fh_headless_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Keine Berechtigung' );
        }

        $property_id = isset( $_POST['property_id'] ) ? intval( $_POST['property_id'] ) : 0;
        if ( ! $property_id ) {
            wp_send_json_error( 'Keine Property-ID angegeben' );
        }

        $html = '';
        if ( isset( $_POST['html'] ) ) {
            $html = wp_unslash( $_POST['html'] );
        } elseif ( isset( $_FILES['html_file'] ) && $_FILES['html_file']['error'] === UPLOAD_ERR_OK ) {
            $html = file_get_contents( $_FILES['html_file']['tmp_name'] );
        }

        if ( empty( $html ) ) {
            wp_send_json_error( 'Kein HTML angegeben' );
        }

        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-database.php';
        $db = \FH_Headless\Database::instance();

        $success = $db->update_property_frontend_html( $property_id, $html );

        if ( $success ) {
            $property = $db->get_property_by_id( $property_id );
            header( 'Content-Type: application/json; charset=UTF-8' );
            wp_send_json_success( [
                'message'     => "Frontend-HTML für {$property['domain']} gespeichert.",
                'property_id' => $property_id,
                'domain'      => $property['domain'],
                'size'        => strlen( $html ),
            ] );
        } else {
            wp_send_json_error( 'Speichern fehlgeschlagen' );
        }
    }

    public function ajax_html_download(): void {
        check_ajax_referer( 'fh_headless_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Keine Berechtigung' );
        }

        $property_id = isset( $_GET['property_id'] ) ? intval( $_GET['property_id'] ) : 0;
        if ( ! $property_id ) {
            wp_send_json_error( 'Keine Property-ID' );
        }

        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-database.php';
        $db = \FH_Headless\Database::instance();
        $html = $db->get_property_frontend_html( $property_id );
        $property = $db->get_property_by_id( $property_id );

        if ( empty( $html ) ) {
            wp_send_json_error( 'Kein HTML für diese Property gespeichert' );
        }

        $filename = 'index-' . sanitize_file_name( $property['domain'] ) . '.html';
        header( 'Content-Type: text/html; charset=UTF-8' );
        header( 'Content-Disposition: attachment; filename="' . $filename . '"' );
        header( 'Content-Length: ' . strlen( $html ) );
        echo $html;
        exit;
    }
}

// Plugin starten
FH_Headless_Plugin::instance();