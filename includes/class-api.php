<?php
/**
 * REST API Endpunkte unter Namespace fh/v1
 */

namespace FH_Headless;

class API {

    private static $instance = null;

    public static function instance(): self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function register_routes(): void {
        $namespace = FH_HEADLESS_API_NAMESPACE;

        // Health Check
        register_rest_route( $namespace, '/health', [
            'methods'  => 'GET',
            'callback' => [ $this, 'health_check' ],
            'permission_callback' => '__return_true',
        ] );

        // Quote - Preisberechnung
        register_rest_route( $namespace, '/quote', [
            'methods'  => 'GET',
            'callback' => [ $this, 'get_quote' ],
            'permission_callback' => '__return_true',
            'args'     => [
                'arrival'    => [ 'required' => true, 'validate_callback' => [ $this, 'validate_date' ] ],
                'departure'  => [ 'required' => true, 'validate_callback' => [ $this, 'validate_date' ] ],
                'adults'     => [ 'required' => false, 'default' => 2, 'validate_callback' => 'is_numeric', 'sanitize_callback' => 'intval' ],
                'children'   => [ 'required' => false, 'default' => 0, 'validate_callback' => 'is_numeric', 'sanitize_callback' => 'intval' ],
                'lang'       => [ 'required' => false, 'default' => 'de', 'validate_callback' => [ $this, 'validate_lang' ], 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ] );

        // Availability - Belegte Tage
        register_rest_route( $namespace, '/availability', [
            'methods'  => 'GET',
            'callback' => [ $this, 'get_availability' ],
            'permission_callback' => '__return_true',
            'args'     => [
                'lang' => [ 'required' => false, 'default' => 'de', 'validate_callback' => [ $this, 'validate_lang' ], 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ] );

        // Book - Buchungsanfrage erstellen
        register_rest_route( $namespace, '/book', [
            'methods'  => 'POST',
            'callback' => [ $this, 'create_booking' ],
            'permission_callback' => '__return_true',
            'args'     => [
                'guest_name'    => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
                'guest_email'   => [ 'required' => true, 'sanitize_callback' => 'sanitize_email', 'validate_callback' => 'is_email' ],
                'guest_street'  => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
                'guest_zip'     => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
                'guest_city'    => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
                'guest_country' => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
                'arrival'       => [ 'required' => true, 'validate_callback' => [ $this, 'validate_date' ] ],
                'departure'     => [ 'required' => true, 'validate_callback' => [ $this, 'validate_date' ] ],
                'adults'        => [ 'required' => true, 'validate_callback' => 'is_numeric', 'sanitize_callback' => 'intval' ],
                'children'      => [ 'required' => false, 'default' => 0, 'validate_callback' => 'is_numeric', 'sanitize_callback' => 'intval' ],
                'lang'          => [ 'required' => false, 'default' => 'de', 'validate_callback' => [ $this, 'validate_lang' ], 'sanitize_callback' => 'sanitize_text_field' ],
                'message'       => [ 'required' => false, 'default' => '', 'sanitize_callback' => 'sanitize_textarea_field' ],
            ],
        ] );

        // Content Blocks (AGB, Datenschutz, etc.)
        register_rest_route( $namespace, '/content/(?P<key>[a-zA-Z0-9_-]+)', [
            'methods'  => 'GET',
            'callback' => [ $this, 'get_content' ],
            'permission_callback' => '__return_true',
            'args'     => [
                'key'  => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
                'lang' => [ 'required' => false, 'default' => 'de', 'validate_callback' => [ $this, 'validate_lang' ], 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ] );
    }

    // ==================== VALIDIERUNG ====================

    public function validate_date( $value, $request, $param ): bool {
        if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $value ) ) {
            return false;
        }
        $d = strtotime( $value );
        return $d !== false;
    }

    public function validate_lang( $value ): bool {
        return in_array( strtolower( $value ), [ 'de', 'en' ], true );
    }

    // ==================== HELPER ====================

    private function get_property_or_404(): array {
        $resolver = Domain_Resolver::instance();
        try {
            return $resolver->require_property();
        } catch ( \Exception $e ) {
            if ( $e->getCode() === 404 ) {
                return new \WP_Error( 'no_property', 'Keine Ferienwohnung für diese Domain konfiguriert', [ 'status' => 404 ] );
            }
            throw $e;
        }
    }

    private function error_response( string $code, string $message, int $status = 400 ): \WP_REST_Response {
        return new \WP_REST_Response( [ 'error' => $code, 'message' => $message ], $status );
    }

    // ==================== ENDPOINTS ====================

    public function health_check( \WP_REST_Request $request ): \WP_REST_Response {
        $resolver = Domain_Resolver::instance();
        $property = $resolver->get_property();

        return new \WP_REST_Response( [
            'status'   => 'ok',
            'property' => $property ? $property['domain'] : null,
            'version'  => FH_HEADLESS_VERSION,
        ], 200 );
    }

    public function get_quote( \WP_REST_Request $request ): \WP_REST_Response {
        $property = $this->get_property_or_404();
        if ( is_wp_error( $property ) ) {
            return new \WP_REST_Response( $property->get_error_data(), $property->get_error_data()['status'] ?? 404 );
        }

        $arrival   = sanitize_text_field( $request->get_param( 'arrival' ) );
        $departure = sanitize_text_field( $request->get_param( 'departure' ) );
        $adults    = max( 1, intval( $request->get_param( 'adults' ) ) );
        $children  = max( 0, intval( $request->get_param( 'children' ) ) );
        $lang      = strtolower( $request->get_param( 'lang' ) );

        // Validierung
        $arrival_ts   = strtotime( $arrival );
        $departure_ts = strtotime( $departure );
        $today_ts     = strtotime( date( 'Y-m-d' ) );

        if ( $arrival_ts < $today_ts ) {
            return $this->error_response( 'arrival_past', $lang === 'de' ? 'Anreisedatum liegt in der Vergangenheit' : 'Arrival date is in the past', 400 );
        }
        if ( $departure_ts <= $arrival_ts ) {
            return $this->error_response( 'departure_before_arrival', $lang === 'de' ? 'Abreise muss nach Anreise liegen' : 'Departure must be after arrival', 400 );
        }

        $nights = ( $departure_ts - $arrival_ts ) / DAY_IN_SECONDS;

        if ( $nights < $property['min_nights'] ) {
            return $this->error_response( 'min_nights', sprintf(
                $lang === 'de' ? 'Mindestaufenthalt: %d Nächte' : 'Minimum stay: %d nights',
                $property['min_nights']
            ), 400 );
        }
        if ( $nights > $property['max_nights'] ) {
            return $this->error_response( 'max_nights', sprintf(
                $lang === 'de' ? 'Maximalaufenthalt: %d Nächte' : 'Maximum stay: %d nights',
                $property['max_nights']
            ), 400 );
        }
        if ( $adults + $children > $property['max_guests'] ) {
            return $this->error_response( 'max_guests', sprintf(
                $lang === 'de' ? 'Maximal %d Gäste erlaubt' : 'Maximum %d guests allowed',
                $property['max_guests']
            ), 400 );
        }

        // Prüfen ob Zeitraum frei ist
        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-database.php';
        $db = Database::instance();
        $booked_dates = $db->get_booked_dates( $property['id'], $arrival, $departure );

        // Prüfen ob jeden Tag frei
        $current = $arrival_ts;
        while ( $current < $departure_ts ) {
            $date_str = date( 'Y-m-d', $current );
            if ( in_array( $date_str, $booked_dates, true ) ) {
                return $this->error_response( 'not_available', $lang === 'de' ? 'Zeitraum nicht verfügbar' : 'Period not available', 409 );
            }
            $current += DAY_IN_SECONDS;
        }

        // Preisberechnung mit Saisons
        $base_price = (float) $property['price_per_night'];
        $total = 0;
        $price_breakdown = [];

        $current = $arrival_ts;
        while ( $current < $departure_ts ) {
            $date_str = date( 'Y-m-d', $current );
            $seasonal_price = $db->get_seasonal_price( $property['id'], $date_str, $base_price );
            $total += $seasonal_price;

            $season_name = $this->get_season_name( $property['id'], $date_str, $lang );
            $price_breakdown[] = [
                'date'      => $date_str,
                'price'     => $seasonal_price,
                'season'    => $season_name,
                'is_base'   => $seasonal_price === $base_price,
            ];
            $current += DAY_IN_SECONDS;
        }

        $downpayment_percent = (float) $property['downpayment_percent'];
        $downpayment = round( $total * $downpayment_percent / 100, 2 );
        $remainder = round( $total - $downpayment, 2 );

        return new \WP_REST_Response( [
            'property' => [
                'id'   => $property['id'],
                'name' => $property[ "name_{$lang}" ] ?: $property['name_de'],
                'place'=> $property[ "place_{$lang}" ] ?: $property['place_de'],
            ],
            'arrival'     => $arrival,
            'departure'   => $departure,
            'nights'      => $nights,
            'guests'      => $adults + $children,
            'adults'      => $adults,
            'children'    => $children,
            'currency'    => $property['currency'],
            'total'       => round( $total, 2 ),
            'downpayment' => $downpayment,
            'remainder'   => $remainder,
            'downpayment_percent' => $downpayment_percent,
            'price_breakdown' => $price_breakdown,
        ], 200 );
    }

    public function get_availability( \WP_REST_Request $request ): \WP_REST_Response {
        $property = $this->get_property_or_404();
        if ( is_wp_error( $property ) ) {
            return new \WP_REST_Response( $property->get_error_data(), $property->get_error_data()['status'] ?? 404 );
        }

        $lang = strtolower( $request->get_param( 'lang' ) );

        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-database.php';
        $db = Database::instance();

        // Belegte Tage für die nächsten 12 Monate laden
        $from = date( 'Y-m-d' );
        $to   = date( 'Y-m-d', strtotime( '+12 months' ) );
        $booked = $db->get_booked_dates( $property['id'], $from, $to );

        return new \WP_REST_Response( [
            'booked'     => $booked,
            'today'      => $from,
            'min_nights' => (int) $property['min_nights'],
            'max_nights' => (int) $property['max_nights'],
        ], 200 );
    }

    public function create_booking( \WP_REST_Request $request ): \WP_REST_Response {
        $property = $this->get_property_or_404();
        if ( is_wp_error( $property ) ) {
            return new \WP_REST_Response( $property->get_error_data(), $property->get_error_data()['status'] ?? 404 );
        }

        $lang = strtolower( $request->get_param( 'lang' ) );

        // Erst Quote berechnen um Preis zu validieren
        $quote_request = new \WP_REST_Request( 'GET' );
        $quote_request->set_query_params([
            'arrival'   => $request->get_param( 'arrival' ),
            'departure' => $request->get_param( 'departure' ),
            'adults'    => $request->get_param( 'adults' ),
            'children'  => $request->get_param( 'children' ),
            'lang'      => $lang,
        ]);

        $quote_response = $this->get_quote( $quote_request );
        if ( $quote_response->get_status() !== 200 ) {
            return $quote_response;
        }

        $quote_data = $quote_response->get_data();

        // Buchung speichern
        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-database.php';
        $db = Database::instance();

        $booking_data = [
            'property_id'        => $property['id'],
            'guest_name'         => sanitize_text_field( $request->get_param( 'guest_name' ) ),
            'guest_email'        => sanitize_email( $request->get_param( 'guest_email' ) ),
            'guest_street'       => sanitize_text_field( $request->get_param( 'guest_street' ) ),
            'guest_zip'          => sanitize_text_field( $request->get_param( 'guest_zip' ) ),
            'guest_city'         => sanitize_text_field( $request->get_param( 'guest_city' ) ),
            'guest_country'      => sanitize_text_field( $request->get_param( 'guest_country' ) ),
            'arrival'            => sanitize_text_field( $request->get_param( 'arrival' ) ),
            'departure'          => sanitize_text_field( $request->get_param( 'departure' ) ),
            'adults'             => intval( $request->get_param( 'adults' ) ),
            'children'           => intval( $request->get_param( 'children' ) ),
            'lang'               => $lang,
            'message'            => sanitize_textarea_field( $request->get_param( 'message' ) ),
            'total_price'        => $quote_data['total'],
            'downpayment_amount' => $quote_data['downpayment'],
            'remainder_amount'   => $quote_data['remainder'],
            'currency'           => $quote_data['currency'],
        ];

        $booking_id = $db->insert_booking( $booking_data );
        $booking = $db->get_booking( $booking_id );

        // Bestätigungs-URL generieren (für E-Mail)
        $confirmation_url = home_url( "/booking-confirmation/?token={$booking['token']}&lang={$lang}" );

        return new \WP_REST_Response( [
            'success'         => true,
            'booking_no'      => $booking['booking_no'],
            'token'           => $booking['token'],
            'confirmation_url'=> $confirmation_url,
            'message'         => $lang === 'de'
                ? 'Ihre Buchungsanfrage wurde übermittelt. Der Vermieter wird diese prüfen und Ihnen zeitnah antworten.'
                : 'Your booking request has been submitted. The host will review it and get back to you shortly.',
        ], 201 );
    }

    public function get_content( \WP_REST_Request $request ): \WP_REST_Response {
        $property = $this->get_property_or_404();
        if ( is_wp_error( $property ) ) {
            return new \WP_REST_Response( $property->get_error_data(), $property->get_error_data()['status'] ?? 404 );
        }

        $key  = sanitize_text_field( $request->get_param( 'key' ) );
        $lang = strtolower( $request->get_param( 'lang' ) );

        // Erlaubte Keys
        $allowed_keys = [ 'home', 'terms', 'privacy', 'confirm', 'cancellation', 'imprint' ];
        if ( ! in_array( $key, $allowed_keys, true ) ) {
            return $this->error_response( 'invalid_key', 'Ungültiger Content-Key', 404 );
        }

        require_once FH_HEADLESS_PLUGIN_DIR . 'includes/class-database.php';
        $db = Database::instance();

        $content = $db->get_content_block( $property['id'], $key, $lang );

        // Fallback auf DE falls EN nicht existiert
        if ( $content === null && $lang !== 'de' ) {
            $content = $db->get_content_block( $property['id'], $key, 'de' );
        }

        // Default-Inhalte falls nichts in DB
        if ( $content === null ) {
            $content = $this->get_default_content( $key, $lang, $property );
        }

        return new \WP_REST_Response( [
            'key'     => $key,
            'lang'    => $lang,
            'content' => $content,
        ], 200 );
    }

    private function get_season_name( int $property_id, string $date, string $lang ): string {
        $seasons = Database::instance()->get_seasons( $property_id );
        $month_day = date( 'm-d', strtotime( $date ) );

        foreach ( $seasons as $season ) {
            if ( Database::instance()->date_in_season( $month_day, $season['start_month_day'], $season['end_month_day'] ) ) {
                return $season[ "name_{$lang}" ] ?: $season['name_de'];
            }
        }
        return '';
    }

    private function get_default_content( string $key, string $lang, array $property ): string {
        $defaults = [
            'de' => [
                'home'          => '<h1>Willkommen in ' . esc_html( $property['name_de'] ) . '</h1><p>Ihr Urlaub in ' . esc_html( $property['place_de'] ) . '.</p>',
                'terms'         => '<h2>AGB</h2><p>Allgemeine Geschäftsbedingungen für ' . esc_html( $property['name_de'] ) . '.</p>',
                'privacy'       => '<h2>Datenschutz</h2><p>Datenschutzerklärung für ' . esc_html( $property['name_de'] ) . '.</p>',
                'confirm'       => '<h2>Buchungsbestätigung</h2><p>Ihre Buchung wurde bestätigt.</p>',
                'cancellation'  => '<h2>Stornierung</h2><p>Ihre Buchungsanfrage wurde abgelehnt.</p>',
                'imprint'       => '<h2>Impressum</h2><p>' . esc_html( $property['owner_name'] ) . '<br>' . esc_html( $property['owner_address'] ) . '<br>E-Mail: ' . esc_html( $property['owner_email'] ) . '</p>',
            ],
            'en' => [
                'home'          => '<h1>Welcome to ' . esc_html( $property['name_en'] ?: $property['name_de'] ) . '</h1><p>Your vacation in ' . esc_html( $property['place_en'] ?: $property['place_de'] ) . '.</p>',
                'terms'         => '<h2>Terms & Conditions</h2><p>General terms for ' . esc_html( $property['name_en'] ?: $property['name_de'] ) . '.</p>',
                'privacy'       => '<h2>Privacy Policy</h2><p>Privacy policy for ' . esc_html( $property['name_en'] ?: $property['name_de'] ) . '.</p>',
                'confirm'       => '<h2>Booking Confirmation</h2><p>Your booking has been confirmed.</p>',
                'cancellation'  => '<h2>Cancellation</h2><p>Your booking request was declined.</p>',
                'imprint'       => '<h2>Imprint</h2><p>' . esc_html( $property['owner_name'] ) . '<br>' . esc_html( $property['owner_address'] ) . '<br>Email: ' . esc_html( $property['owner_email'] ) . '</p>',
            ],
        ];

        return $defaults[ $lang ][ $key ] ?? $defaults['de'][ $key ] ?? '';
    }
}