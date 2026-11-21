<?php
/**
 * Email System - Vorlagen, Versand, Preview
 */

namespace FH_Headless;

class Email {

    private static $instance = null;
    private $smtp_config = null;

    public static function instance(): self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->load_smtp_config();
    }

    private function load_smtp_config(): void {
        $this->smtp_config = get_option( 'fh_headless_smtp', [
            'enabled'     => false,
            'host'        => '',
            'port'        => 587,
            'username'    => '',
            'password'    => '',
            'encryption'  => 'tls',
            'from_email'  => '',
            'from_name'   => '',
        ] );
    }

    // ==================== DEFAULT TEMPLATES ====================

    public function set_default_templates(): void {
        $defaults = [
            'confirmation' => [
                'de' => [
                    'subject' => 'Buchungsbestätigung: {booking_no} – {property_name}',
                    'body'    => $this->get_default_confirmation_de(),
                ],
                'en' => [
                    'subject' => 'Booking Confirmation: {booking_no} – {property_name}',
                    'body'    => $this->get_default_confirmation_en(),
                ],
            ],
            'rejection' => [
                'de' => [
                    'subject' => 'Absage Ihrer Buchungsanfrage: {booking_no} – {property_name}',
                    'body'    => $this->get_default_rejection_de(),
                ],
                'en' => [
                    'subject' => 'Your booking request was declined: {booking_no} – {property_name}',
                    'body'    => $this->get_default_rejection_en(),
                ],
            ],
        ];

        foreach ( $defaults as $type => $langs ) {
            foreach ( $langs as $lang => $template ) {
                // Nur setzen wenn noch nicht existiert
                $existing = Database::instance()->get_email_template( $type, $lang );
                if ( ! $existing ) {
                    Database::instance()->save_email_template( $type, $lang, $template['subject'], $template['body'] );
                }
            }
        }
    }

    private function get_default_confirmation_de(): string {
        return <<<HTML
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><title>Buchungsbestätigung</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2c5f3d;">Buchungsbestätigung</h2>
    <p>Liebe/r {guest_name},</p>
    <p>wir freuen uns, Ihnen mitteilen zu können, dass Ihre Buchungsanfrage für <strong>{property_name}</strong> bestätigt wurde.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Buchungsnummer:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{booking_no}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Anreise:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{arrival}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Abreise:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{departure}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Gäste:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{adults} Erwachsene, {children} Kinder</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Gesamtpreis:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{total} {currency}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Anzahlung ({downpayment_percent}%):</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{downpayment} {currency}</td></tr>
        <tr><td style="padding: 8px;"><strong>Restbetrag:</strong></td><td style="padding: 8px;">{remainder} {currency}</td></tr>
    </table>

    <p><strong>Vermieter:</strong><br>
    {owner_name}<br>
    {owner_address}<br>
    E-Mail: {owner_email}<br>
    Telefon: {owner_phone}</p>

    <p>Die Anzahlung ist innerhalb von 7 Tagen fällig. Die Kontodaten erhalten Sie in einer separaten E-Mail oder auf Anfrage.</p>

    <p>Wir freuen uns auf Ihren Aufenthalt!</p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
    <p style="font-size: 12px; color: #888;">Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht direkt auf diese E-Mail.</p>
</body>
</html>
HTML;
    }

    private function get_default_confirmation_en(): string {
        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Booking Confirmation</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2c5f3d;">Booking Confirmation</h2>
    <p>Dear {guest_name},</p>
    <p>We are pleased to inform you that your booking request for <strong>{property_name}</strong> has been confirmed.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Booking Number:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{booking_no}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Arrival:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{arrival}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Departure:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{departure}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Guests:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{adults} adults, {children} children</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Total Price:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{total} {currency}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Deposit ({downpayment_percent}%):</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{downpayment} {currency}</td></tr>
        <tr><td style="padding: 8px;"><strong>Remainder:</strong></td><td style="padding: 8px;">{remainder} {currency}</td></tr>
    </table>

    <p><strong>Host:</strong><br>
    {owner_name}<br>
    {owner_address}<br>
    Email: {owner_email}<br>
    Phone: {owner_phone}</p>

    <p>The deposit is due within 7 days. Bank details will be sent in a separate email or upon request.</p>

    <p>We look forward to your stay!</p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
    <p style="font-size: 12px; color: #888;">This email was generated automatically. Please do not reply directly to this email.</p>
</body>
</html>
HTML;
    }

    private function get_default_rejection_de(): string {
        return <<<HTML
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><title>Absage Buchungsanfrage</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #a83232;">Absage Ihrer Buchungsanfrage</h2>
    <p>Liebe/r {guest_name},</p>
    <p>vielen Dank für Ihr Interesse an <strong>{property_name}</strong>. Leider müssen wir Ihnen mitteilen, dass Ihre Buchungsanfrage für den Zeitraum {arrival} bis {departure} nicht bestätigt werden kann.</p>
    
    <p>Der Grund kann sein, dass der Zeitraum bereits vergeben ist oder die Mindestaufenthaltsdauer nicht eingehalten wurde.</p>

    <p>Gerne prüfen wir alternative Termine für Sie. Kontaktieren Sie uns einfach unter {owner_email} oder {owner_phone}.</p>

    <p>Wir hoffen, Sie zu einem anderen Zeitpunkt als Gast begrüßen zu dürfen.</p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
    <p style="font-size: 12px; color: #888;">Diese E-Mail wurde automatisch generiert.</p>
</body>
</html>
HTML;
    }

    private function get_default_rejection_en(): string {
        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Booking Request Declined</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #a83232;">Your booking request was declined</h2>
    <p>Dear {guest_name},</p>
    <p>Thank you for your interest in <strong>{property_name}</strong>. Unfortunately, we must inform you that your booking request for the period {arrival} to {departure} cannot be confirmed.</p>
    
    <p>The reason may be that the period is already booked or the minimum stay requirement was not met.</p>

    <p>We would be happy to check alternative dates for you. Please contact us at {owner_email} or {owner_phone}.</p>

    <p>We hope to welcome you as a guest at another time.</p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
    <p style="font-size: 12px; color: #888;">This email was generated automatically.</p>
</body>
</html>
HTML;
    }

    // ==================== TEMPLATE RENDERING ====================

    public function render_template( string $type, string $lang, array $booking, array $property ): array {
        $template = Database::instance()->get_email_template( $type, $lang );
        if ( ! $template ) {
            // Fallback auf DE
            if ( $lang !== 'de' ) {
                $template = Database::instance()->get_email_template( $type, 'de' );
            }
        }
        if ( ! $template ) {
            return [ 'subject' => '', 'body' => 'Template nicht gefunden' ];
        }

        $placeholders = $this->get_placeholders( $booking, $property );

        $subject = $this->replace_placeholders( $template['subject'], $placeholders );
        $body    = $this->replace_placeholders( $template['body'], $placeholders );

        return [ 'subject' => $subject, 'body' => $body ];
    }

    private function get_placeholders( array $booking, array $property ): array {
        $lang = $booking['lang'] ?? 'de';

        return [
            '{guest_name}'         => $booking['guest_name'] ?? '',
            '{guest_email}'        => $booking['guest_email'] ?? '',
            '{guest_street}'       => $booking['guest_street'] ?? '',
            '{guest_zip}'          => $booking['guest_zip'] ?? '',
            '{guest_city}'         => $booking['guest_city'] ?? '',
            '{guest_country}'      => $booking['guest_country'] ?? '',
            '{booking_no}'         => $booking['booking_no'] ?? '',
            '{token}'              => $booking['token'] ?? '',
            '{arrival}'            => isset( $booking['arrival'] ) ? date( 'd.m.Y', strtotime( $booking['arrival'] ) ) : '',
            '{departure}'          => isset( $booking['departure'] ) ? date( 'd.m.Y', strtotime( $booking['departure'] ) ) : '',
            '{adults}'             => $booking['adults'] ?? 0,
            '{children}'           => $booking['children'] ?? 0,
            '{total}'              => isset( $booking['total_price'] ) ? number_format( $booking['total_price'], 2, ',', '.' ) : '',
            '{downpayment}'        => isset( $booking['downpayment_amount'] ) ? number_format( $booking['downpayment_amount'], 2, ',', '.' ) : '',
            '{remainder}'          => isset( $booking['remainder_amount'] ) ? number_format( $booking['remainder_amount'], 2, ',', '.' ) : '',
            '{currency}'           => $booking['currency'] ?? 'EUR',
            '{downpayment_percent}'=> $property['downpayment_percent'] ?? 20,
            '{property_name}'      => $property[ "name_{$lang}" ] ?: $property['name_de'] ?? '',
            '{property_place}'     => $property[ "place_{$lang}" ] ?: $property['place_de'] ?? '',
            '{owner_name}'         => $property['owner_name'] ?? '',
            '{owner_address}'      => $property['owner_address'] ?? '',
            '{owner_email}'        => $property['owner_email'] ?? '',
            '{owner_phone}'        => $property['owner_phone'] ?? '',
            '{owner_whatsapp}'     => $property['owner_whatsapp'] ?? '',
            '{owner_website}'      => $property['owner_website'] ?? '',
            '{message}'            => $booking['message'] ?? '',
            '{confirmation_url}'   => home_url( "/booking-confirmation/?token={$booking['token']}&lang={$lang}" ),
        ];
    }

    private function replace_placeholders( string $text, array $placeholders ): string {
        return str_replace( array_keys( $placeholders ), array_values( $placeholders ), $text );
    }

    // ==================== SENDING ====================

    public function send_booking_response( array $booking, array $property, string $status ): bool {
        $lang = $booking['lang'] ?? 'de';
        $type = $status === 'confirmed' ? 'confirmation' : 'rejection';

        $rendered = $this->render_template( $type, $lang, $booking, $property );

        $to      = $booking['guest_email'];
        $subject = $rendered['subject'];
        $message = $rendered['body'];
        $headers = [ 'Content-Type: text/html; charset=UTF-8' ];

        // Reply-To auf Owner setzen
        if ( ! empty( $property['owner_email'] ) ) {
            $headers[] = 'Reply-To: ' . $property['owner_email'];
        }

        return $this->send_mail( $to, $subject, $message, $headers );
    }

    public function send_test_email( string $to ): bool {
        $subject = 'Test-E-Mail von Ferienwohnungen Headless Plugin';
        $message = '<p>Dies ist eine Test-E-Mail. Wenn Sie diese erhalten, funktioniert der E-Mail-Versand.</p>';
        $headers = [ 'Content-Type: text/html; charset=UTF-8' ];

        return $this->send_mail( $to, $subject, $message, $headers );
    }

    private function send_mail( string $to, string $subject, string $message, array $headers ): bool {
        $this->load_smtp_config();

        if ( $this->smtp_config['enabled'] && ! empty( $this->smtp_config['host'] ) ) {
            return $this->send_via_smtp( $to, $subject, $message, $headers );
        }

        // Fallback: wp_mail()
        return wp_mail( $to, $subject, $message, $headers );
    }

    private function send_via_smtp( string $to, string $subject, string $message, array $headers ): bool {
        // PHPMailer ist in WordPress enthalten
        require_once ABSPATH . WPINC . '/class-phpmailer.php';
        require_once ABSPATH . WPINC . '/class-smtp.php';

        $mail = new \PHPMailer( true );

        try {
            $mail->isSMTP();
            $mail->Host       = $this->smtp_config['host'];
            $mail->Port       = $this->smtp_config['port'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $this->smtp_config['username'];
            $mail->Password   = $this->smtp_config['password'];

            $encryption = strtolower( $this->smtp_config['encryption'] );
            if ( $encryption === 'tls' ) {
                $mail->SMTPSecure = \PHPMailer::ENCRYPTION_STARTTLS;
            } elseif ( $encryption === 'ssl' ) {
                $mail->SMTPSecure = \PHPMailer::ENCRYPTION_SMTPS;
            }

            $from_email = $this->smtp_config['from_email'] ?: get_option( 'admin_email' );
            $from_name  = $this->smtp_config['from_name'] ?: get_bloginfo( 'name' );

            $mail->setFrom( $from_email, $from_name );
            $mail->addAddress( $to );
            $mail->Subject = $subject;
            $mail->msgHTML( $message );

            foreach ( $headers as $header ) {
                if ( strpos( $header, ':' ) !== false ) {
                    list( $name, $value ) = explode( ':', $header, 2 );
                    $mail->addCustomHeader( trim( $name ), trim( $value ) );
                }
            }

            $mail->send();
            return true;
        } catch ( \Exception $e ) {
            error_log( 'FH Headless SMTP Error: ' . $e->getMessage() );
            return false;
        }
    }

    // ==================== TEMPLATE MANAGEMENT ====================

    public function save_template( string $type, string $lang, string $subject, string $body ): bool {
        return Database::instance()->save_email_template( $type, $lang, $subject, $body );
    }

    public function get_template( string $type, string $lang ): ?array {
        return Database::instance()->get_email_template( $type, $lang );
    }

    public function get_all_templates(): array {
        return Database::instance()->get_all_email_templates();
    }

    public function get_smtp_settings(): array {
        return $this->smtp_config;
    }
}