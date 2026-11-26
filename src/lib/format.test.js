import { describe, it, expect } from 'vitest';
import { kindLabel, formatDate, formatBytes, plural, initials } from './format.js';

describe('format helpers', () => {
  it('labels credential kinds', () => {
    expect(kindLabel('degree')).toBe('Degree');
    expect(kindLabel('work_experience')).toBe('Work experience');
    expect(kindLabel('nonsense')).toBe('Credential');
  });
  it('formats dates in UTC and tolerates bad input', () => {
    expect(formatDate('2026-11-25T23:30:00Z')).toBe('25 Nov 2026');
    expect(formatDate('')).toBe('');
    expect(formatDate('not a date')).toBe('');
  });
  it('formats file sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(-1)).toBe('');
  });
  it('pluralises', () => {
    expect(plural(1, 'claim')).toBe('1 claim');
    expect(plural(2, 'claim')).toBe('2 claims');
    expect(plural(0, 'person', 'people')).toBe('0 people');
  });
  it('makes initials', () => {
    expect(initials('Amani Otieno')).toBe('AO');
    expect(initials('Amani')).toBe('A');
    expect(initials('  ')).toBe('?');
  });
});
