// Interaction log entries - manual notes staff add for calls, emails, and
// other client contact, tied to exactly one of a company or a client (same
// XOR scoping as tasks). Calls placed through the GHL/AI phone number
// already show up automatically in the Communication tab as call-type
// conversation events; these notes are for everything that doesn't - calls
// from a personal or office line, walk-ins, anything staff need to log by
// hand.
export const OUTCOME_OPTIONS = [
  "Called - Spoke With Client",
  "Called - No Answer",
  "Called - Left Voicemail",
  "Emailed",
  "In Person",
  "Other",
] as const;

export type NoteRecord = {
  id: string;
  company_id: string | null;
  profile_id: string | null;
  outcome: string | null;
  body: string;
  created_by_name: string | null;
  created_at: string;
};
