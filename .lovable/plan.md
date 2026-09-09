# Simplify target-companies row header

Update the My Target Companies table so the company cell shows only the company name, role, and total score, while removing the explanation text and the separate Total column.

## What changes

1. **Remove the explanation text** under each company name (the `final_decision` verdict currently shown below the role).
2. **Move the total score** (`X/25`) to sit directly below the company name (and role if present) instead of in its own Total column.
3. **Remove the Total column** from the table header.
4. **Keep everything else unchanged**: the five criteria star-rating columns and the three-dots actions menu remain exactly as they are now.

## Technical notes

- File: `src/pages/TargetCompanies.tsx`
- Remove the `final_decision` block inside the company `TableCell`.
- Add the total score display under the company name using the existing `totalOf` helper.
- Remove the `Total` `TableHead` and its corresponding `TableCell`.
- No database or Edge Function changes are required.
