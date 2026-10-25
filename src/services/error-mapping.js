// Friendly error mapping (Family E in qa/analysis/bug-pattern-analysis.md):
// converts transport and PostgREST errors into plan-§32-compliant user copy.
// Ships as a pure function so App.jsx call sites can adopt it one line at a
// time (setListError(friendlyError(error)) instead of error.message).
// Contract pinned by test/error-mapping.test.js.

const POSTGRES_HINTS = [
  [/42703|column .* does not exist/i, "This feature isn't available on the server yet. Try again after the next update."],
  [/23505|duplicate key/i, "That name is already taken. Pick another one."],
  [/23514|check constraint|violates/i, "One of the fields has a value the server won't accept."],
  [/23503|foreign key/i, "That item is linked to something that no longer exists. Refresh and try again."],
  [/42501|permission denied|row-level security/i, "You don't have access to do that."],
];

export function friendlyError(error) {
  let message;
  if (error instanceof Error) message = error.message;
  else if (error && typeof error === "object" && "message" in error) message = String(error.message);
  else message = String(error ?? "");

  if (/Failed to fetch|NetworkError|fetch failed|ECONNREFUSED|ENETUNREACH/i.test(message)) {
    return "You're offline. Check your connection and try again.";
  }
  if (/aborted|AbortError|timeout|ETIMEDOUT/i.test(message)) {
    return "That took too long. Check your connection and try again.";
  }
  for (const [pattern, text] of POSTGRES_HINTS) {
    if (pattern.test(message)) return text;
  }
  if (/invalid login credentials/i.test(message)) {
    return "Wrong email or password. Try again.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Check your inbox for a confirmation link before signing in.";
  }
  if (/JWT|token/i.test(message)) {
    return "Your session expired. Sign in again.";
  }
  // Unknown errors: say something honest without leaking internals.
  return "Something went wrong. Try again, and check your connection.";
}
