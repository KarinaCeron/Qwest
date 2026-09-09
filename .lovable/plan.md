# Send Candidate Profile to Target Company Webhook

When a target company is evaluated, the webhook payload will include your Qwest candidate profile summary under the field name `candidate_profile`.

## Changes

**Edge function: `supabase/functions/evaluate-target-company/index.ts`**
- Read the caller's identity from the `Authorization` header (the app already sends your login token when invoking the function).
- Fetch your `candidate_profile` from the `profiles` table for that user.
- Add it to the webhook payload as `candidate_profile` (empty string when the summary hasn't been generated yet).
- Keep the existing payload fields (`company`, `website`, `role`, `job_description`, `mode`, `scorecard`) unchanged, and include `candidate_profile` in the logged payload so it can be verified in the function logs.

## Notes
- No frontend changes needed — `TargetCompanies.tsx` invokes the function with the user's session token already.
- No database changes needed — `profiles.candidate_profile` already exists and is auto-generated in My Qwest.
- If you haven't opened the Candidate Profile tab yet (so no summary exists), the webhook receives an empty `candidate_profile` and still works.
