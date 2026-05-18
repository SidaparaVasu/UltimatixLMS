// Issued certificate record (learner view)
export interface CertificateRecord {
  id: number;
  /** UUID, used in QR/verification URL */
  certificate_id: string;
  course_or_assessment_name: string;
  certificate_type: 'course' | 'assessment';
  /** ISO 8601 date */
  completion_date: string;
  /** ISO 8601 date or null = lifetime validity */
  expiry_date: string | null;
  /** ISO 8601 datetime */
  issued_at: string;
  status: 'active' | 'expired';
  is_revoked: boolean;
  /** Relative path: /verify/certificate/{uuid} */
  verification_url: string;
}

// Admin view — extends learner record with admin-only fields
export interface CertificateAdminRecord extends CertificateRecord {
  learner_name: string;
  learner_id: number;
  employee_code: string;
  revoked_at: string | null;
  revocation_reason: string;
}

// Payload for revoking a certificate
export interface RevokeCertificatePayload {
  /** 1–500 characters */
  reason: string;
}

// Response from the public verification endpoint
export interface CertificateVerificationResult {
  is_valid: boolean;
  certificate_id: string;
  learner_name: string;
  course_or_assessment_name: string;
  completion_date: string;
  expiry_date: string | null;
  status: 'active' | 'expired' | 'revoked';
  issued_by: string;
}
