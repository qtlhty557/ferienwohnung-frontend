/**
 * Admin JavaScript für Ferienwohnungen Headless Plugin
 */

jQuery( function( $ ) {
    'use strict';

    // ==================== IMPORT ====================

    $( '#fh-import-preview' ).on( 'click', function() {
        var $btn = $( this );
        var json = $( '#json_input' ).val().trim();
        var file = $( '#json_file' )[0].files[0];

        if ( ! json && ! file ) {
            alert( 'Bitte JSON einfügen oder Datei auswählen.' );
            return;
        }

        $btn.prop( 'disabled', true ).html( '<span class="fh-import-loading"></span> Prüfe...' );
        $( '#fh-import-preview-area' ).hide();
        $( '#fh-import-result' ).hide();

        var formData = new FormData();
        if ( json ) formData.append( 'json', json );
        if ( file ) formData.append( 'json_file', file );
        formData.append( 'action', 'fh_import_preview' );
        formData.append( 'nonce', fhAjax.nonce );

        $.ajax({
            url: fhAjax.ajaxurl,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function( response ) {
                $btn.prop( 'disabled', false ).text( 'Vorschau anzeigen' );
                if ( response.success ) {
                    showPreview( response.data );
                    $( '#fh-import-execute' ).show();
                } else {
                    showError( response.data || 'Unbekannter Fehler' );
                }
            },
            error: function() {
                $btn.prop( 'disabled', false ).text( 'Vorschau anzeigen' );
                showError( 'AJAX-Fehler' );
            }
        });
    });

    $( '#fh-import-execute' ).on( 'click', function() {
        var $btn = $( this );
        var json = $( '#json_input' ).val().trim();
        var file = $( '#json_file' )[0].files[0];

        if ( ! json && ! file ) {
            alert( 'Bitte JSON einfügen oder Datei auswählen.' );
            return;
        }

        if ( ! confirm( 'Import wirklich durchführen?' ) ) {
            return;
        }

        $btn.prop( 'disabled', true ).html( '<span class="fh-import-loading"></span> Importiere...' );

        var formData = new FormData();
        if ( json ) formData.append( 'json', json );
        if ( file ) formData.append( 'json_file', file );
        formData.append( 'action', 'fh_import_execute' );
        formData.append( 'nonce', fhAjax.nonce );

        $.ajax({
            url: fhAjax.ajaxurl,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function( response ) {
                $btn.prop( 'disabled', false ).text( 'Importieren' );
                if ( response.success ) {
                    showResult( response.data, true );
                    $( '#fh-import-form' )[0].reset();
                    $( '#fh-import-preview-area' ).hide();
                    $( '#fh-import-execute' ).hide();
                } else {
                    showResult( { message: response.data || 'Import fehlgeschlagen' }, false );
                }
            },
            error: function() {
                $btn.prop( 'disabled', false ).text( 'Importieren' );
                showResult( { message: 'AJAX-Fehler' }, false );
            }
        });
    });

    function showPreview( data ) {
        var html = '<h3>Import-Vorschau</h3>';
        if ( data.error ) {
            html += '<div class="preview-item"><span class="preview-label">Fehler:</span><span class="preview-value">' + escapeHtml( data.error ) + '</span></div>';
        } else {
            html += '<div class="preview-item"><span class="preview-label">Domain:</span><span class="preview-value">' + escapeHtml( data.domain ) + '</span></div>';
            html += '<div class="preview-item"><span class="preview-label">Name:</span><span class="preview-value">' + escapeHtml( data.name ) + '</span></div>';
            html += '<div class="preview-item"><span class="preview-label">Saisons:</span><span class="preview-value">' + data.seasons_count + '</span></div>';
            html += '<div class="preview-item"><span class="preview-label">Aktion:</span><span class="preview-value ' + data.action + '">' + ( data.action === 'insert' ? 'Neu anlegen' : 'Aktualisieren (ID: ' + data.property_id + ')' ) + '</span></div>';
            html += '<div class="preview-item"><span class="preview-label">Eigentümerdaten:</span><span class="preview-value">' + ( data.has_owner_data ? 'Vorhanden' : 'Fehlen!' ) + '</span></div>';
        }
        $( '#fh-import-preview-area' ).html( html ).show();
    }

    function showResult( data, success ) {
        var html = '<div class="' + ( success ? 'success' : 'error' ) + '">';
        html += '<strong>' + ( success ? 'Erfolg' : 'Fehler' ) + ':</strong> ' + escapeHtml( data.message );
        if ( data.property_id ) {
            html += ' (Property ID: ' + data.property_id + ')';
        }
        html += '</div>';
        $( '#fh-import-result' ).html( html ).show();
    }

    function showError( msg ) {
        $( '#fh-import-result' ).html( '<div class="error"><strong>Fehler:</strong> ' + escapeHtml( msg ) + '</div>' ).show();
    }

    // ==================== BUCHUNGEN ====================

    $( document ).on( 'click', '.fh-btn-confirm', function() {
        var $btn = $( this );
        var bookingId = $btn.data( 'booking-id' );
        var nonce = $btn.data( 'nonce' );

        if ( ! confirm( 'Diese Buchung wirklich bestätigen? Der Gast erhält eine Bestätigungs-E-Mail.' ) ) {
            return;
        }

        $btn.prop( 'disabled', true ).text( 'Bestätige...' );
        doBookingAction( bookingId, 'confirm', nonce, $btn );
    });

    $( document ).on( 'click', '.fh-btn-reject', function() {
        var $btn = $( this );
        var bookingId = $btn.data( 'booking-id' );
        var nonce = $btn.data( 'nonce' );

        if ( ! confirm( 'Diese Buchung wirklich ablehnen? Der Gast erhält eine Absage-E-Mail.' ) ) {
            return;
        }

        $btn.prop( 'disabled', true ).text( 'Lehne ab...' );
        doBookingAction( bookingId, 'reject', nonce, $btn );
    });

    function doBookingAction( bookingId, action, nonce, $btn ) {
        $.post( fhAjax.ajaxurl, {
            action: 'fh_booking_action',
            booking_id: bookingId,
            action_type: action,
            nonce: nonce
        }, function( response ) {
            if ( response.success ) {
                location.reload();
            } else {
                alert( 'Fehler: ' + response.data );
                $btn.prop( 'disabled', false ).text( action === 'confirm' ? 'Bestätigen' : 'Ablehnen' );
            }
        }).fail( function() {
            alert( 'AJAX-Fehler' );
            $btn.prop( 'disabled', false ).text( action === 'confirm' ? 'Bestätigen' : 'Ablehnen' );
        });
    }

    // E-Mail Vorschau für Buchungen
    $( document ).on( 'click', '.fh-btn-preview', function() {
        var $btn = $( this );
        var bookingId = $btn.data( 'booking-id' );
        var type = $btn.data( 'type' );
        var nonce = $btn.data( 'nonce' );

        $.post( fhAjax.ajaxurl, {
            action: 'fh_email_preview',
            booking_id: bookingId,
            template_type: type,
            lang: 'de',
            nonce: nonce
        }, function( response ) {
            if ( response.success ) {
                showEmailPreview( response.data );
            } else {
                alert( 'Fehler: ' + response.data );
            }
        });
    });

    // ==================== E-MAIL VORLAGEN ====================

    $( document ).on( 'click', '.fh-btn-save-template', function() {
        var $btn = $( this );
        var type = $btn.data( 'type' );
        var lang = $btn.data( 'lang' );
        var $editor = $btn.closest( '.fh-template-editor' );
        var subject = $editor.find( '.fh-template-subject' ).val();
        var body = $editor.find( '.fh-template-body' ).val();
        var $status = $editor.find( '.fh-template-status' );

        if ( ! subject || ! body ) {
            alert( 'Betreff und Inhalt sind erforderlich.' );
            return;
        }

        $btn.prop( 'disabled', true ).text( 'Speichere...' );
        $status.text( '' );

        $.post( fhAjax.ajaxurl, {
            action: 'fh_save_email_template',
            template_type: type,
            lang: lang,
            subject: subject,
            body: body,
            nonce: fhAjax.nonce
        }, function( response ) {
            $btn.prop( 'disabled', false ).text( 'Speichern' );
            if ( response.success ) {
                $status.text( 'Gespeichert!' ).fadeOut( 2000, function() {
                    $( this ).show().text( '' );
                });
            } else {
                alert( 'Fehler: ' + response.data );
            }
        });
    });

    $( document ).on( 'click', '.fh-btn-preview-template', function() {
        var $btn = $( this );
        var type = $btn.data( 'type' );
        var lang = $btn.data( 'lang' );
        var $editor = $btn.closest( '.fh-template-editor' );
        var subject = $editor.find( '.fh-template-subject' ).val();
        var body = $editor.find( '.fh-template-body' ).val();

        if ( ! subject || ! body ) {
            alert( 'Betreff und Inhalt sind erforderlich.' );
            return;
        }

        // Server-seitige Vorschau mit allen Platzhaltern ersetzt
        $.post( fhAjax.ajaxurl, {
            action: 'fh_email_preview',
            booking_id: 0,
            template_type: type,
            lang: lang,
            subject: subject,
            body: body,
            nonce: fhAjax.nonce
        }, function( response ) {
            if ( response.success && response.data.html ) {
                // Server-seitig gerendertes HTML direkt im Modal anzeigen
                var $modal = $( '#fh-email-preview-modal' );
                var $frame = $( '#fh-email-preview-frame' );

                $frame[0].contentDocument.write( response.data.html );
                $frame[0].contentDocument.close();

                $modal.show();
            } else {
                alert( 'Fehler beim Laden der Vorschau: ' + ( response.data || 'Unbekannter Fehler' ) );
            }
        });
    });

    function getDummyPlaceholders( lang ) {
        return {
            '{guest_name}': 'Max Mustermann',
            '{guest_email}': 'max@example.com',
            '{guest_street}': 'Musterstraße 1',
            '{guest_zip}': '12345',
            '{guest_city}': 'Musterstadt',
            '{guest_country}': lang === 'de' ? 'Deutschland' : 'Germany',
            '{booking_no}': 'FH-20240115-0001',
            '{token}': 'abcdef1234567890',
            '{arrival}': '15.07.2024',
            '{departure}': '22.07.2024',
            '{adults}': 2,
            '{children}': 0,
            '{total}': '1.050,00',
            '{downpayment}': '262,50',
            '{remainder}': '787,50',
            '{currency}': 'EUR',
            '{downpayment_percent}': 25,
            '{property_name}': lang === 'de' ? 'Villa Seeblick' : 'Villa Lake View',
            '{property_place}': lang === 'de' ? 'Mustersee' : 'Sample Lake',
            '{owner_name}': 'Max Mustermann',
            '{owner_address}': 'Seestraße 1, 12345 Mustersee',
            '{owner_email}': 'max@villa-seeblick.de',
            '{owner_phone}': '+49 123 456789',
            '{owner_whatsapp}': '+49 123 456789',
            '{owner_website}': 'https://villa-seeblick.de',
            '{message}': 'Dies ist eine Testnachricht.',
            '{confirmation_url}': '#',
        };
    }

    function replacePlaceholders( text, placeholders ) {
        for ( var key in placeholders ) {
            var regex = new RegExp( escapeRegExp( key ), 'g' );
            text = text.replace( regex, placeholders[ key ] );
        }
        return text;
    }

    function escapeRegExp( string ) {
        return string.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
    }

    function showEmailPreview( data ) {
        // data enthält subject und body (bereits gerendert)
        showEmailPreviewFrame( data.subject, data.body );
    }

    function showEmailPreviewFrame( subject, body ) {
        var $modal = $( '#fh-email-preview-modal' );
        var $frame = $( '#fh-email-preview-frame' );

        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + escapeHtml( subject ) + '</title></head><body>' + body + '</body></html>';

        $frame[0].contentDocument.write( html );
        $frame[0].contentDocument.close();

        $modal.show();
    }

    $( document ).on( 'click', '.fh-modal-close, #fh-email-preview-modal', function( e ) {
        if ( e.target === this || $( e.target ).hasClass( 'fh-modal-close' ) ) {
            $( '#fh-email-preview-modal' ).hide();
        }
    });

    // ==================== SMTP ====================

    $( '#fh-smtp-save' ).on( 'click', function() {
        var $btn = $( this );
        var formData = $( '#fh-smtp-form' ).serializeArray();
        var data = { action: 'fh_save_smtp_settings', nonce: fhAjax.nonce };

        $.each( formData, function( i, field ) {
            data[ field.name ] = field.value;
        });

        // Checkbox handling
        data.smtp_enabled = $( '#fh-smtp-form input[name="smtp_enabled"]' ).is( ':checked' ) ? '1' : '0';

        $btn.prop( 'disabled', true ).text( 'Speichere...' );

        $.post( fhAjax.ajaxurl, data, function( response ) {
            $btn.prop( 'disabled', false ).text( 'Einstellungen speichern' );
            if ( response.success ) {
                alert( 'Einstellungen gespeichert.' );
            } else {
                alert( 'Fehler: ' + response.data );
            }
        });
    });

    $( '#fh-smtp-test' ).on( 'click', function() {
        $( '#fh-smtp-test-area' ).toggle();
    });

    $( '#fh-smtp-test-send' ).on( 'click', function() {
        var $btn = $( this );
        var email = $( '#fh-smtp-test-email' ).val().trim();

        if ( ! email ) {
            alert( 'Bitte E-Mail-Adresse eingeben.' );
            return;
        }

        $btn.prop( 'disabled', true ).text( 'Sende...' );

        $.post( fhAjax.ajaxurl, {
            action: 'fh_test_smtp',
            test_email: email,
            nonce: fhAjax.nonce
        }, function( response ) {
            $btn.prop( 'disabled', false ).text( 'Senden' );
            if ( response.success ) {
                alert( 'Test-E-Mail versendet an ' + email );
            } else {
                alert( 'Fehler: ' + response.data );
            }
        });
    });

    // ==================== FRONTEND-HTML IMPORT ====================

    $( '#fh-html-import-preview' ).on( 'click', function() {
        var $btn = $( this );
        var propertyId = $( '#html_property' ).val();
        var html = $( '#html_input' ).val().trim();
        var file = $( '#html_file' )[0].files[0];

        if ( ! propertyId ) {
            alert( 'Bitte zuerst eine Ferienwohnung auswählen.' );
            return;
        }
        if ( ! html && ! file ) {
            alert( 'Bitte HTML einfügen oder Datei auswählen.' );
            return;
        }

        $btn.prop( 'disabled', true ).html( '<span class="fh-import-loading"></span> Prüfe...' );
        $( '#fh-html-import-preview-area' ).hide();
        $( '#fh-html-import-result' ).hide();
        $( '#fh-html-import-execute' ).hide();
        $( '#fh-html-download' ).hide();

        var formData = new FormData();
        formData.append( 'property_id', propertyId );
        if ( html ) formData.append( 'html', html );
        if ( file ) formData.append( 'html_file', file );
        formData.append( 'action', 'fh_html_import_preview' );
        formData.append( 'nonce', fhAjax.nonce );

        $.ajax({
            url: fhAjax.ajaxurl,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function( response ) {
                $btn.prop( 'disabled', false ).text( 'Vorschau / Prüfen' );
                if ( response.success ) {
                    showHtmlPreview( response.data );
                    $( '#fh-html-import-execute' ).show();
                    $( '#fh-html-download' ).show();
                } else {
                    showHtmlError( response.data || 'Unbekannter Fehler' );
                }
            },
            error: function() {
                $btn.prop( 'disabled', false ).text( 'Vorschau / Prüfen' );
                showHtmlError( 'AJAX-Fehler' );
            }
        });
    });

    $( '#fh-html-import-execute' ).on( 'click', function() {
        var $btn = $( this );
        var propertyId = $( '#html_property' ).val();
        var html = $( '#html_input' ).val().trim();
        var file = $( '#html_file' )[0].files[0];

        if ( ! propertyId ) {
            alert( 'Bitte zuerst eine Ferienwohnung auswählen.' );
            return;
        }
        if ( ! html && ! file ) {
            alert( 'Bitte HTML einfügen oder Datei auswählen.' );
            return;
        }

        if ( ! confirm( 'HTML wirklich in der Datenbank speichern?' ) ) {
            return;
        }

        $btn.prop( 'disabled', true ).html( '<span class="fh-import-loading"></span> Speichere...' );

        var formData = new FormData();
        formData.append( 'property_id', propertyId );
        if ( html ) formData.append( 'html', html );
        if ( file ) formData.append( 'html_file', file );
        formData.append( 'action', 'fh_html_import_execute' );
        formData.append( 'nonce', fhAjax.nonce );

        $.ajax({
            url: fhAjax.ajaxurl,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function( response ) {
                $btn.prop( 'disabled', false ).text( 'Speichern in DB' );
                if ( response.success ) {
                    showHtmlResult( response.data, true );
                    // Tabelle aktualisieren (Seite neu laden oder AJAX)
                    setTimeout( function() { location.reload(); }, 1500 );
                } else {
                    showHtmlResult( { message: response.data || 'Speichern fehlgeschlagen' }, false );
                }
            },
            error: function() {
                $btn.prop( 'disabled', false ).text( 'Speichern in DB' );
                showHtmlResult( { message: 'AJAX-Fehler' }, false );
            }
        });
    });

    $( '#fh-html-download' ).on( 'click', function() {
        var propertyId = $( '#html_property' ).val();
        if ( ! propertyId ) {
            alert( 'Bitte zuerst eine Ferienwohnung auswählen.' );
            return;
        }
        // Direkter Download-Link
        window.location.href = fhAjax.ajaxurl + '?action=fh_html_download&property_id=' + propertyId + '&nonce=' + fhAjax.nonce;
    });

    // Laden von existierendem HTML in die Textarea
    $( document ).on( 'click', '.fh-btn-load-html', function() {
        var $btn = $( this );
        var propertyId = $btn.data( 'property-id' );
        var nonce = $btn.data( 'nonce' );

        $btn.prop( 'disabled', true ).text( 'Lade...' );

        $.post( fhAjax.ajaxurl, {
            action: 'fh_html_import_preview',
            property_id: propertyId,
            nonce: nonce
        }, function( response ) {
            $btn.prop( 'disabled', false ).text( 'Laden / Bearbeiten' );
            if ( response.success ) {
                // Wir brauchen das volle HTML - laden wir es separat
                // Für jetzt: Property im Dropdown wählen, dann "Vorschau" klickt lädt es
                $( '#html_property' ).val( propertyId ).trigger( 'change' );
                // Lade das HTML in die Textarea
                loadHtmlIntoTextarea( propertyId );
            } else {
                alert( 'Fehler: ' + response.data );
            }
        });
    });

    function loadHtmlIntoTextarea( propertyId ) {
        $.post( fhAjax.ajaxurl, {
            action: 'fh_html_import_preview',
            property_id: propertyId,
            nonce: fhAjax.nonce
        }, function( response ) {
            if ( response.success ) {
                // Die Preview API gibt nur Preview zurück, nicht das volle HTML
                // Wir machen einen separaten Call für den Download und lesen den Content
                // Einfacher: Seite neu laden mit Property vorausgewählt
                window.location.href = window.location.href.split('?')[0] + '?page=fh-headless-html-import&property_id=' + propertyId;
            }
        });
    }

    // Download-Button in der Tabelle
    $( document ).on( 'click', '.fh-btn-download-html', function() {
        var propertyId = $( this ).data( 'property-id' );
        window.location.href = fhAjax.ajaxurl + '?action=fh_html_download&property_id=' + propertyId + '&nonce=' + fhAjax.nonce;
    });

    function showHtmlPreview( data ) {
        var html = '<h3>HTML-Vorschau</h3>';
        if ( data.warning ) {
            html += '<div class="preview-item" style="color:#a83232;"><span class="preview-label">Warnung:</span><span class="preview-value">' + escapeHtml( data.warning ) + '</span></div>';
        }
        html += '<div class="preview-item"><span class="preview-label">Größe:</span><span class="preview-value">' + data.size_kb + ' KB</span></div>';
        html += '<div class="preview-item"><span class="preview-label">Anfang:</span><span class="preview-value" style="font-family:monospace;white-space:pre-wrap;max-height:200px;overflow:auto;">' + escapeHtml( data.preview ) + '</span></div>';
        $( '#fh-html-import-preview-area' ).html( html ).show();
    }

    function showHtmlResult( data, success ) {
        var html = '<div class="' + ( success ? 'success' : 'error' ) + '">';
        html += '<strong>' + ( success ? 'Erfolg' : 'Fehler' ) + ':</strong> ' + escapeHtml( data.message );
        if ( data.domain ) {
            html += ' (Domain: ' + escapeHtml( data.domain ) + ')';
        }
        if ( data.size ) {
            html += ' · ' + Math.round( data.size / 1024 ) + ' KB';
        }
        html += '</div>';
        $( '#fh-html-import-result' ).html( html ).show();
    }

    function showHtmlError( msg ) {
        $( '#fh-html-import-result' ).html( '<div class="error"><strong>Fehler:</strong> ' + escapeHtml( msg ) + '</div>' ).show();
    }

    // ==================== HILFSFUNKTIONEN ====================

    function escapeHtml( text ) {
        var map = {
            '&': '&',
            '<': '<',
            '>': '>',
            '"': '"',
            "'": '&#039;'
        };
        return text.replace( /[&<>"']/g, function( m ) { return map[ m ]; } );
    }
});