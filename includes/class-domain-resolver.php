<?php
/**
 * Domain Resolver - Erkennt die Ferienwohnung anhand der aufgerufenen Domain
 */

namespace FH_Headless;

class Domain_Resolver {

    private static $instance = null;
    private $property = null;
    private $property_id = 0;

    public static function instance(): self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // Früh initialisieren für REST API
        add_action( 'rest_api_init', [ $this, 'resolve_property_for_request' ], 0 );
    }

    /**
     * Löst die Domain für den aktuellen Request auf
     * Priorität: X-Forwarded-Host > HTTP_HOST > ?domain= query param
     */
    public function resolve_property_for_request(): void {
        // Für Health-Check nicht nötig
        if ( isset( $_SERVER['REQUEST_URI'] ) && strpos( $_SERVER['REQUEST_URI'], '/fh/v1/health' ) !== false ) {
            return;
        }

        $domain = $this->get_request_domain();

        if ( ! $domain ) {
            return;
        }

        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-database.php';
        $db = Database::instance();
        $this->property = $db->get_property_by_domain( $domain );

        if ( $this->property ) {
            $this->property_id = (int) $this->property['id'];
        }
    }

    /**
     * Ermittelt die Domain aus dem Request
     */
    private function get_request_domain(): ?string {
        // 1. X-Forwarded-Host (wichtig hinter Reverse Proxy / Cloudflare / Load Balancer)
        if ( ! empty( $_SERVER['HTTP_X_FORWARDED_HOST'] ) ) {
            // Kann mehrere Hosts enthalten (kommagetrennt), ersten nehmen
            $hosts = explode( ',', $_SERVER['HTTP_X_FORWARDED_HOST'] );
            $domain = trim( $hosts[0] );
            if ( $domain ) {
                return $domain;
            }
        }

        // 2. HTTP_HOST (normaler Direktbetrieb)
        if ( ! empty( $_SERVER['HTTP_HOST'] ) ) {
            return $_SERVER['HTTP_HOST'];
        }

        // 3. Query-Param ?domain=... (Fallback für lokale Tests)
        if ( ! empty( $_GET['domain'] ) ) {
            return sanitize_text_field( wp_unslash( $_GET['domain'] ) );
        }

        // 4. SERVER_NAME als letzter Fallback
        if ( ! empty( $_SERVER['SERVER_NAME'] ) ) {
            return $_SERVER['SERVER_NAME'];
        }

        return null;
    }

    /**
     * Gibt die aktuell erkannte Property zurück
     */
    public function get_property(): ?array {
        if ( $this->property === null ) {
            $this->resolve_property_for_request();
        }
        return $this->property;
    }

    /**
     * Gibt die Property ID zurück
     */
    public function get_property_id(): int {
        if ( $this->property_id === 0 ) {
            $this->resolve_property_for_request();
        }
        return $this->property_id;
    }

    /**
     * Prüft ob eine Property für die aktuelle Domain existiert
     */
    public function has_property(): bool {
        return $this->get_property() !== null;
    }

    /**
     * Erzwingt eine Property (für Tests/Admin)
     */
    public function set_property( array $property ): void {
        $this->property = $property;
        $this->property_id = (int) $property['id'];
    }

    /**
     * Hilfsfunktion für REST API: Liefert 404 wenn keine Property gefunden
     */
    public function require_property(): array {
        $property = $this->get_property();
        if ( ! $property ) {
            // Wird im API-Handler als Exception geworfen
            throw new \Exception( 'no_property_for_domain', 404 );
        }
        return $property;
    }
}