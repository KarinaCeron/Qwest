# Show founders in Company insights

The founders are present in the stored report — GreenSQA has "Liliana del Socorro Gómez (founder and CEO)" and Open International has "William Corredor and team" — but the insights panel only prints Industry, Stage, Location and Founded, so the founders never appear. The two companies also spell the key differently (`founders` vs `Founders`).

## What changes

- Add a **Founders** line to the company facts block in the insights panel.
- Read the key without caring about upper/lower case, so both companies display.
- Show the company **website** in the same block as a clickable link.

Nothing else in the panel or the table changes.

## Technical notes

- `src/components/TargetCompanyReport.tsx`: add a small case-insensitive lookup over `evaluation.company`, then render Founders and a website link next to the existing `Field` entries.
- No database or Edge Function changes.
