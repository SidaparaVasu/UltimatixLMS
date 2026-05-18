/**
 * Feature: certificate-management
 * Property 9: Certificate Status Badge Display
 *
 * For any CertificateRecord, CertificateCard SHALL render exactly ONE badge
 * with the correct text:
 *   - status='active'  + expiry > 30 days away (or null) → "Active"
 *   - status='active'  + expiry within 30 days            → "Expiring Soon"
 *   - status='expired'                                     → "Expired"
 * Exactly one badge SHALL be rendered — mutual exclusivity.
 *
 * Validates: Requirements 10.5, 10.6
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { render } from '@testing-library/react';
import React from 'react';
import { CertificateCard } from '@/components/certificates/CertificateCard';
import { CertificateRecord } from '@/types/certificate.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

const BADGE_LABELS = ['Active', 'Expiring Soon', 'Expired'];

// ── Base record (learner view — no admin-only fields) ─────────────────────────

const baseCert: Omit<CertificateRecord, 'status' | 'expiry_date'> = {
  id: 1,
  certificate_id: 'abc-123',
  course_or_assessment_name: 'Test Course',
  certificate_type: 'course',
  completion_date: '2024-01-01',
  issued_at: '2024-01-01T00:00:00Z',
  is_revoked: false,
  verification_url: '/verify/certificate/abc-123',
};

// Generate records covering all three badge scenarios
const certArbitrary = fc.oneof(
  // Active, no expiry
  fc.constant({ ...baseCert, status: 'active' as const, expiry_date: null }),
  // Active, expiry > 30 days
  fc.integer({ min: 31, max: 365 }).map((days) => ({
    ...baseCert,
    status: 'active' as const,
    expiry_date: daysFromNow(days),
  })),
  // Active, expiry within 30 days (expiring soon)
  fc.integer({ min: 1, max: 30 }).map((days) => ({
    ...baseCert,
    status: 'active' as const,
    expiry_date: daysFromNow(days),
  })),
  // Expired
  fc.constant({ ...baseCert, status: 'expired' as const, expiry_date: daysFromNow(-10) }),
);

// ── Property tests ────────────────────────────────────────────────────────────

describe('Property 9 — Certificate Status Badge Display', () => {
  it('exactly one status badge is rendered per card (100 runs)', () => {
    fc.assert(
      fc.property(certArbitrary, (cert) => {
        const { getAllByText, unmount } = render(
          <CertificateCard
            certificate={cert}
            onDownload={() => {}}
            isDownloading={false}
          />
        );

        let badgeCount = 0;
        for (const label of BADGE_LABELS) {
          try {
            const els = getAllByText(label);
            badgeCount += els.length;
          } catch {
            // label not found — fine
          }
        }

        unmount();
        return badgeCount === 1;
      }),
      { numRuns: 100 }
    );
  });

  it('expired status always shows "Expired" badge (100 runs)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }).map((days) => ({
          ...baseCert,
          status: 'expired' as const,
          expiry_date: daysFromNow(-days),
        })),
        (cert) => {
          const { queryByText, unmount } = render(
            <CertificateCard certificate={cert} onDownload={() => {}} isDownloading={false} />
          );
          const result = queryByText('Expired') !== null;
          unmount();
          return result;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('active cert expiring within 30 days shows "Expiring Soon" (100 runs)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }).map((days) => ({
          ...baseCert,
          status: 'active' as const,
          expiry_date: daysFromNow(days),
        })),
        (cert) => {
          const { queryByText, unmount } = render(
            <CertificateCard certificate={cert} onDownload={() => {}} isDownloading={false} />
          );
          const result = queryByText('Expiring Soon') !== null;
          unmount();
          return result;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('active cert with null expiry shows "Active" badge (100 runs)', () => {
    fc.assert(
      fc.property(
        fc.constant({ ...baseCert, status: 'active' as const, expiry_date: null }),
        (cert) => {
          const { queryByText, unmount } = render(
            <CertificateCard certificate={cert} onDownload={() => {}} isDownloading={false} />
          );
          const result = queryByText('Active') !== null;
          unmount();
          return result;
        }
      ),
      { numRuns: 100 }
    );
  });
});
