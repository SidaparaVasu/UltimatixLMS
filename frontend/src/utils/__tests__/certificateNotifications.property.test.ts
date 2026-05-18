/**
 * Feature: certificate-management
 * Property 7: Renewal Check Correctness
 * Property 8: Renewal Notification Deduplication
 *
 * Property 7: checkRenewalNotifications SHALL flag exactly those certificates
 * where status === 'active', is_revoked === false, expiry_date is not null,
 * and daysUntilExpiry is in (0, 30].
 *
 * Property 8: Certificates whose IDs are already in sessionStorage SHALL NOT
 * produce notifications, regardless of expiry proximity.
 *
 * Validates: Requirements 10.1, 10.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { checkRenewalNotifications, RENEWAL_SESSION_KEY, RENEWAL_THRESHOLD_DAYS } from '@/utils/certificateNotifications';
import { CertificateRecord } from '@/types/certificate.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const certArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 999999 }),
  certificate_id: fc.uuid(),
  learner_name: fc.string({ minLength: 1, maxLength: 50 }),
  learner_id: fc.integer({ min: 1 }),
  course_or_assessment_name: fc.string({ minLength: 1, maxLength: 80 }),
  certificate_type: fc.constantFrom('course' as const, 'assessment' as const),
  completion_date: fc.constant('2024-01-01'),
  expiry_date: fc.option(
    fc.integer({ min: -10, max: 60 }).map((days) => daysFromNow(days)),
    { nil: null, freq: 3 }
  ),
  issued_at: fc.constant('2024-01-01T00:00:00Z'),
  status: fc.constantFrom('active' as const, 'expired' as const),
  is_revoked: fc.boolean(),
  template_id: fc.option(fc.integer({ min: 1 }), { nil: null }),
  verification_url: fc.constant('https://example.com/verify/abc'),
});

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  sessionStorage.clear();
});

// ── Property 7 ────────────────────────────────────────────────────────────────

describe('Property 7 — Renewal Check Correctness', () => {
  it('flags exactly the certificates that satisfy the renewal condition (100 runs)', () => {
    fc.assert(
      fc.property(
        fc.array(certArbitrary, { minLength: 0, maxLength: 15 }),
        (certificates) => {
          sessionStorage.clear();
          const notified: number[] = [];
          checkRenewalNotifications(certificates, (_msg, _type) => {
            // We can't easily capture which cert triggered this without
            // inspecting sessionStorage after the call
          });

          // Read what was stored
          const stored: number[] = JSON.parse(
            sessionStorage.getItem(RENEWAL_SESSION_KEY) ?? '[]'
          );

          // Compute expected set
          const now = Date.now();
          const expected = certificates
            .filter((c) => {
              if (c.status !== 'active' || c.is_revoked) return false;
              if (!c.expiry_date) return false;
              const days = (new Date(c.expiry_date).getTime() - now) / (24 * 60 * 60 * 1000);
              return days > 0 && days <= RENEWAL_THRESHOLD_DAYS;
            })
            .map((c) => c.id);

          // stored IDs must match expected IDs (order-independent)
          const storedSet = new Set(stored);
          const expectedSet = new Set(expected);

          return (
            storedSet.size === expectedSet.size &&
            [...expectedSet].every((id) => storedSet.has(id))
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('already-expired certs (status=expired) are never flagged (100 runs)', () => {
    fc.assert(
      fc.property(
        fc.array(
          certArbitrary.map((c) => ({ ...c, status: 'expired' as const })),
          { minLength: 1, maxLength: 10 }
        ),
        (certificates) => {
          sessionStorage.clear();
          checkRenewalNotifications(certificates, () => {});
          const stored: number[] = JSON.parse(
            sessionStorage.getItem(RENEWAL_SESSION_KEY) ?? '[]'
          );
          return stored.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('certs with null expiry_date are never flagged (100 runs)', () => {
    fc.assert(
      fc.property(
        fc.array(
          certArbitrary.map((c) => ({ ...c, expiry_date: null, status: 'active' as const, is_revoked: false })),
          { minLength: 1, maxLength: 10 }
        ),
        (certificates) => {
          sessionStorage.clear();
          checkRenewalNotifications(certificates, () => {});
          const stored: number[] = JSON.parse(
            sessionStorage.getItem(RENEWAL_SESSION_KEY) ?? '[]'
          );
          return stored.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 8 ────────────────────────────────────────────────────────────────

describe('Property 8 — Renewal Notification Deduplication', () => {
  it('pre-populated IDs in sessionStorage are never re-notified (100 runs)', () => {
    fc.assert(
      fc.property(
        fc.array(certArbitrary, { minLength: 1, maxLength: 10 }),
        (certificates) => {
          // Pre-populate sessionStorage with ALL cert IDs
          const allIds = certificates.map((c) => c.id);
          sessionStorage.setItem(RENEWAL_SESSION_KEY, JSON.stringify(allIds));

          let notificationCount = 0;
          checkRenewalNotifications(certificates, () => {
            notificationCount++;
          });

          return notificationCount === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('only new IDs are added to sessionStorage on second call (100 runs)', () => {
    fc.assert(
      fc.property(
        fc.array(
          certArbitrary.map((c) => ({
            ...c,
            status: 'active' as const,
            is_revoked: false,
            expiry_date: daysFromNow(10), // always within threshold
          })),
          { minLength: 2, maxLength: 8 }
        ),
        (certificates) => {
          sessionStorage.clear();

          // First call — notifies all
          checkRenewalNotifications(certificates, () => {});
          const afterFirst: number[] = JSON.parse(
            sessionStorage.getItem(RENEWAL_SESSION_KEY) ?? '[]'
          );

          // Second call — should produce no new notifications
          let secondCallCount = 0;
          checkRenewalNotifications(certificates, () => {
            secondCallCount++;
          });

          return secondCallCount === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});
