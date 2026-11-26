// Turns Supabase / network errors into sentences a person can act on.
export function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  const message = String(error.message || error.error_description || (typeof error === 'string' ? error : ''));
  const code = String(error.code || '');
  const lower = message.toLowerCase();

  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed')) {
    return 'Cannot reach the server. Check your internet connection and try again.';
  }
  if (lower.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (lower.includes('email not confirmed')) return 'Please confirm your email first: open the message we sent you and click the link.';
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'An account with that email already exists. Try logging in instead.';
  }
  if (lower.includes('password should be at least')) return 'Use at least 8 characters for your password.';
  if (lower.includes('rate limit') || code === '429') return 'Too many attempts. Please wait a minute and try again.';
  if (lower.includes('profiles_slug_key') || (code === '23505' && lower.includes('slug'))) return 'That link name is already taken. Try another.';
  if (code === '23505' || lower.includes('duplicate key')) return 'That already exists.';
  if (code === '42501' || lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'You do not have permission to do that.';
  }
  if (lower.includes('json object requested') || code === 'PGRST116') return 'That item no longer exists, or it is not yours.';
  if (lower.includes('jwt expired') || lower.includes('invalid jwt')) return 'Your session has expired. Please log in again.';
  if (code === '23514' || lower.includes('violates check constraint')) return 'Some of the information is not valid. Please check the form and try again.';
  // Messages raised on purpose by our own database functions are already written for people.
  if (code === 'P0001' && message) return message;
  return message || fallback;
}

export class AppError extends Error {
  constructor(error, fallback) {
    super(friendlyError(error, fallback));
    this.name = 'AppError';
    this.original = error;
  }
}
