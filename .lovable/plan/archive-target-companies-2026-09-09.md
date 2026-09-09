# Archive target companies

## Goal
In **My Target Companies**, add an **Archive** action per company. Archived companies disappear from the main list and appear in a separate **Archived** tab, from where they can be restored or deleted.

## Changes

### Database
- Add an `archived` boolean column (default `false`) to `target_companies`. Existing rows stay active. Ownership policies already cover the table, so no new access rules are needed.

### Target Companies page (`src/pages/TargetCompanies.tsx`)
- Add two tabs at the top of the card: **Active** and **Archived** (the page is in English).
  - **Active** shows companies that are not archived (current behavior).
  - **Archived** shows archived companies.
- Row actions menu:
  - Active tab: **View insights**, **Prepare outreach**, **Update evaluation**, **Archive**, **Delete**.
  - Archived tab: **View insights**, **Restore**, **Delete** (no outreach or re-evaluation while archived).
- **Archive** sets the flag and shows a confirmation toast; **Restore** moves it back to Active.
- **Export to Excel** keeps exporting only the Active list.
- Empty states per tab ("No archived companies yet.", etc.).

## Notes
- Archiving is reversible and keeps all scores, insights, and outreach contacts untouched.
- Deleting from the Archived tab permanently removes the company and its contacts (existing cascade behavior).
