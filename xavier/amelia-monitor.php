/**
 * Plugin Name: Amelia SMS Monitoring
 * Description: Monitors Amelia SMS authentication, retries/provider status, and stuck SMS queues.
 * Version: 2.0.0
 */

defined('ABSPATH') || exit;


/**
 * -------------------------------------------------------------------------
 * Configuration
 * -------------------------------------------------------------------------
 */

const AMELIA_SMS_MONITORING_CRON_HOOK =
    'amelia_sms_monitoring_hourly';

const AMELIA_SMS_MONITORING_ALERT_OPTION =
    'amelia_sms_monitoring_last_alert';

/**
 * An SMS must be at least this old before a queued/prepared status
 * is considered worth checking.
 */
const AMELIA_SMS_MONITORING_STALE_SECONDS =
    HOUR_IN_SECONDS;

/**
 * Never send more than one automatic warning email per 24 hours.
 */
const AMELIA_SMS_MONITORING_ALERT_INTERVAL =
    DAY_IN_SECONDS;

/**
 * Protect WP-Cron from having to make hundreds of HTTP requests
 * during one execution.
 *
 * Any excess stale rows remain eligible for the next hourly run.
 */
const AMELIA_SMS_MONITORING_REFRESH_LIMIT = 50;


/**
 * -------------------------------------------------------------------------
 * Make sure the hourly native WordPress cron event exists.
 *
 * MU plugins do not have a normal activation hook, so we ensure the
 * event exists during init.
 * -------------------------------------------------------------------------
 */

add_action('init', function () {

    if (!wp_next_scheduled(AMELIA_SMS_MONITORING_CRON_HOOK)) {

        wp_schedule_event(
            time() + 300,
            'hourly',
            AMELIA_SMS_MONITORING_CRON_HOOK
        );
    }
});


add_action(
    AMELIA_SMS_MONITORING_CRON_HOOK,
    'amelia_sms_monitoring_run'
);


/**
 * -------------------------------------------------------------------------
 * Get Amelia settings.
 *
 * On this installation, amelia_settings is stored as JSON rather than
 * being automatically unserialized into a PHP array.
 * -------------------------------------------------------------------------
 */

function amelia_sms_monitoring_get_settings() {

    $settings = get_option('amelia_settings');

    if (is_string($settings)) {

        $decoded = json_decode($settings, true);

        if (
            json_last_error() === JSON_ERROR_NONE &&
            is_array($decoded)
        ) {
            $settings = $decoded;
        }
    }

    return is_array($settings) ? $settings : [];
}


/**
 * -------------------------------------------------------------------------
 * Make an authenticated GET request to Amelia's SMS API.
 * -------------------------------------------------------------------------
 */

function amelia_sms_monitoring_api_get($path, $token) {

    $url =
        'https://smsapi.wpamelia.com/' .
        ltrim($path, '/');

    return wp_remote_get(
        $url,
        [
            'timeout' => 20,
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Accept'        => 'application/json',
            ],
        ]
    );
}


/**
 * -------------------------------------------------------------------------
 * Parse an Amelia SMS API response.
 *
 * Returns:
 *
 * [
 *     'ok'        => bool,
 *     'http_code' => int,
 *     'json'      => array|null,
 *     'error'     => string,
 * ]
 * -------------------------------------------------------------------------
 */

function amelia_sms_monitoring_parse_api_response($response) {

    if (is_wp_error($response)) {

        return [
            'ok'        => false,
            'http_code' => 0,
            'json'      => null,
            'error'     => $response->get_error_message(),
        ];
    }

    $http_code =
        (int) wp_remote_retrieve_response_code($response);

    $body =
        wp_remote_retrieve_body($response);

    $json =
        json_decode($body, true);

    $ok = (
        $http_code >= 200 &&
        $http_code < 300 &&
        is_array($json) &&
        isset($json['status']) &&
        strtoupper((string) $json['status']) === 'OK'
    );

    $error = '';

    if (!$ok) {

        if (
            is_array($json) &&
            isset($json['message']) &&
            is_scalar($json['message'])
        ) {
            $error = (string) $json['message'];
        }

        if ($error === '') {
            $error = 'Unexpected Amelia SMS API response.';
        }
    }

    return [
        'ok'        => $ok,
        'http_code' => $http_code,
        'json'      => $json,
        'error'     => $error,
    ];
}


/**
 * -------------------------------------------------------------------------
 * Run Amelia SMS monitoring.
 * -------------------------------------------------------------------------
 */

function amelia_sms_monitoring_run($force_email = false) {

    global $wpdb;

    $notifications_table =
        $wpdb->prefix . 'amelia_notifications';

    $log_table =
        $wpdb->prefix . 'amelia_notifications_log';

    $history_table =
        $wpdb->prefix . 'amelia_notifications_sms_history';


    $problems = [];
    $details  = [];


    /**
     * ---------------------------------------------------------------------
     * 1. Check Amelia's own notification retry log.
     *
     * sent = 0 is important because Amelia uses these entries for failed
     * SMS attempts that can later be retried.
     * ---------------------------------------------------------------------
     */

    $stale_cutoff =
        gmdate(
            'Y-m-d H:i:s',
            time() - AMELIA_SMS_MONITORING_STALE_SECONDS
        );


    $stale_unsent = (int) $wpdb->get_var(
        $wpdb->prepare(
            "
            SELECT COUNT(*)
            FROM {$log_table} l
            INNER JOIN {$notifications_table} n
                ON n.id = l.notificationId
            WHERE n.type = 'sms'
              AND l.sent = 0
              AND l.sentDateTime < %s
            ",
            $stale_cutoff
        )
    );


    if ($stale_unsent > 0) {

        $problems[] = sprintf(
            '%d SMS notification(s) have remained unsent for more than 1 hour.',
            $stale_unsent
        );
    }


    $current_unsent = (int) $wpdb->get_var(
        "
        SELECT COUNT(*)
        FROM {$log_table} l
        INNER JOIN {$notifications_table} n
            ON n.id = l.notificationId
        WHERE n.type = 'sms'
          AND l.sent = 0
        "
    );


    $oldest_unsent = $wpdb->get_var(
        "
        SELECT MIN(l.sentDateTime)
        FROM {$log_table} l
        INNER JOIN {$notifications_table} n
            ON n.id = l.notificationId
        WHERE n.type = 'sms'
          AND l.sent = 0
        "
    );


    if ($oldest_unsent) {

        $oldest_timestamp =
            strtotime($oldest_unsent . ' UTC');

        if ($oldest_timestamp) {

            $details[] =
                'Oldest unsent SMS: ' .
                human_time_diff(
                    $oldest_timestamp,
                    time()
                ) .
                ' ago';
        }
    }


    /**
     * ---------------------------------------------------------------------
     * 2. Load Amelia SMS authentication.
     * ---------------------------------------------------------------------
     */

    $settings =
        amelia_sms_monitoring_get_settings();

    $notification_settings =
        $settings['notifications'] ?? [];

    $sms_token =
        $notification_settings['smsApiToken'] ?? '';

    $sms_signed_in =
        $notification_settings['smsSignedIn'] ?? null;


    $details[] =
        'Amelia smsSignedIn: ' .
        var_export($sms_signed_in, true);

    $details[] =
        'SMS token present: ' .
        (!empty($sms_token) ? 'yes' : 'no');


    /**
     * ---------------------------------------------------------------------
     * 3. Check the SMS account directly with Amelia's provider API.
     *
     * This is authoritative. We don't rely solely on smsSignedIn.
     * ---------------------------------------------------------------------
     */

    $api_authenticated = false;

    if (empty($sms_token)) {

        $problems[] =
            'Amelia SMS authentication token is missing.';

    } else {

        $auth_response =
            amelia_sms_monitoring_api_get(
                'auth/info',
                $sms_token
            );

        $auth =
            amelia_sms_monitoring_parse_api_response(
                $auth_response
            );


        if (!$auth['ok']) {

            $problem = sprintf(
                'Amelia SMS API authentication/health check failed (HTTP %d).',
                $auth['http_code']
            );

            if ($auth['error'] !== '') {
                $problem .= ' Response: ' . $auth['error'];
            }

            $problems[] = $problem;

        } else {

            $api_authenticated = true;

            $details[] =
                'Amelia SMS API authentication: OK';


            /**
             * Balance is useful diagnostic context.
             */
            if (
                isset($auth['json']['user']['balance'])
            ) {
                $details[] =
                    'SMS account balance: ' .
                    $auth['json']['user']['balance'];
            }
        }
    }


    /**
     * ---------------------------------------------------------------------
     * 4. Find stale local statuses.
     *
     * IMPORTANT:
     *
     * "queued" in Amelia does NOT necessarily mean the SMS is actually
     * still queued.
     *
     * Amelia frequently doesn't receive the later provider callback.
     *
     * We therefore ask the provider for the real current status before
     * deciding whether there is a problem.
     * ---------------------------------------------------------------------
     */

    $stale_status_total = (int) $wpdb->get_var(
        $wpdb->prepare(
            "
            SELECT COUNT(*)
            FROM {$history_table}
            WHERE status IN ('prepared', 'accepted', 'queued')
              AND (
                    dateTime IS NULL
                    OR dateTime < %s
                  )
            ",
            $stale_cutoff
        )
    );


    $details[] =
        'Stale local prepared/accepted/queued rows before refresh: ' .
        $stale_status_total;


    /**
     * Only query provider delivery statuses when the SMS account itself
     * authenticated successfully.
     */
    $provider_checked     = 0;
	$provider_delivered   = 0;
	$provider_sent        = 0;
	$provider_still_stuck = 0;
	$provider_failed      = 0;
	$provider_errors      = 0;
	$missing_log_id       = 0;

	/**
	 * Track provider results by send batch.
	 *
	 * We use the original Amelia dateTime rounded/grouped to the minute.
	 * Messages generated together by the scheduler share the same batch.
	 */
	$provider_batches = [];


    if (
        $api_authenticated &&
        $stale_status_total > 0
    ) {

        $limit =
            (int) AMELIA_SMS_MONITORING_REFRESH_LIMIT;


        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "
                SELECT
                    id,
                    logId,
                    status,
                    dateTime,
                    phone,
                    appointmentId,
                    notificationId
                FROM {$history_table}
                WHERE status IN ('prepared', 'accepted', 'queued')
                  AND (
                        dateTime IS NULL
                        OR dateTime < %s
                      )
                ORDER BY
                    CASE
                        WHEN dateTime IS NULL THEN 0
                        ELSE 1
                    END,
                    dateTime ASC,
                    id ASC
                LIMIT %d
                ",
                $stale_cutoff,
                $limit
            ),
            ARRAY_A
        );


        foreach ($rows as $row) {

            $history_id =
                (int) $row['id'];

			/**
			 * Identify the sending batch.
			 *
			 * Amelia's scheduled messages generated together normally share
			 * the same dateTime minute, e.g. 2026-09-28 23:00 UTC.
			 */
			$batch_key = 'unknown';

			if (!empty($row['dateTime'])) {
				$batch_timestamp = strtotime($row['dateTime'] . ' UTC');

				if ($batch_timestamp) {
					$batch_key = gmdate('Y-m-d H:i', $batch_timestamp);
				}
			}

			if (!isset($provider_batches[$batch_key])) {
				$provider_batches[$batch_key] = [
					'total'      => 0,
					'successful' => 0,
					'failed'     => 0,
					'pending'    => 0,
					'errors'     => 0,
				];
			}

			$provider_batches[$batch_key]['total']++;
			
            $log_id =
                isset($row['logId'])
                    ? trim((string) $row['logId'])
                    : '';


            /**
             * Without a provider log ID there is nothing we can ask
             * /sms/refresh about.
             *
             * A stale prepared row with no log ID is therefore suspicious.
             */
            if ($log_id === '') {

                $missing_log_id++;

                continue;
            }


            $provider_checked++;


            /**
             * This is the same provider endpoint Amelia's own
             * refreshSMSHistory() method uses.
             */
            $refresh_response =
                amelia_sms_monitoring_api_get(
                    'sms/refresh/' .
                    rawurlencode($log_id),
                    $sms_token
                );


            $refresh =
                amelia_sms_monitoring_parse_api_response(
                    $refresh_response
                );


			if (!$refresh['ok']) {

				$provider_errors++;
				$provider_batches[$batch_key]['errors']++;

				continue;
			}


            $message =
                $refresh['json']['message'] ?? null;


            if (!is_array($message)) {

                $provider_errors++;
				$provider_batches[$batch_key]['errors']++;
                continue;
            }


            $provider_status =
                isset($message['status'])
                    ? strtolower(
                        trim((string) $message['status'])
                    )
                    : '';


            $valid_statuses = [
                'prepared',
                'accepted',
                'queued',
                'sent',
                'failed',
                'delivered',
                'undelivered',
            ];


			if (
				!in_array(
					$provider_status,
					$valid_statuses,
					true
				)
			) {
				$provider_errors++;
				$provider_batches[$batch_key]['errors']++;
				continue;
			}


            /**
             * -------------------------------------------------------------
             * Update Amelia's local history with the real provider result.
             *
             * This is equivalent in purpose to clicking the refresh icon
             * in Amelia.
             *
             * Do NOT update dateTime here. We want to retain the original
             * SMS age so a genuinely stuck queue doesn't become "young"
             * again every hour.
             * -------------------------------------------------------------
             */

            $update = [
                'status' => $provider_status,
            ];

            $formats = [
                '%s',
            ];


            if (
                array_key_exists('price', $message) &&
                is_numeric($message['price'])
            ) {

                $update['price'] =
                    (float) $message['price'];

                $formats[] = '%f';
            }


            if (
                array_key_exists('segments', $message) &&
                is_numeric($message['segments'])
            ) {

                $update['segments'] =
                    (int) $message['segments'];

                $formats[] = '%d';
            }


            $wpdb->update(
                $history_table,
                $update,
                [
                    'id' => $history_id,
                ],
                $formats,
                [
                    '%d',
                ]
            );


            /**
             * Interpret provider status.
             */
			switch ($provider_status) {

				case 'delivered':

					$provider_delivered++;
					$provider_batches[$batch_key]['successful']++;

					break;


				case 'sent':

					$provider_sent++;
					$provider_batches[$batch_key]['successful']++;

					break;


				case 'failed':
				case 'undelivered':

					$provider_failed++;
					$provider_batches[$batch_key]['failed']++;

					break;


				case 'prepared':
				case 'accepted':
				case 'queued':

					$provider_still_stuck++;
					$provider_batches[$batch_key]['pending']++;

					break;
			}
        }
    }


    /**
     * ---------------------------------------------------------------------
     * 5. Decide whether the refreshed provider state indicates a problem.
     * ---------------------------------------------------------------------
     */


    if ($missing_log_id > 0) {

        $problems[] = sprintf(
            '%d stale SMS message(s) have no provider log ID, so their delivery status cannot be verified.',
            $missing_log_id
        );
    }


    if ($provider_still_stuck > 0) {

        $problems[] = sprintf(
            '%d SMS message(s) are more than 1 hour old and the Amelia SMS provider STILL reports them as prepared/accepted/queued.',
            $provider_still_stuck
        );
    }


	/**
	 * Alert only when an entire send batch failed.
	 *
	 * Individual failed/undelivered SMS messages are expected occasionally
	 * (for example, customers providing landline numbers).
	 */
	$fully_failed_batches = [];

	foreach ($provider_batches as $batch_key => $batch) {

		/**
		 * A batch is considered completely failed only when:
		 *
		 * - at least one provider result exists
		 * - zero messages succeeded
		 * - zero messages remain pending
		 * - zero provider lookup errors occurred
		 * - every checked message failed/was undelivered
		 */
		if (
			$batch['total'] > 0 &&
			$batch['successful'] === 0 &&
			$batch['pending'] === 0 &&
			$batch['errors'] === 0 &&
			$batch['failed'] === $batch['total']
		) {
			$fully_failed_batches[$batch_key] = $batch;
		}
	}

	if (!empty($fully_failed_batches)) {

		foreach ($fully_failed_batches as $batch_key => $batch) {

			$problems[] = sprintf(
				'All %d SMS message(s) in send batch %s were confirmed failed or undelivered by the Amelia SMS provider.',
				$batch['total'],
				$batch_key
			);
		}
	}


    if ($provider_errors > 0) {

        $problems[] = sprintf(
            'Could not retrieve the provider delivery status for %d stale SMS message(s).',
            $provider_errors
        );
    }


    /**
     * If there were more stale records than we're willing to query during
     * one WP-Cron run, make that visible.
     */
    if (
        $stale_status_total >
        AMELIA_SMS_MONITORING_REFRESH_LIMIT
    ) {

        $details[] = sprintf(
            'Provider refresh was limited to %d messages this run; %d stale records existed.',
            AMELIA_SMS_MONITORING_REFRESH_LIMIT,
            $stale_status_total
        );
    }


    /**
     * ---------------------------------------------------------------------
     * 6. Diagnostic details.
     * ---------------------------------------------------------------------
     */

    $details[] =
        'Current unsent SMS log entries: ' .
        $current_unsent;

    $details[] =
        'Stale unsent (>1 hour): ' .
        $stale_unsent;

    $details[] =
        'Provider statuses checked: ' .
        $provider_checked;

    $details[] =
        'Provider confirmed delivered: ' .
        $provider_delivered;

    $details[] =
        'Provider confirmed sent: ' .
        $provider_sent;

    $details[] =
        'Provider still queued/prepared/accepted: ' .
        $provider_still_stuck;

    $details[] =
        'Provider confirmed failed/undelivered: ' .
        $provider_failed;

    $details[] =
        'Provider refresh errors: ' .
        $provider_errors;

    $details[] =
        'Stale rows without provider log ID: ' .
        $missing_log_id;


    /**
     * ---------------------------------------------------------------------
     * Nothing is wrong.
     * ---------------------------------------------------------------------
     */

    if (
        empty($problems) &&
        !$force_email
    ) {

        return [
            'healthy'  => true,
            'problems' => [],
            'details'  => $details,
        ];
    }


    /**
     * ---------------------------------------------------------------------
     * 7. Alert throttling.
     *
     * No more than one automatic warning email every 24 hours.
     * ---------------------------------------------------------------------
     */

    $last_alert = (int) get_option(
        AMELIA_SMS_MONITORING_ALERT_OPTION,
        0
    );


    if (
        !$force_email &&
        $last_alert &&
        (time() - $last_alert) <
            AMELIA_SMS_MONITORING_ALERT_INTERVAL
    ) {

        return [
            'healthy'    => false,
            'throttled'  => true,
            'problems'   => $problems,
            'details'    => $details,
        ];
    }


    /**
     * ---------------------------------------------------------------------
     * 8. Build warning email.
     * ---------------------------------------------------------------------
     */

    $site_name = wp_specialchars_decode(
        get_bloginfo('name'),
        ENT_QUOTES
    );


    $subject = sprintf(
        '[WARNING] Amelia SMS problem - %s',
        $site_name
    );


    $message =
        "An Amelia SMS problem was detected.\n\n";


    $message .=
        "PROBLEMS\n";

    $message .=
        "========\n";


    if ($problems) {

        foreach ($problems as $problem) {

            $message .=
                "- {$problem}\n";
        }

    } else {

        $message .=
            "- Manual monitoring test.\n";
    }


    $message .=
        "\nDETAILS\n";

    $message .=
        "=======\n";


    foreach ($details as $detail) {

        $message .=
            "- {$detail}\n";
    }


    $message .= "\n";

    $message .=
        'Site: ' .
        home_url('/') .
        "\n";

    $message .=
        'Checked: ' .
        wp_date('Y-m-d H:i:s T') .
        "\n\n";

    $message .=
        "Check:\n";

    $message .=
        "WordPress Admin > Amelia > Settings > Notifications > SMS\n";


    /**
     * ---------------------------------------------------------------------
     * Use WordPress's configured SMTP/mail system.
     * ---------------------------------------------------------------------
     */

    $recipients = [
        'adminmax@gmail.com',
        'xavierstcyr@hotmail.com',
    ];


    $sent = wp_mail(
        $recipients,
        $subject,
        $message
    );


    /**
     * Only begin the 24-hour cooldown if wp_mail() accepted the message.
     */
    if ($sent) {

        update_option(
            AMELIA_SMS_MONITORING_ALERT_OPTION,
            time(),
            false
        );
    }


    return [
        'healthy'   => empty($problems),
        'emailSent' => $sent,
        'problems'  => $problems,
        'details'   => $details,
    ];
}


/**
 * -------------------------------------------------------------------------
 * WP-CLI commands
 * -------------------------------------------------------------------------
 *
 * Normal health check:
 *
 * wp amelia-sms-monitoring check
 *
 *
 * Send a test email:
 *
 * wp amelia-sms-monitoring test-email
 *
 * A test email does NOT consume/reset the real 24-hour alert cooldown.
 * -------------------------------------------------------------------------
 */

if (
    defined('WP_CLI') &&
    WP_CLI
) {

    WP_CLI::add_command(
        'amelia-sms-monitoring check',
        function () {

            $result =
                amelia_sms_monitoring_run(false);


            if (
                is_array($result) &&
                !empty($result['details'])
            ) {

                WP_CLI::line('');

                WP_CLI::line('Details:');

                foreach ($result['details'] as $detail) {

                    WP_CLI::line(
                        '  - ' . $detail
                    );
                }
            }


            if (
                is_array($result) &&
                !empty($result['problems'])
            ) {

                WP_CLI::line('');

                WP_CLI::warning(
                    'Amelia SMS monitoring found problems:'
                );


                foreach ($result['problems'] as $problem) {

                    WP_CLI::line(
                        '  - ' . $problem
                    );
                }

            } else {

                WP_CLI::success(
                    'Amelia SMS monitoring check completed: healthy.'
                );
            }
        }
    );


    WP_CLI::add_command(
        'amelia-sms-monitoring test-email',
        function () {

            /**
             * Preserve the genuine alert timestamp.
             */
            $old_value = get_option(
                AMELIA_SMS_MONITORING_ALERT_OPTION,
                false
            );


            delete_option(
                AMELIA_SMS_MONITORING_ALERT_OPTION
            );


            amelia_sms_monitoring_run(true);


            /**
             * Restore the genuine alert timestamp.
             */
            if ($old_value !== false) {

                update_option(
                    AMELIA_SMS_MONITORING_ALERT_OPTION,
                    $old_value,
                    false
                );

            } else {

                delete_option(
                    AMELIA_SMS_MONITORING_ALERT_OPTION
                );
            }


            WP_CLI::success(
                'Monitoring test email was requested.'
            );
        }
    );
}
