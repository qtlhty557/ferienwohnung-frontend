<?php
require_once 'C:/xampp/htdocs/plug/wp-load.php';
global $wpdb;
$html = file_get_contents('C:/Users/Archi/Documents/Standardprojekt/ferienwohnungen-headless/frontend-beispiel.html');
$domains = ['villa-seeblick.local', 'alte-schule.local', 'ferienhaus-test.local'];
foreach ($domains as $domain) {
    $html_domain = str_replace('propertyDomain: \'villa-seeblick.de\'', 'propertyDomain: \'' . $domain . '\'', $html);
    $html_domain = str_replace('apiBase: \'https://villa-seeblick.de/wp-json/fh/v1\'', 'apiBase: \'http://localhost/plug/wp-json/fh/v1\'', $html_domain);
    $wpdb->update(
        $wpdb->prefix . 'fh_properties',
        ['frontend_html' => $html_domain],
        ['domain' => $domain]
    );
    echo "Updated $domain (" . strlen($html_domain) . " bytes)\n";
}
echo "Done!\n";