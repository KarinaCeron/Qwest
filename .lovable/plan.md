# Simplify target-companies rows and show founders

Two changes in My Target Companies.

## 1. Company cell in the table

- Remove the explanation text shown under each company name (the verdict sentence).
- Move the total score (`X/25`) so it sits directly below the company name and role.
- Remove the separate Total column from the table.
- Everything else stays exactly as it is: the five criteria star columns and the three-dots actions menu.

## 2. Founders missing in Company insights

The report data does contain founders — GreenSQA stores it as `founders`, Open International as `Founders` — but the insights panel only prints industry, stage, location and founded, so the name never shows. Add a Founders line to the company facts block, and read the key case-insensitively so both spellings display. Also add the company website as a clickable link in the same block.

## Technical notes

- `src/pages/TargetCompanies.tsx`: drop the `final_decision` block from the company cell, render `totalOf(row)` there instead, and remove the Total `TableHead`/`TableCell`.
- `src/components/TargetCompanyReport.tsx`: add a small case-insensitive lookup helper over `evaluation.company` and render Founders (plus website link) alongside the existing fields.
- No database or Edge Function changes.
