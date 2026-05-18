/**
 * certificateNotifications — renewal notification logic for the My Certificates page.
 *
 * Pure utility extracted so it can be tested independently of React.
 * Uses sessionStorage to deduplicate notifications within the same browser session.
 */

import { CertificateRecord } from '@/types/certificate.types';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

export const RENEWAL_THRESHOLD_DAYS = 30;
export const RENEWAL_SESSION_KEY = 'cert_renewal_notified';

/**
 * Checks each certificate for upcoming expiry and fires a notification
 * for any that are within the threshold and haven't been notified yet
 * in this session.
 *
 * @param certificates  The learner's certificate list
 * @param showNotification  Callback to display an in-app notification
 */
export function checkRenewalNotifications(
  certificates: CertificateRecord[],
  showNotification: (message: string, type: NotificationType) => void
): void {
  const now = new Date();
  const thresholdMs = RENEWAL_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

  // Load already-notified IDs from sessionStorage
  let notified: Set<number>;
  try {
    const raw = sessionStorage.getItem(RENEWAL_SESSION_KEY);
    notified = new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    notified = new Set();
  }

  const newlyNotified: number[] = [];

  for (const cert of certificates) {
    // Only active, non-revoked certs with an expiry date
    if (cert.status !== 'active' || cert.is_revoked) continue;
    if (!cert.expiry_date) continue;
    // Skip if already notified this session
    if (notified.has(cert.id)) continue;

    const expiryMs = new Date(cert.expiry_date).getTime();
    const daysUntilExpiry = (expiryMs - now.getTime()) / (24 * 60 * 60 * 1000);

    // Notify if expiry is within (0, 30] days
    if (daysUntilExpiry > 0 && daysUntilExpiry <= RENEWAL_THRESHOLD_DAYS) {
      const expiryFormatted = new Date(cert.expiry_date).toLocaleDateString('en-GB'); // DD/MM/YYYY
      showNotification(
        `Your certificate for "${cert.course_or_assessment_name}" expires on ${expiryFormatted}. Visit My Certificates to take action.`,
        'warning'
      );
      newlyNotified.push(cert.id);
    }
  }

  // Persist newly notified IDs to sessionStorage
  if (newlyNotified.length > 0) {
    const updated = [...notified, ...newlyNotified];
    try {
      sessionStorage.setItem(RENEWAL_SESSION_KEY, JSON.stringify(updated));
    } catch {
      // sessionStorage unavailable — silently skip persistence
    }
  }
}
