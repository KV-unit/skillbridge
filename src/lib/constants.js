// Shared lists and labels. The field list must match the skill_field domain in supabase/schema.sql.
export const FIELDS = ['Software Development', 'Accounting & Finance', 'Nursing & Healthcare', 'Teaching & Education', 'Other'];

export const CREDENTIAL_KINDS = [
  { value: 'degree', label: 'Degree' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'license', label: 'Professional licence' },
  { value: 'work_experience', label: 'Work experience' },
];

export const VERIFICATION_METHODS = {
  document_review: 'Documents reviewed',
  issuer_confirmation: 'Confirmed with the issuer',
  reference_check: 'Reference checked',
  interview: 'Skills interview',
};

// tone is used for the badge colour: neutral, info, success or warning
export const CREDENTIAL_STATUS = {
  unverified: { label: 'Not yet verified', tone: 'neutral' },
  pending: { label: 'In review', tone: 'info' },
  verified: { label: 'Verified', tone: 'success' },
  rejected: { label: 'Needs changes', tone: 'warning' },
};

export const WAIVER_STATUS = {
  requested: { label: 'Requested', tone: 'info' },
  approved: { label: 'Approved', tone: 'success' },
  declined: { label: 'Declined', tone: 'warning' },
};

export const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export const EVIDENCE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
export const MAX_EVIDENCE_PER_CLAIM = 5;
export const MAX_ATTEMPTS_PER_DAY = 5;
