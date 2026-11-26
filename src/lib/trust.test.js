import { describe, it, expect } from 'vitest';
import {
  verificationLevel, bestAttempts, summarise, attemptsLeftToday, suggestBridging, profileCompleteness,
} from './trust.js';

const claim = (over = {}) => ({ id: 'c1', title: 'BSc Computer Science', field: 'Software Development', status: 'unverified', ...over });
const attempt = (over = {}) => ({ assessment_id: 'swdev', percent: 50, passed: false, created_at: '2026-11-25T08:00:00Z', ...over });

describe('verificationLevel', () => {
  it('is level 0 when nothing is verified', () => {
    expect(verificationLevel({}).level).toBe(0);
    expect(verificationLevel({ unprovenClaims: 3 }).label).toBe('Not yet verified');
  });
  it('is level 1 after passing an assessment', () => {
    expect(verificationLevel({ passedAssessments: 1, unprovenClaims: 2 }).level).toBe(1);
  });
  it('is level 2 once a credential is verified', () => {
    expect(verificationLevel({ verifiedCredentials: 1, unprovenClaims: 1 }).level).toBe(2);
    expect(verificationLevel({ verifiedCredentials: 1, passedAssessments: 1, unprovenClaims: 1 }).level).toBe(2);
  });
  it('is level 3 only when a credential is verified, an assessment passed and nothing is left unproven', () => {
    expect(verificationLevel({ verifiedCredentials: 2, passedAssessments: 1, unprovenClaims: 0 }).level).toBe(3);
    expect(verificationLevel({ verifiedCredentials: 0, passedAssessments: 1, unprovenClaims: 0 }).level).toBe(1);
  });
});

describe('bestAttempts', () => {
  it('keeps the best score, counts attempts and remembers a pass', () => {
    const map = bestAttempts([
      attempt({ percent: 33 }),
      attempt({ percent: 83, passed: true, created_at: '2026-11-25T09:00:00Z' }),
      attempt({ percent: 50, created_at: '2026-11-25T10:00:00Z' }),
      attempt({ assessment_id: 'acct', percent: 17 }),
    ]);
    expect(map.get('swdev')).toEqual({ assessment_id: 'swdev', best_percent: 83, attempts: 3, passed: true, last_attempt: '2026-11-25T10:00:00Z' });
    expect(map.get('acct').passed).toBe(false);
    expect(map.size).toBe(2);
  });
  it('copes with no attempts', () => {
    expect(bestAttempts(undefined).size).toBe(0);
  });
});

describe('summarise', () => {
  it('counts claims by status and assessments passed', () => {
    const s = summarise(
      [claim({ id: 'a', status: 'verified' }), claim({ id: 'b', status: 'pending' }), claim({ id: 'c', status: 'rejected' }), claim({ id: 'd' })],
      [attempt({ passed: true, percent: 100 })],
    );
    expect(s).toMatchObject({ totalClaims: 4, verifiedCredentials: 1, pending: 1, needsChanges: 1, unprovenClaims: 3, passedAssessments: 1 });
    expect(s.level.level).toBe(2);
  });
  it('is level 3 when every claim is verified and an assessment is passed', () => {
    const s = summarise([claim({ status: 'verified' })], [attempt({ passed: true })]);
    expect(s.level.level).toBe(3);
  });
});

describe('attemptsLeftToday', () => {
  const now = new Date('2026-11-25T12:00:00Z');
  it('counts only attempts in the last 24 hours for that assessment', () => {
    const list = [
      attempt({ created_at: '2026-11-25T11:00:00Z' }),
      attempt({ created_at: '2026-11-25T09:00:00Z' }),
      attempt({ created_at: '2026-11-24T11:59:00Z' }),
      attempt({ assessment_id: 'other', created_at: '2026-11-25T11:00:00Z' }),
    ];
    expect(attemptsLeftToday(list, 'swdev', 5, now)).toBe(3);
    expect(attemptsLeftToday(list, 'unused', 5, now)).toBe(5);
  });
  it('never goes below zero', () => {
    const many = Array.from({ length: 7 }, () => attempt({ created_at: '2026-11-25T11:00:00Z' }));
    expect(attemptsLeftToday(many, 'swdev', 5, now)).toBe(0);
  });
});

describe('suggestBridging', () => {
  const steps = [
    { id: 's1', field: 'Software Development', title: 'Azure Fundamentals', waiver_available: true },
    { id: 's2', field: 'Software Development', title: 'freeCodeCamp', waiver_available: false },
    { id: 's3', field: 'Accounting & Finance', title: 'ACCA', waiver_available: true },
    { id: 's4', field: 'Other', title: 'Credential evaluation', waiver_available: true },
  ];
  it('suggests steps for unproven claims in the same field, and says why', () => {
    const result = suggestBridging([claim({ title: 'BSc' }), claim({ id: 'c2', title: 'Diploma', status: 'rejected' })], steps);
    expect(result.map((r) => r.step.id)).toEqual(['s1', 's2']);
    expect(result[0].reasons).toEqual(['BSc', 'Diploma']);
  });
  it('does not suggest anything for verified or in-review claims', () => {
    expect(suggestBridging([claim({ status: 'verified' }), claim({ id: 'c2', status: 'pending' })], steps)).toEqual([]);
  });
  it('gives claims with no field the general steps', () => {
    const result = suggestBridging([claim({ field: '' })], steps);
    expect(result.map((r) => r.step.id)).toEqual(['s4']);
  });
  it('falls back to the profile field when there are no claims yet', () => {
    expect(suggestBridging([], steps, 'Accounting & Finance').map((r) => r.step.id)).toEqual(['s3']);
    expect(suggestBridging([], steps, '')).toEqual([]);
  });
  it('lists steps with a fee waiver before those without, when reasons tie', () => {
    const result = suggestBridging([claim()], [steps[1], steps[0]]);
    expect(result.map((r) => r.step.id)).toEqual(['s1', 's2']);
  });
});

describe('profileCompleteness', () => {
  const profile = { full_name: 'Amani Otieno', headline: 'Backend developer', field: 'Software Development', is_public: false };
  it('starts at zero for an empty account', () => {
    const r = profileCompleteness({ profile: { full_name: '', headline: '', field: '' }, credentials: [], evidenceByCredential: {}, attempts: [] });
    expect(r.doneCount).toBe(0);
    expect(r.percent).toBe(0);
    expect(r.items).toHaveLength(6);
  });
  it('ticks items off as the person progresses', () => {
    const r = profileCompleteness({
      profile: { ...profile, is_public: true },
      credentials: [claim({ id: 'a', status: 'pending' })],
      evidenceByCredential: { a: [{ id: 'e1' }] },
      attempts: [attempt({ passed: true, percent: 100 })],
    });
    expect(r.percent).toBe(100);
    expect(r.items.every((i) => i.done)).toBe(true);
  });
  it('asks for evidence only on claims that are not verified yet', () => {
    const noEvidence = profileCompleteness({ profile, credentials: [claim({ id: 'a' })], evidenceByCredential: {}, attempts: [] });
    expect(noEvidence.items.find((i) => i.key === 'evidence').done).toBe(false);
    const verified = profileCompleteness({ profile, credentials: [claim({ id: 'a', status: 'verified' })], evidenceByCredential: {}, attempts: [] });
    expect(verified.items.find((i) => i.key === 'evidence').done).toBe(true);
  });
});
