// Pure functions that turn raw rows into what the screens show. They are unit tested in trust.test.js.
import { FIELDS } from './constants.js';

export const LEVELS = [
  { level: 0, label: 'Not yet verified', description: 'Nothing has been checked yet. Claims below are the person\'s own account.' },
  { level: 1, label: 'Skills tested', description: 'Has passed at least one skills assessment. Qualifications are not yet verified.' },
  { level: 2, label: 'Credentials verified', description: 'At least one credential was checked by a reviewer.' },
  { level: 3, label: 'Fully verified', description: 'Credentials checked by a reviewer, a skills assessment passed, and no unproven claims remain.' },
];

export function verificationLevel({ verifiedCredentials = 0, passedAssessments = 0, unprovenClaims = 0 }) {
  if (verifiedCredentials > 0 && passedAssessments > 0 && unprovenClaims === 0) return LEVELS[3];
  if (verifiedCredentials > 0) return LEVELS[2];
  if (passedAssessments > 0) return LEVELS[1];
  return LEVELS[0];
}

// Collapses many attempts into one row per assessment: best score, number of attempts, whether it was ever passed.
export function bestAttempts(attempts) {
  const map = new Map();
  for (const a of attempts || []) {
    const current = map.get(a.assessment_id) || { assessment_id: a.assessment_id, best_percent: 0, attempts: 0, passed: false, last_attempt: null };
    current.best_percent = Math.max(current.best_percent, a.percent);
    current.attempts += 1;
    current.passed = current.passed || Boolean(a.passed);
    if (!current.last_attempt || new Date(a.created_at) > new Date(current.last_attempt)) current.last_attempt = a.created_at;
    map.set(a.assessment_id, current);
  }
  return map;
}

export function summarise(credentials, attempts) {
  const list = credentials || [];
  const best = bestAttempts(attempts);
  const verifiedCredentials = list.filter((c) => c.status === 'verified').length;
  const pending = list.filter((c) => c.status === 'pending').length;
  const needsChanges = list.filter((c) => c.status === 'rejected').length;
  const passedAssessments = [...best.values()].filter((b) => b.passed).length;
  const unprovenClaims = list.length - verifiedCredentials;
  return {
    totalClaims: list.length,
    verifiedCredentials,
    pending,
    needsChanges,
    unprovenClaims,
    passedAssessments,
    level: verificationLevel({ verifiedCredentials, passedAssessments, unprovenClaims }),
  };
}

// How many attempts are left today, given the attempt timestamps (the server enforces the same rule).
export function attemptsLeftToday(attempts, assessmentId, max = 5, now = new Date()) {
  const since = now.getTime() - 24 * 60 * 60 * 1000;
  const used = (attempts || []).filter((a) => a.assessment_id === assessmentId && new Date(a.created_at).getTime() > since).length;
  return Math.max(0, max - used);
}

// Suggests bridging steps for claims that are not verified yet. A claim with no field (or "Other") gets the general steps.
export function suggestBridging(credentials, steps, profileField = '') {
  const open = (credentials || []).filter((c) => c.status === 'unverified' || c.status === 'rejected');
  const bySteps = new Map();
  const add = (step, reason) => {
    const entry = bySteps.get(step.id) || { step, reasons: [] };
    if (reason && !entry.reasons.includes(reason)) entry.reasons.push(reason);
    bySteps.set(step.id, entry);
  };
  for (const c of open) {
    const field = FIELDS.includes(c.field) && c.field ? c.field : 'Other';
    for (const s of steps || []) if (s.field === field) add(s, c.title);
  }
  if (open.length === 0 && (credentials || []).length === 0 && profileField) {
    for (const s of steps || []) if (s.field === profileField) add(s, '');
  }
  return [...bySteps.values()].sort(
    (a, b) => b.reasons.length - a.reasons.length || Number(b.step.waiver_available) - Number(a.step.waiver_available) || a.step.title.localeCompare(b.step.title),
  );
}

// The "what to do next" checklist on the dashboard.
export function profileCompleteness({ profile, credentials, evidenceByCredential, attempts }) {
  const claims = credentials || [];
  const evidence = evidenceByCredential || {};
  const best = bestAttempts(attempts);
  const aboutDone = Boolean(profile && String(profile.full_name || '').trim() && String(profile.headline || '').trim() && profile.field);
  const items = [
    { key: 'about', label: 'Complete your profile', hint: 'Add a headline and choose your field.', to: '/profile', done: aboutDone },
    { key: 'claims', label: 'Add your qualifications and experience', hint: 'List degrees, certificates, licences and jobs, even if you have no papers.', to: '/credentials', done: claims.length > 0 },
    {
      key: 'evidence',
      label: 'Attach evidence to your claims',
      hint: 'Scans, photos, references. Any evidence helps; none is fine if your records are lost.',
      to: '/credentials',
      done: claims.length > 0 && claims.every((c) => c.status === 'verified' || (evidence[c.id] || []).length > 0),
    },
    {
      key: 'review',
      label: 'Send a claim for review',
      hint: 'A reviewer checks it and records how it was verified.',
      to: '/credentials',
      done: claims.some((c) => c.status === 'pending' || c.status === 'verified'),
    },
    { key: 'assessment', label: 'Pass a skills assessment', hint: 'A short test that shows your knowledge when paper records are missing.', to: '/assessments', done: [...best.values()].some((b) => b.passed) },
    { key: 'public', label: 'Publish your profile', hint: 'Let employers find you in the talent directory.', to: '/profile', done: Boolean(profile && profile.is_public) },
  ];
  const doneCount = items.filter((i) => i.done).length;
  return { items, doneCount, percent: Math.round((100 * doneCount) / items.length) };
}
