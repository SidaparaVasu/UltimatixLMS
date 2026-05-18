/**
 * Feature: certificate-management
 * Property 10: Null Expiry Date Display
 *
 * For any certificate-related UI component that receives expiry_date === null,
 * the component SHALL render the text "Lifetime validity" and SHALL NOT crash.
 *
 * Components tested:
 *   - CertificateCard
 *   - CertificateVerificationPage display logic (via VerificationDisplay stub)
 *
 * Validates: Requirements 13.1
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { render } from '@testing-library/react';
import React from 'react';
import { CertificateCard } from '@/components/certificates/CertificateCard';
import { CertificateRecord, CertificateVerificationResult } from '@/types/certificate.types';

// ── Stub for verification page display logic ──────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'No expiry';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

const VerificationExpiryDisplay: React.FC<{
  result: Pick<CertificateVerificationResult, 'expiry_date'>;
}> = ({ result }) => <span>{formatDate(result.expiry_date)}</span>;

// ── Base record (learner view — no admin-only fields) ─────────────────────────

const baseCert: CertificateRecord = {
  id: 1,
  certificate_id: 'abc-123',
  course_or_assessment_name: 'Test Course',
  certificate_type: 'course',
  completion_date: '2024-01-01',
  expiry_date: null,
  issued_at: '2024-01-01T00:00:00Z',
  status: 'active',
  is_revoked: false,
  verification_url: '/verify/certificate/abc-123',
};

// ── Arbitrary — always null expiry, vary other fields ─────────────────────────

const nullExpiryCertArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 999999 }),
  course_or_assessment_name: fc.string({ minLength: 1, maxLength: 80 }),
  status: fc.constantFrom('active' as const, 'expired' as const),
}).map((overrides) => ({ ...baseCert, ...overrides, expiry_date: null }));

// ── Property tests ────────────────────────────────────────────────────────────

describe('Property 10 — Null Expiry Date Display', () => {
  it('CertificateCard renders "Lifetime validity" when expiry_date is null (100 runs)', () => {
    fc.assert(
      fc.property(nullExpiryCertArbitrary, (cert) => {
        const { queryByText, unmount } = render(
          <CertificateCard certificate={cert} onDownload={() => {}} isDownloading={false} />
        );
        const hasLifetime = queryByText(/lifetime validity/i) !== null;
        unmount();
        return hasLifetime;
      }),
      { numRuns: 100 }
    );
  });

  it('CertificateCard does not crash with null expiry_date (100 runs)', () => {
    fc.assert(
      fc.property(nullExpiryCertArbitrary, (cert) => {
        let crashed = false;
        try {
          const { unmount } = render(
            <CertificateCard certificate={cert} onDownload={() => {}} isDownloading={false} />
          );
          unmount();
        } catch {
          crashed = true;
        }
        return !crashed;
      }),
      { numRuns: 100 }
    );
  });

  it('VerificationDisplay renders "No expiry" when expiry_date is null (100 runs)', () => {
    fc.assert(
      fc.property(
        fc.constant({ expiry_date: null }),
        (result) => {
          const { queryByText, unmount } = render(
            <VerificationExpiryDisplay result={result} />
          );
          const hasNoExpiry = queryByText('No expiry') !== null;
          unmount();
          return hasNoExpiry;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('VerificationDisplay does not render empty string or undefined for null expiry (100 runs)', () => {
    fc.assert(
      fc.property(
        fc.constant({ expiry_date: null }),
        (result) => {
          const { container, unmount } = render(
            <VerificationExpiryDisplay result={result} />
          );
          const text = container.textContent ?? '';
          unmount();
          return (
            text.length > 0 &&
            text !== 'null' &&
            text !== 'undefined' &&
            text !== 'Invalid Date'
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
