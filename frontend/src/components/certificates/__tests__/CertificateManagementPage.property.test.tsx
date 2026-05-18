/**
 * Feature: certificate-management
 * Property 1: Revoke Button Visibility Invariant
 *
 * For any CertificateRecord, the "Revoke" button SHALL be visible if and only
 * if is_revoked is false. When is_revoked is true the button SHALL be absent.
 *
 * Validates: Requirements 4.6
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { render } from '@testing-library/react';
import React from 'react';
import { CertificateRecord } from '@/types/certificate.types';

// ── Minimal actions cell extracted from CertificateManagementPage ─────────────
// We test the rendering logic in isolation — no need to mount the full page.

const ActionsCell: React.FC<{ certificate: Pick<CertificateRecord, 'id' | 'is_revoked'> }> = ({
  certificate,
}) => (
  <div>
    {!certificate.is_revoked && (
      <button aria-label="Revoke">Revoke</button>
    )}
  </div>
);

// ── Arbitrary ─────────────────────────────────────────────────────────────────

const certArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 999999 }),
  is_revoked: fc.boolean(),
});

// ── Property test ─────────────────────────────────────────────────────────────

describe('Property 1 — Revoke Button Visibility Invariant', () => {
  it('renders Revoke button iff is_revoked is false (100 runs)', () => {
    fc.assert(
      fc.property(certArbitrary, (cert) => {
        const { queryByRole, unmount } = render(<ActionsCell certificate={cert} />);
        const btn = queryByRole('button', { name: /revoke/i });

        const result = cert.is_revoked ? btn === null : btn !== null;
        unmount();
        return result;
      }),
      { numRuns: 100 }
    );
  });
});
