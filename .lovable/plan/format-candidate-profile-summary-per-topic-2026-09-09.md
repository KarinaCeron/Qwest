# Format Candidate Profile Summary per Topic

## Goal
Restructure the auto-generated Candidate Profile summary so each topic (target roles, core skills, compensation, benefits) appears on its own line and is easier to scan.

## Changes
1. **Rewrite `buildSummary()` in `src/components/CandidateProfile.tsx`**
   - Build each topic as a separate sentence.
   - Join the sentences with newline characters (`\n`) instead of spaces.
   - Proposed wording per topic:
     - Target roles: "Candidate is chasing [role] and [role] roles." or a fallback when none are set.
     - Core skills: "Core skills are: [skill], [skill]."
     - Compensation: "Compensation target: [details]."
     - Benefits: "Benefits are: [benefit], [benefit]."
   - Keep empty-section fallbacks concise and on their own lines when data is missing, or omit empty topics entirely if that keeps the summary cleaner.

2. **Preserve and display newlines correctly**
   - Ensure the summary `<Textarea>` renders the generated newlines (the browser textarea already does this).
   - No changes to the editable behavior, autosave, or refresh logic.

3. **Validation**
   - Verify the component still compiles and the summary updates immediately after changes to target roles, core skills, compensation, or benefits.

## Outcome
The Candidate Profile summary will be formatted as one topic per line, making it easy to read and share.
