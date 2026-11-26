import { FIELDS, CREDENTIAL_KINDS, EVIDENCE_MAX_BYTES, EVIDENCE_TYPES, MAX_EVIDENCE_PER_CLAIM } from './constants.js';
import { formatBytes } from './format.js';

export function isEmail(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value || '').trim());
}

// Same rule as the slugify() function in the database.
export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isValidSlug(slug) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 50;
}

export function validateRegistration({ fullName, email, password }) {
  const errors = {};
  if (String(fullName || '').trim().length < 2) errors.fullName = 'Please enter your full name.';
  if (!isEmail(email)) errors.email = 'Please enter a valid email address.';
  if (String(password || '').length < 8) errors.password = 'Use at least 8 characters.';
  return errors;
}

export function validateLogin({ email, password }) {
  const errors = {};
  if (!isEmail(email)) errors.email = 'Please enter a valid email address.';
  if (!password) errors.password = 'Please enter your password.';
  return errors;
}

export function validateProfile(profile) {
  const errors = {};
  const name = String(profile.full_name || '').trim();
  if (name.length < 2) errors.full_name = 'Please enter your full name.';
  else if (name.length > 120) errors.full_name = 'Keep your name under 120 characters.';
  if (String(profile.headline || '').length > 160) errors.headline = 'Keep the headline under 160 characters.';
  if (String(profile.bio || '').length > 1500) errors.bio = 'Keep the summary under 1500 characters.';
  if (profile.field && !FIELDS.includes(profile.field)) errors.field = 'Choose a field from the list.';
  if (String(profile.origin_country || '').length > 80) errors.origin_country = 'That is too long.';
  if (String(profile.current_country || '').length > 80) errors.current_country = 'That is too long.';
  const slug = String(profile.slug || '').trim();
  if (slug && !isValidSlug(slug)) errors.slug = 'Use 3 to 50 lowercase letters, numbers and single dashes, for example amani-otieno.';
  return errors;
}

export function validateCredential(c, now = new Date()) {
  const errors = {};
  const title = String(c.title || '').trim();
  if (title.length < 2) errors.title = 'Give the claim a title, for example "BSc Computer Science".';
  else if (title.length > 160) errors.title = 'Keep the title under 160 characters.';
  if (!CREDENTIAL_KINDS.some((k) => k.value === c.kind)) errors.kind = 'Choose what kind of claim this is.';
  if (String(c.institution || '').length > 160) errors.institution = 'Keep this under 160 characters.';
  if (String(c.country || '').length > 80) errors.country = 'Keep this under 80 characters.';
  if (c.field && !FIELDS.includes(c.field)) errors.field = 'Choose a field from the list.';
  if (String(c.description || '').length > 2000) errors.description = 'Keep the description under 2000 characters.';
  if (c.year !== '' && c.year !== null && c.year !== undefined) {
    const y = Number(c.year);
    if (!Number.isInteger(y) || y < 1950 || y > now.getFullYear()) {
      errors.year = `Enter a year between 1950 and ${now.getFullYear()}.`;
    }
  }
  return errors;
}

// Returns an error message, or null when the file can be uploaded.
export function validateEvidenceFile(file, existingCount = 0) {
  if (!file) return 'Choose a file first.';
  if (existingCount >= MAX_EVIDENCE_PER_CLAIM) return `You can attach up to ${MAX_EVIDENCE_PER_CLAIM} files to one claim.`;
  if (!EVIDENCE_TYPES.includes(file.type)) return 'Use a PDF, PNG, JPEG or WebP file.';
  if (file.size > EVIDENCE_MAX_BYTES) return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(EVIDENCE_MAX_BYTES)}.`;
  if (file.size === 0) return 'That file is empty.';
  return null;
}

export function safeFileName(name) {
  const cleaned = String(name || 'file')
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '-')
    .slice(-80);
  return cleaned || 'file';
}

export function validateIntroduction({ name, email, message }) {
  const errors = {};
  if (String(name || '').trim().length < 2) errors.name = 'Please enter your name.';
  if (!isEmail(email)) errors.email = 'Please enter a valid email address.';
  const m = String(message || '').trim();
  if (m.length < 10) errors.message = 'Please write at least a sentence (10 characters).';
  else if (m.length > 1500) errors.message = 'Keep the message under 1500 characters.';
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
