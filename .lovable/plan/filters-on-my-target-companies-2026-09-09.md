# Filters on My Target Companies

## Goal
Add a search filter bar to the My Target Companies page so the user can quickly find companies by name or target role.

## Changes

**`src/pages/TargetCompanies.tsx`**
- Add a search input (with a search icon) above the table, next to the Active/Archived tabs.
- Filter is text-based, case-insensitive, matching against:
  - Company name
  - Role title
- Filtering applies within the currently selected tab (Active or Archived) — archived stays separate.
- Filtering happens client-side on the already-loaded list (no extra database queries); results update as the user types.
- When the search matches nothing, show a "No companies match your search" empty state instead of the table.
- Existing behavior is unchanged: star scores, actions menu, Excel export (export keeps respecting the tab; filtered export can be added later if wanted).

## Technical notes
- Single new piece of state (`search` string) plus a `filteredItems` memo derived from `items`, `tab`, and `search`.
- No database or edge-function changes required.
