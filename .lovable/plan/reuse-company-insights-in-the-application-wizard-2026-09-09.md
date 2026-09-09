# Reuse company insights in the application wizard

Make the **Research company** button in a new job application reuse the insights already stored in My Target Companies, and otherwise run the same evaluation used there.

## Behaviour

1. Click **Research company** with a company name filled in.
2. If that company already exists in My Target Companies (name match, ignoring case and spacing):
   - Show the saved insights in the same formatted layout used in My Target Companies (star scores per criterion, summary, evidence, why-not-higher, risks, interview questions, founders, website).
   - No new research runs, no cost. A short note says the insights come from My Target Companies. Updating them is done from that page.
3. If the company is not there yet:
   - Run the same research/evaluation used in My Target Companies.
   - Show the formatted result in the form.
   - Save the company into My Target Companies (with website, role and job description if already filled), so it appears in the Active tab with its scores.

Existing plain-text research already saved for a company is still shown when there is no target-company entry for it.

## Technical notes

- `src/components/JobApplicationForm.tsx` → rewrite `handleResearchCompany`:
  - Query `target_companies` for the current user where a normalised company name matches; take the most recently evaluated row.
  - Found with `evaluation`/`analysis` → store it in new state and render.
  - Not found → invoke `evaluate-target-company` (same body shape as `TargetCompanies.tsx`: company, website, role, jobDescription), then insert a `target_companies` row with the returned scores, `confidence`, `verdicts`, `final_decision`, `analysis`, `evaluation`, `evaluated_at`, `archived: false`.
  - Keep the existing `company_research` fallback read/write for plain-text research.
- `src/components/CompanyResearchPanel.tsx` → accept an optional `evaluation` object and an optional source label; when present, render `TargetCompanyReport` (with `SCORECARD_MAP` star scores) instead of the plain `FormattedText`.
- No database schema change needed.
