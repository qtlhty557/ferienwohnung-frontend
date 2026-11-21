<?php
/**
 * Database Class - Tabellenverwaltung und CRUD-Operationen
 */

namespace FH_Headless;

class Database {

    private static $instance = null;
    private $wpdb;

    public static function instance(): self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb;
        // Tabellen-Präfix setzen
        $this->wpdb->fh_properties       = $wpdb->prefix . 'fh_properties';
        $this->wpdb->fh_seasons          = $wpdb->prefix . 'fh_seasons';
        $this->wpdb->fh_bookings         = $wpdb->prefix . 'fh_bookings';
        $this->wpdb->fh_email_templates  = $wpdb->prefix . 'fh_email_templates';
        $this->wpdb->fh_content_blocks   = $wpdb->prefix . 'fh_content_blocks';
    }

    // ==================== TABELLEN ERSTELLEN ====================

    public function create_tables(): void {
        $charset_collate = $this->wpdb->get_charset_collate();

        // fh_properties
        $sql_properties = "CREATE TABLE {$this->wpdb->fh_properties} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            domain varchar(255) NOT NULL,
            name_de varchar(255) NOT NULL,
            name_en varchar(255) DEFAULT '',
            place_de varchar(255) DEFAULT '',
            place_en varchar(255) DEFAULT '',
            price_per_night decimal(10,2) NOT NULL DEFAULT 0.00,
            currency varchar(3) NOT NULL DEFAULT 'EUR',
            max_guests int(11) NOT NULL DEFAULT 2,
            min_nights int(11) NOT NULL DEFAULT 1,
            max_nights int(11) NOT NULL DEFAULT 30,
            downpayment_percent decimal(5,2) NOT NULL DEFAULT 20.00,
            description_de longtext DEFAULT '',
            description_en longtext DEFAULT '',
            images longtext DEFAULT '[]',
            frontend_html longtext DEFAULT '',
            owner_name varchar(255) NOT NULL,
            owner_address text DEFAULT '',
            owner_email varchar(255) NOT NULL,
            owner_phone varchar(50) DEFAULT '',
            owner_whatsapp varchar(50) DEFAULT '',
            owner_website varchar(255) DEFAULT '',
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY domain_unique (domain)
        ) $charset_collate;";

        // fh_seasons
        $sql_seasons = "CREATE TABLE {$this->wpdb->fh_seasons} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            property_id bigint(20) unsigned NOT NULL,
            name_de varchar(255) NOT NULL,
            name_en varchar(255) DEFAULT '',
            start_month_day varchar(5) NOT NULL,
            end_month_day varchar(5) NOT NULL,
            price_per_night decimal(10,2) NOT NULL DEFAULT 0.00,
            is_active tinyint(1) NOT NULL DEFAULT 1,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY property_id (property_id)
        ) $charset_collate;";

        // fh_bookings
        $sql_bookings = "CREATE TABLE {$this->wpdb->fh_bookings} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            property_id bigint(20) unsigned NOT NULL,
            booking_no varchar(50) NOT NULL,
            token varchar(64) NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'request',
            guest_name varchar(255) NOT NULL,
            guest_email varchar(255) NOT NULL,
            guest_street varchar(255) DEFAULT '',
            guest_zip varchar(20) DEFAULT '',
            guest_city varchar(100) DEFAULT '',
            guest_country varchar(100) DEFAULT '',
            arrival date NOT NULL,
            departure date NOT NULL,
            adults int(11) NOT NULL DEFAULT 1,
            children int(11) NOT NULL DEFAULT 0,
            lang varchar(5) NOT NULL DEFAULT 'de',
            message text DEFAULT '',
            total_price decimal(10,2) NOT NULL DEFAULT 0.00,
            downpayment_amount decimal(10,2) NOT NULL DEFAULT 0.00,
            remainder_amount decimal(10,2) NOT NULL DEFAULT 0.00,
            currency varchar(3) NOT NULL DEFAULT 'EUR',
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            confirmed_at datetime DEFAULT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY booking_no_unique (booking_no),
            UNIQUE KEY token_unique (token),
            KEY property_id (property_id),
            KEY status (status),
            KEY arrival (arrival)
        ) $charset_collate;";

        // fh_email_templates
        $sql_templates = "CREATE TABLE {$this->wpdb->fh_email_templates} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            template_type varchar(50) NOT NULL,
            lang varchar(5) NOT NULL,
            subject varchar(255) NOT NULL,
            body longtext NOT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY type_lang_unique (template_type, lang)
        ) $charset_collate;";

        // fh_content_blocks
        $sql_content = "CREATE TABLE {$this->wpdb->fh_content_blocks} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            property_id bigint(20) unsigned NOT NULL,
            content_key varchar(50) NOT NULL,
            lang varchar(5) NOT NULL,
            content longtext NOT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY property_key_lang_unique (property_id, content_key, lang),
            KEY property_id (property_id)
        ) $charset_collate;";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta( $sql_properties );
        dbDelta( $sql_seasons );
        dbDelta( $sql_bookings );
        dbDelta( $sql_templates );
        dbDelta( $sql_content );
    }

    // ==================== PROPERTIES ====================

    public function get_property_by_domain( string $domain ): ?array {
        $domain = strtolower( trim( $domain ) );
        $domain = preg_replace( '/^www\./', '', $domain );

        $row = $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM {$this->wpdb->fh_properties} WHERE domain = %s",
                $domain
            ),
            ARRAY_A
        );

        return $row ?: null;
    }

    public function get_property_by_id( int $id ): ?array {
        $row = $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM {$this->wpdb->fh_properties} WHERE id = %d",
                $id
            ),
            ARRAY_A
        );
        return $row ?: null;
    }

    public function get_all_properties(): array {
        return $this->wpdb->get_results(
            "SELECT * FROM {$this->wpdb->fh_properties} ORDER BY name_de ASC",
            ARRAY_A
        ) ?: [];
    }

    public function insert_property( array $data ): int {
        $defaults = [
            'name_en'            => '',
            'place_de'           => '',
            'place_en'           => '',
            'currency'           => 'EUR',
            'max_guests'         => 2,
            'min_nights'         => 1,
            'max_nights'         => 30,
            'downpayment_percent'=> 20.00,
            'description_de'     => '',
            'description_en'     => '',
            'images'             => '[]',
            'frontend_html'      => '',
            'owner_address'      => '',
            'owner_phone'        => '',
            'owner_whatsapp'     => '',
            'owner_website'      => '',
        ];
        $data = array_merge( $defaults, $data );

        $this->wpdb->insert( $this->wpdb->fh_properties, $data, [
            '%s', '%s', '%s', '%s', '%s', '%f', '%s', '%d', '%d', '%d', '%f',
            '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s'
        ] );

        return (int) $this->wpdb->insert_id;
    }

    public function update_property( int $id, array $data ): int {
        $this->wpdb->update(
            $this->wpdb->fh_properties,
            $data,
            [ 'id' => $id ],
            [
                '%s', '%s', '%s', '%s', '%s', '%f', '%s', '%d', '%d', '%d', '%f',
                '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s'
            ],
            [ '%d' ]
        );
        return $id;
    }

    public function update_property_frontend_html( int $property_id, string $html ): bool {
        return $this->wpdb->update(
            $this->wpdb->fh_properties,
            [ 'frontend_html' => $html ],
            [ 'id' => $property_id ],
            [ '%s' ],
            [ '%d' ]
        ) !== false;
    }

    public function get_property_frontend_html( int $property_id ): string {
        $html = $this->wpdb->get_var(
            $this->wpdb->prepare(
                "SELECT frontend_html FROM {$this->wpdb->fh_properties} WHERE id = %d",
                $property_id
            )
        );
        return $html ?: '';
    }

    public function delete_property( int $id ): bool {
        $this->wpdb->delete( $this->wpdb->fh_properties, [ 'id' => $id ], [ '%d' ] );
        $this->wpdb->delete( $this->wpdb->fh_seasons, [ 'property_id' => $id ], [ '%d' ] );
        $this->wpdb->delete( $this->wpdb->fh_content_blocks, [ 'property_id' => $id ], [ '%d' ] );
        return true;
    }

    public function get_dummy_property(): array {
        return [
            'id'                 => 0,
            'domain'             => 'example.com',
            'name_de'            => 'Muster-Ferienwohnung',
            'name_en'            => 'Sample Vacation Rental',
            'place_de'           => 'Musterstadt',
            'place_en'           => 'Sample City',
            'price_per_night'    => 100.00,
            'currency'           => 'EUR',
            'max_guests'         => 4,
            'min_nights'         => 2,
            'max_nights'         => 21,
            'downpayment_percent'=> 20.00,
            'description_de'     => 'Beschreibung der Ferienwohnung.',
            'description_en'     => 'Description of the vacation rental.',
            'images'             => '[]',
            'owner_name'         => 'Max Mustermann',
            'owner_address'      => 'Musterstraße 1, 12345 Musterstadt',
            'owner_email'        => 'info@example.com',
            'owner_phone'        => '+49 123 456789',
            'owner_whatsapp'     => '',
            'owner_website'      => 'https://example.com',
        ];
    }

    // ==================== SEASONS ====================

    public function get_seasons( int $property_id ): array {
        return $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT * FROM {$this->wpdb->fh_seasons} WHERE property_id = %d AND is_active = 1 ORDER BY start_month_day ASC",
                $property_id
            ),
            ARRAY_A
        ) ?: [];
    }

    public function get_all_seasons( int $property_id ): array {
        return $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT * FROM {$this->wpdb->fh_seasons} WHERE property_id = %d ORDER BY start_month_day ASC",
                $property_id
            ),
            ARRAY_A
        ) ?: [];
    }

    public function insert_season( array $data ): int {
        $defaults = [
            'name_en'         => '',
            'price_per_night' => 0.00,
            'is_active'       => 1,
        ];
        $data = array_merge( $defaults, $data );

        $this->wpdb->insert( $this->wpdb->fh_seasons, $data, [
            '%d', '%s', '%s', '%s', '%s', '%f', '%d'
        ] );

        return (int) $this->wpdb->insert_id;
    }

    public function update_season( int $id, array $data ): bool {
        return $this->wpdb->update(
            $this->wpdb->fh_seasons,
            $data,
            [ 'id' => $id ],
            [ '%s', '%s', '%s', '%s', '%f', '%d' ],
            [ '%d' ]
        ) !== false;
    }

    public function delete_season( int $id ): bool {
        return $this->wpdb->delete( $this->wpdb->fh_seasons, [ 'id' => $id ], [ '%d' ] ) !== false;
    }

    public function delete_seasons( int $property_id ): bool {
        return $this->wpdb->delete( $this->wpdb->fh_seasons, [ 'property_id' => $property_id ], [ '%d' ] ) !== false;
    }

    /**
     * Ermittelt den passenden Saisonpreis für ein Datum
     */
    public function get_seasonal_price( int $property_id, string $date, float $base_price ): float {
        $seasons = $this->get_seasons( $property_id );
        if ( empty( $seasons ) ) {
            return $base_price;
        }

        // Monat-Tag aus Datum extrahieren (MM-DD)
        $month_day = date( 'm-d', strtotime( $date ) );

        foreach ( $seasons as $season ) {
            $start = $season['start_month_day'];
            $end   = $season['end_month_day'];

            // Prüfen ob Datum in Saison fällt (auch über Jahreswechsel hinweg)
            if ( $this->date_in_season( $month_day, $start, $end ) ) {
                return (float) $season['price_per_night'];
            }
        }

        return $base_price;
    }

    private function date_in_season( string $date, string $start, string $end ): bool {
        // Format: MM-DD
        $d = (int) str_replace( '-', '', $date );
        $s = (int) str_replace( '-', '', $start );
        $e = (int) str_replace( '-', '', $end );

        if ( $s <= $e ) {
            // Normaler Fall: Saison innerhalb eines Jahres (z.B. 04-01 bis 10-31)
            return $d >= $s && $d <= $e;
        } else {
            // Über Jahreswechsel: z.B. 12-20 bis 01-06
            return $d >= $s || $d <= $e;
        }
    }

    // ==================== BOOKINGS ====================

    public function insert_booking( array $data ): int {
        $defaults = [
            'status'            => 'request',
            'total_price'       => 0.00,
            'downpayment_amount'=> 0.00,
            'remainder_amount'  => 0.00,
            'currency'          => 'EUR',
            'guest_street'      => '',
            'guest_zip'         => '',
            'guest_city'        => '',
            'guest_country'     => '',
            'message'           => '',
        ];
        $data = array_merge( $defaults, $data );

        // Booking Number generieren: FH-YYYYMMDD-XXXX
        $booking_no = 'FH-' . date( 'Ymd' ) . '-' . str_pad( mt_rand( 1, 9999 ), 4, '0', STR_PAD_LEFT );
        // Token generieren
        $token = bin2hex( random_bytes( 32 ) );

        $data['booking_no'] = $booking_no;
        $data['token']      = $token;

        $this->wpdb->insert( $this->wpdb->fh_bookings, $data, [
            '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s',
            '%s', '%s', '%d', '%d', '%s', '%s', '%f', '%f', '%f', '%s'
        ] );

        return (int) $this->wpdb->insert_id;
    }

    public function get_booking( int $id ): ?array {
        $row = $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM {$this->wpdb->fh_bookings} WHERE id = %d",
                $id
            ),
            ARRAY_A
        );
        return $row ?: null;
    }

    public function get_booking_by_token( string $token ): ?array {
        $row = $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM {$this->wpdb->fh_bookings} WHERE token = %s",
                $token
            ),
            ARRAY_A
        );
        return $row ?: null;
    }

    public function get_bookings( int $property_id, string $status = '' ): array {
        $sql = "SELECT * FROM {$this->wpdb->fh_bookings} WHERE property_id = %d";
        $params = [ $property_id ];

        if ( $status ) {
            $sql .= " AND status = %s";
            $params[] = $status;
        }

        $sql .= " ORDER BY created_at DESC";

        return $this->wpdb->get_results( $this->wpdb->prepare( $sql, ...$params ), ARRAY_A ) ?: [];
    }

    public function update_booking_status( int $id, string $status ): bool {
        $data = [ 'status' => $status ];
        if ( $status === 'confirmed' ) {
            $data['confirmed_at'] = current_time( 'mysql' );
        }
        return $this->wpdb->update(
            $this->wpdb->fh_bookings,
            $data,
            [ 'id' => $id ],
            [ '%s', '%s' ],
            [ '%d' ]
        ) !== false;
    }

    public function get_booked_dates( int $property_id, string $from = '', string $to = '' ): array {
        $sql = "SELECT arrival, departure FROM {$this->wpdb->fh_bookings} WHERE property_id = %d AND status IN ('request','confirmed')";
        $params = [ $property_id ];

        if ( $from ) {
            $sql .= " AND departure >= %s";
            $params[] = $from;
        }
        if ( $to ) {
            $sql .= " AND arrival <= %s";
            $params[] = $to;
        }

        $rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, ...$params ), ARRAY_A ) ?: [];

        $booked = [];
        foreach ( $rows as $row ) {
            $start = strtotime( $row['arrival'] );
            $end   = strtotime( $row['departure'] );
            for ( $d = $start; $d < $end; $d += DAY_IN_SECONDS ) {
                $booked[] = date( 'Y-m-d', $d );
            }
        }

        return $booked;
    }

    public function get_dummy_booking(): array {
        return [
            'id'                 => 0,
            'property_id'        => 0,
            'booking_no'         => 'FH-20240115-0001',
            'token'              => 'abcdef1234567890',
            'status'             => 'request',
            'guest_name'         => 'Max Mustermann',
            'guest_email'        => 'max@example.com',
            'guest_street'       => 'Musterstraße 1',
            'guest_zip'          => '12345',
            'guest_city'         => 'Musterstadt',
            'guest_country'      => 'Deutschland',
            'arrival'            => '2024-07-15',
            'departure'          => '2024-07-22',
            'adults'             => 2,
            'children'           => 0,
            'lang'               => 'de',
            'message'            => 'Dies ist eine Testnachricht.',
            'total_price'        => 700.00,
            'downpayment_amount' => 140.00,
            'remainder_amount'   => 560.00,
            'currency'           => 'EUR',
            'created_at'         => current_time( 'mysql' ),
        ];
    }

    // ==================== EMAIL TEMPLATES ====================

    public function get_email_template( string $type, string $lang ): ?array {
        $row = $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM {$this->wpdb->fh_email_templates} WHERE template_type = %s AND lang = %s",
                $type, $lang
            ),
            ARRAY_A
        );
        return $row ?: null;
    }

    public function get_all_email_templates(): array {
        return $this->wpdb->get_results(
            "SELECT * FROM {$this->wpdb->fh_email_templates} ORDER BY template_type, lang",
            ARRAY_A
        ) ?: [];
    }

    public function save_email_template( string $type, string $lang, string $subject, string $body ): bool {
        $existing = $this->get_email_template( $type, $lang );
        $data = [
            'template_type' => $type,
            'lang'          => $lang,
            'subject'       => $subject,
            'body'          => $body,
        ];

        if ( $existing ) {
            return $this->wpdb->update(
                $this->wpdb->fh_email_templates,
                $data,
                [ 'id' => $existing['id'] ],
                [ '%s', '%s', '%s', '%s' ],
                [ '%d' ]
            ) !== false;
        } else {
            return $this->wpdb->insert( $this->wpdb->fh_email_templates, $data, [ '%s', '%s', '%s', '%s' ] ) !== false;
        }
    }

    // ==================== CONTENT BLOCKS ====================

    public function get_content_block( int $property_id, string $key, string $lang ): ?string {
        $row = $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT content FROM {$this->wpdb->fh_content_blocks} WHERE property_id = %d AND content_key = %s AND lang = %s",
                $property_id, $key, $lang
            ),
            ARRAY_A
        );
        return $row ? $row['content'] : null;
    }

    public function save_content_block( int $property_id, string $key, string $lang, string $content ): bool {
        $existing = $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT id FROM {$this->wpdb->fh_content_blocks} WHERE property_id = %d AND content_key = %s AND lang = %s",
                $property_id, $key, $lang
            ),
            ARRAY_A
        );

        $data = [
            'property_id' => $property_id,
            'content_key' => $key,
            'lang'        => $lang,
            'content'     => $content,
        ];

        if ( $existing ) {
            return $this->wpdb->update(
                $this->wpdb->fh_content_blocks,
                $data,
                [ 'id' => $existing['id'] ],
                [ '%d', '%s', '%s', '%s' ],
                [ '%d' ]
            ) !== false;
        } else {
            return $this->wpdb->insert( $this->wpdb->fh_content_blocks, $data, [ '%d', '%s', '%s', '%s' ] ) !== false;
        }
    }

    public function get_all_content_blocks( int $property_id ): array {
        return $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT content_key, lang, content FROM {$this->wpdb->fh_content_blocks} WHERE property_id = %d",
                $property_id
            ),
            ARRAY_A
        ) ?: [];
    }
}