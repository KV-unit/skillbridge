import { describe, it, expect } from 'vitest';
import {
  isEmail, slugify, isValidSlug, validateRegistration, validateLogin, validateProfile, validateCredential,
  validateEvidenceFile, safeFileName, validateIntroduction, hasErrors,
} from './validation.js';

const NOW = new Date('2026-11-25T10:00:00Z');

describe('isEmail', () => {
  it('accepts normal addresses and rejects broken ones', () => {
    expect(isEmail('amani@example.com')).toBe(true);
    expect(isEmail('  amani@example.com ')).toBe(true);
    expect(isEmail('amani@example')).toBe(false);
    expect(isEmail('amani example.com')).toBe(false);
    expect(isEmail('')).toBe(false);
    expect(isEmail(undefined)).toBe(false);
  });
});

describe('slugify and isValidSlug', () => {
  it('turns a name into a link-safe slug', () => {
    expect(slugify('Amani Otieno')).toBe('amani-otieno');
    expect(slugify('  Zoë  O\'Brien!! ')).toBe('zo-o-brien');
    expect(slugify('---')).toBe('');
    expect(slugify(null)).toBe('');
  });
  it('validates slugs the same way the database does', () => {
    expect(isValidSlug('amani-otieno')).toBe(true);
    expect(isValidSlug('ab')).toBe(false);
    expect(isValidSlug('Amani')).toBe(false);
    expect(isValidSlug('amani--otieno')).toBe(false);
    expect(isValidSlug('-amani')).toBe(false);
    expect(isValidSlug('a'.repeat(51))).toBe(false);
  });
});

describe('validateRegistration and validateLogin', () => {
  it('requires a name, a valid email and an 8 character password', () => {
    expect(validateRegistration({ fullName: 'A', email: 'x', password: '123' })).toEqual({
      fullName: 'Please enter your full name.',
      email: 'Please enter a valid email address.',
      password: 'Use at least 8 characters.',
    });
    expect(hasErrors(validateRegistration({ fullName: 'Amani Otieno', email: 'a@b.co', password: 'Password123!' }))).toBe(false);
  });
  it('requires an email and a password to log in', () => {
    expect(Object.keys(validateLogin({ email: '', password: '' }))).toEqual(['email', 'password']);
    expect(hasErrors(validateLogin({ email: 'a@b.co', password: 'x' }))).toBe(false);
  });
});

describe('validateProfile', () => {
  const ok = { full_name: 'Amani Otieno', headline: 'Backend developer', field: 'Software Development', bio: '', slug: '' };
  it('accepts a complete profile', () => {
    expect(hasErrors(validateProfile(ok))).toBe(false);
  });
  it('rejects a missing name, an unknown field and a bad slug', () => {
    const errors = validateProfile({ ...ok, full_name: ' ', field: 'Astrology', slug: 'Bad Slug' });
    expect(Object.keys(errors)).toEqual(['full_name', 'field', 'slug']);
  });
  it('rejects text that is too long', () => {
    expect(validateProfile({ ...ok, headline: 'x'.repeat(161) }).headline).toBeTruthy();
    expect(validateProfile({ ...ok, bio: 'x'.repeat(1501) }).bio).toBeTruthy();
  });
});

describe('validateCredential', () => {
  const ok = { kind: 'degree', title: 'BSc Computer Science', institution: 'University of Khartoum', country: 'Sudan', year: '2015', field: 'Software Development', description: '' };
  it('accepts a normal claim, with or without a year', () => {
    expect(hasErrors(validateCredential(ok, NOW))).toBe(false);
    expect(hasErrors(validateCredential({ ...ok, year: '' }, NOW))).toBe(false);
  });
  it('requires a title and a known kind', () => {
    const errors = validateCredential({ ...ok, title: 'x', kind: 'trophy' }, NOW);
    expect(Object.keys(errors)).toEqual(['title', 'kind']);
  });
  it('limits the year to a realistic range', () => {
    expect(validateCredential({ ...ok, year: '1949' }, NOW).year).toBeTruthy();
    expect(validateCredential({ ...ok, year: '2027' }, NOW).year).toBeTruthy();
    expect(validateCredential({ ...ok, year: '2026' }, NOW).year).toBeUndefined();
    expect(validateCredential({ ...ok, year: '20.5' }, NOW).year).toBeTruthy();
  });
});

describe('validateEvidenceFile', () => {
  const pdf = { name: 'degree.pdf', type: 'application/pdf', size: 1000 };
  it('accepts a small PDF or image', () => {
    expect(validateEvidenceFile(pdf, 0)).toBeNull();
    expect(validateEvidenceFile({ ...pdf, type: 'image/png' }, 4)).toBeNull();
  });
  it('rejects the wrong type, a big file, an empty file and a sixth file', () => {
    expect(validateEvidenceFile({ ...pdf, type: 'application/zip' }, 0)).toMatch(/PDF, PNG, JPEG or WebP/);
    expect(validateEvidenceFile({ ...pdf, size: 6 * 1024 * 1024 }, 0)).toMatch(/limit is 5\.0 MB/);
    expect(validateEvidenceFile({ ...pdf, size: 0 }, 0)).toMatch(/empty/);
    expect(validateEvidenceFile(pdf, 5)).toMatch(/up to 5 files/);
    expect(validateEvidenceFile(null, 0)).toMatch(/Choose a file/);
  });
});

describe('safeFileName', () => {
  it('removes characters that break storage paths', () => {
    expect(safeFileName('My Degree (scan) #1.pdf')).toBe('My-Degree-scan-1.pdf');
    expect(safeFileName('../../etc/passwd')).toBe('....etcpasswd');
    expect(safeFileName('')).toBe('file');
    expect(safeFileName('***')).toBe('file');
  });
});

describe('validateIntroduction', () => {
  it('needs a name, a valid email and a message of at least 10 characters', () => {
    expect(Object.keys(validateIntroduction({ name: '', email: 'bad', message: 'short' }))).toEqual(['name', 'email', 'message']);
    expect(hasErrors(validateIntroduction({ name: 'Hannah', email: 'h@acme.co', message: 'We have a role that fits.' }))).toBe(false);
  });
});
