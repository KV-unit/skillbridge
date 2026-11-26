import { describe, it, expect } from 'vitest';
import { friendlyError, AppError } from './errors.js';

describe('friendlyError', () => {
  it('explains network problems', () => {
    expect(friendlyError(new TypeError('Failed to fetch'))).toMatch(/Cannot reach the server/);
  });
  it('explains sign-in problems', () => {
    expect(friendlyError({ message: 'Invalid login credentials' })).toBe('Email or password is incorrect.');
    expect(friendlyError({ message: 'Email not confirmed' })).toMatch(/confirm your email/);
    expect(friendlyError({ message: 'User already registered' })).toMatch(/already exists/);
  });
  it('explains a taken link name and other duplicates', () => {
    expect(friendlyError({ code: '23505', message: 'duplicate key value violates unique constraint "profiles_slug_key"' })).toMatch(/link name/);
    expect(friendlyError({ code: '23505', message: 'duplicate key value violates unique constraint "waiver_requests_user_id_bridging_step_id_key"' })).toBe('That already exists.');
  });
  it('explains permission problems', () => {
    expect(friendlyError({ code: '42501', message: 'new row violates row-level security policy for table "credentials"' })).toMatch(/permission/);
  });
  it('passes through messages raised on purpose by the database', () => {
    expect(friendlyError({ code: 'P0001', message: 'You have used all 5 attempts for this assessment in the last 24 hours. Please try again later.' })).toMatch(/used all 5 attempts/);
  });
  it('falls back to a generic sentence', () => {
    expect(friendlyError(null)).toMatch(/Something went wrong/);
    expect(friendlyError({})).toMatch(/Something went wrong/);
  });
  it('wraps errors in AppError with the friendly text', () => {
    const e = new AppError({ message: 'Invalid login credentials' });
    expect(e.message).toBe('Email or password is incorrect.');
    expect(e.name).toBe('AppError');
  });
});
