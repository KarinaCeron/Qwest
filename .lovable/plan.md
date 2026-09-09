# Auto-generate Qwest Candidate Profile

## Goal
Remove the "Generate from my Qwest" button and automatically build the candidate profile summary from the user's Qwest data when the tab loads.

## What will change
- In `CandidateProfile.tsx`:
  - Remove the **Generate from my Qwest** button and its icon from the summary section header.
  - Run the existing summary-generation logic automatically after target roles, core skills, and compensation data finish loading.
  - Only auto-fill the summary when it is currently empty, so any previously edited text is preserved.
  - Update the textarea placeholder to remove the mention of the button.
  - Keep the existing autosave behavior when the user edits the summary manually.

## Outcome
The Candidate Profile tab will open with a pre-filled summary built from the user's target roles, core skills, compensation targets and benefits. The user can still edit the text freely, and changes will save automatically in the background.
