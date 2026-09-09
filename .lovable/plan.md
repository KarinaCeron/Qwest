# Review status for Active target companies

## Goal
Split the Active tab into two review states — **To review** (por revisar) and **Reviewed** (revisada) — both living in the Active tab, with a filter to show all, only to-review, or only reviewed.

## Changes

### Database
- Add column `review_status text NOT NULL DEFAULT 'to_review'` to `public.target_companies`.
- Allowed values: `to_review`, `reviewed`. Existing active companies start as `to_review`.
- Archiving keeps the review status untouched; restoring brings the company back with its previous status.

### `src/pages/TargetCompanies.tsx`
- New companies are created with `to_review`.
- In the **Active** tab, add a small filter (tabs or a select) next to the search bar: **All / To review / Reviewed**, showing counts.
- The company/role search keeps working and combines with this status filter.
- Actions menu (active companies) gains:
  - **Mark as reviewed** when the company is `to_review`.
  - **Move back to To review** when the company is `reviewed`.
- Each row shows a small badge: "To review" (amber) or "Reviewed" (green).
- The Archived tab is unchanged (no review filter there).
- Excel export unchanged, optionally include the review status column — no, keep export as-is (company + 5 scores + total).

## Technical notes
- One migration: `ALTER TABLE public.target_companies ADD COLUMN review_status text NOT NULL DEFAULT 'to_review';` plus a CHECK-lite validation trigger is overkill; the app only writes the two allowed values. RLS already covers updates by owner, so no policy changes.
- `useAuth` types: extend the local `TargetCompany` type with `review_status`.
- Filtering stays client-side, derived with the existing `useMemo`.
