// Every call to the backend lives here, so pages never talk to Supabase directly.
import { supabase } from './supabase.js';
import { AppError } from './errors.js';
import { safeFileName, validateEvidenceFile } from './validation.js';

function client() {
  if (!supabase) throw new Error('The app is not connected to Supabase yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and restart.');
  return supabase;
}

// Throws a friendly error when a Supabase call failed; otherwise returns its data.
function unwrap(result, fallback) {
  if (result.error) throw new AppError(result.error, fallback);
  return result.data;
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ---- Accounts ----------------------------------------------------------------------------------------------
export const auth = {
  async getSession() {
    const { data, error } = await client().auth.getSession();
    if (error) throw new AppError(error);
    return data.session;
  },
  onChange(callback) {
    const { data } = client().auth.onAuthStateChange((_event, session) => callback(session));
    return () => data.subscription.unsubscribe();
  },
  async signUp({ email, password, fullName }) {
    const { data, error } = await client().auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) throw new AppError(error);
    // With email confirmation switched on there is no session yet.
    return { session: data.session, needsConfirmation: !data.session };
  },
  async signIn({ email, password }) {
    const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new AppError(error);
  },
  async signOut() {
    const { error } = await client().auth.signOut();
    if (error) throw new AppError(error);
  },
};

// ---- Profile ---------------------------------------------------------------------------------------------------
const PROFILE_FIELDS = ['full_name', 'headline', 'field', 'origin_country', 'current_country', 'bio', 'slug', 'is_public'];

export async function getMyProfile(userId) {
  const found = unwrap(await client().from('profiles').select('*').eq('id', userId).maybeSingle());
  if (found) return found;
  // Accounts created before the sign-up trigger existed have no profile row yet.
  return unwrap(await client().from('profiles').insert({ id: userId, full_name: '' }).select().single());
}

export async function updateMyProfile(userId, patch) {
  const clean = {};
  for (const key of PROFILE_FIELDS) {
    if (patch[key] === undefined) continue;
    clean[key] = typeof patch[key] === 'string' ? patch[key].trim() : patch[key];
  }
  if (clean.slug === '') clean.slug = null; // an empty link name lets the database generate one
  return unwrap(await client().from('profiles').update(clean).eq('id', userId).select().single());
}

// ---- Claims and evidence -----------------------------------------------------------------------------------------
function claimPayload(data) {
  return {
    kind: data.kind,
    title: data.title.trim(),
    institution: (data.institution || '').trim(),
    country: (data.country || '').trim(),
    year: data.year === '' || data.year === null || data.year === undefined ? null : Number(data.year),
    field: data.field || '',
    description: (data.description || '').trim(),
  };
}

export async function listMyCredentials(userId) {
  const credentials = unwrap(await client().from('credentials').select('*').eq('user_id', userId).order('created_at', { ascending: false }));
  const files = unwrap(await client().from('evidence').select('*').eq('user_id', userId).order('created_at', { ascending: true }));
  const evidenceByCredential = {};
  for (const f of files) (evidenceByCredential[f.credential_id] ||= []).push(f);
  return { credentials, evidenceByCredential };
}

export async function createCredential(userId, data) {
  return unwrap(await client().from('credentials').insert({ user_id: userId, ...claimPayload(data) }).select().single());
}

export async function updateCredential(id, data) {
  return unwrap(await client().from('credentials').update(claimPayload(data)).eq('id', id).select().single());
}

export async function submitCredential(id) {
  return unwrap(await client().from('credentials').update({ status: 'pending' }).eq('id', id).select().single());
}

export async function withdrawCredential(id) {
  return unwrap(await client().from('credentials').update({ status: 'unverified' }).eq('id', id).select().single());
}

export async function deleteCredential(id, evidence = []) {
  const paths = evidence.map((e) => e.file_path);
  unwrap(await client().from('credentials').delete().eq('id', id));
  if (paths.length > 0) await client().storage.from('evidence').remove(paths); // best effort: the rows are already gone
}

export async function uploadEvidence({ userId, credentialId, file, existingCount = 0 }) {
  const problem = validateEvidenceFile(file, existingCount);
  if (problem) throw new Error(problem);
  const path = `${userId}/${credentialId}/${newId()}-${safeFileName(file.name)}`;
  const uploaded = await client().storage.from('evidence').upload(path, file, { contentType: file.type, upsert: false });
  if (uploaded.error) throw new AppError(uploaded.error, 'The file could not be uploaded.');
  const inserted = await client()
    .from('evidence')
    .insert({ credential_id: credentialId, user_id: userId, file_path: path, file_name: file.name.slice(0, 200), file_size: file.size, mime_type: file.type })
    .select()
    .single();
  if (inserted.error) {
    await client().storage.from('evidence').remove([path]);
    throw new AppError(inserted.error, 'The file could not be saved.');
  }
  return inserted.data;
}

export async function deleteEvidence(item) {
  unwrap(await client().from('evidence').delete().eq('id', item.id));
  await client().storage.from('evidence').remove([item.file_path]);
}

// A link that works for five minutes. The bucket is private, so files are only reachable through links like this.
export async function getEvidenceUrl(path) {
  const { data, error } = await client().storage.from('evidence').createSignedUrl(path, 300);
  if (error) throw new AppError(error, 'Could not open that file.');
  return data.signedUrl;
}

// ---- Skills assessments -------------------------------------------------------------------------------------------------
export async function listAssessments() {
  return unwrap(await client().from('assessments').select('*').order('title', { ascending: true }));
}

export async function getAssessmentForTaking(id) {
  return unwrap(await client().rpc('get_assessment', { p_assessment_id: id }));
}

export async function submitAssessment(id, answers) {
  return unwrap(await client().rpc('submit_assessment', { p_assessment_id: id, p_answers: answers }));
}

export async function listMyAttempts(userId) {
  return unwrap(await client().from('assessment_attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false }));
}

// ---- Bridging steps and fee waivers ---------------------------------------------------------------------------------------
export async function listBridgingSteps() {
  return unwrap(await client().from('bridging_steps').select('*').order('title', { ascending: true }));
}

export async function listMyWaivers(userId) {
  return unwrap(await client().from('waiver_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }));
}

export async function requestWaiver({ userId, stepId, credentialId = null, message = '' }) {
  return unwrap(
    await client()
      .from('waiver_requests')
      .insert({ user_id: userId, bridging_step_id: stepId, credential_id: credentialId || null, message: message.trim() })
      .select()
      .single(),
  );
}

export async function cancelWaiver(id) {
  unwrap(await client().from('waiver_requests').delete().eq('id', id));
}

// ---- Public pages (no account needed) -------------------------------------------------------------------------------------------
export async function getPublicProfile(slug) {
  return unwrap(await client().rpc('get_public_profile', { p_slug: slug }));
}

export async function listPublicProfiles({ field = '', verifiedOnly = false } = {}) {
  return unwrap(await client().rpc('list_public_profiles', { p_field: field, p_verified_only: verifiedOnly }));
}

export async function getPlatformStats() {
  return unwrap(await client().rpc('platform_stats'));
}

export async function requestIntroduction({ slug, name, org = '', email, message }) {
  unwrap(
    await client().rpc('request_introduction', {
      p_slug: slug, p_name: name, p_org: org, p_email: email, p_message: message,
    }),
  );
}

export async function listMyIntroductions(userId) {
  return unwrap(await client().from('introductions').select('*').eq('profile_id', userId).order('created_at', { ascending: false }));
}

export async function markIntroductionRead(id) {
  unwrap(await client().from('introductions').update({ is_read: true }).eq('id', id));
}

// ---- Reviewers ---------------------------------------------------------------------------------------------------------------------
export async function getReviewerQueue() {
  return unwrap(await client().rpc('reviewer_queue'));
}

export async function reviewCredential({ id, decision, method = null, note = '' }) {
  unwrap(await client().rpc('review_credential', { p_credential_id: id, p_decision: decision, p_method: method, p_note: note }));
}

export async function decideWaiver({ id, decision, note = '' }) {
  unwrap(await client().rpc('decide_waiver', { p_id: id, p_decision: decision, p_note: note }));
}
