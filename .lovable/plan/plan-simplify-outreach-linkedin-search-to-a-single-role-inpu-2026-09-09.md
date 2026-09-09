# Plan: Simplify outreach LinkedIn search to a single role input

## Goal
Replace the multiple preset LinkedIn search chips (CEO, CTO, Founder, etc.) on the **Prepare outreach** page with one simple flow: the user types a role, clicks a button to create the LinkedIn people-search link, then can open or copy that link.

## What will change
- File: `src/pages/TargetCompanyOutreach.tsx`
- Remove the `DEFAULT_TITLES` preset title chips.
- Remove the founders-based LinkedIn search chips derived from the company evaluation.
- Add a single text input labeled **Role** (placeholder: e.g. `Head of Product`).
- Add a primary **Create LinkedIn search** button that builds the search URL using the entered role and the company name.
- Once the link is created, show two actions next to it:
  - **Open LinkedIn** — opens the search URL in a new tab.
  - **Copy link** — copies the URL to the clipboard.
- Reset the created link if the user clears the role input.
- Keep the existing contact list, add/edit contact dialog, status selector, and manual message textarea unchanged.

## Out of scope
- No changes to the target-company scorecard, reports, archiving, export, or avatar menu order.
- No changes to the `target_company_contacts` table, Edge Functions, or routes.

## Acceptance criteria
1. The outreach page no longer shows the row of preset title chips or founder chips.
2. A user can type a role and generate a LinkedIn people-search link for that role at the current company.
3. Generated links can be opened in a new tab or copied to the clipboard.
4. TypeScript compilation continues to pass (`npx tsgo --noEmit -p tsconfig.app.json`).
