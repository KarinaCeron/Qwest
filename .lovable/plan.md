# Target companies: cleaner rows, founders, and an outreach page

Three changes in My Target Companies.

## 1. Company cell in the table

- Remove the explanation text under each company name (the verdict sentence).
- Show the total score (`X/25`) directly below the company name and role.
- Remove the separate Total column.
- Everything else stays as it is: the five criteria star columns and the three-dots actions menu.

## 2. Founders missing in Company insights

The report data does contain founders — GreenSQA stores it as `founders`, Open International as `Founders` — but the insights panel only prints industry, stage, location and founded, so the name never shows. Add a Founders line to the company facts block, reading the key case-insensitively so both spellings appear, and show the company website as a clickable link there too.

## 3. Prepare outreach becomes its own page

"Prepare outreach" opens a new page for that company instead of the templates page.

The page shows:

- **Company header** with the company name, total score and decision.
- **Find people on LinkedIn**: ready-made search links that open LinkedIn in a new tab for CEO, CTO, CPO, VP Product, Head of Product and Head of Talent at that company, plus a free-text role box to build any other search. Founders named in the company report get their own direct search link.
- **My contacts list**: add a contact with name, title, LinkedIn URL, email and notes; edit and delete them.
- **Outreach status per contact**: Not contacted, Message sent, Replied, Meeting booked, No response — with the date of the last change.
- **Draft a message**: for a selected contact, generate a personalised outreach note from the company report, the Qwest candidate profile and the contact's role, shown in an editable box with a copy button and the option to save it on the contact.

## Technical notes

- `src/pages/TargetCompanies.tsx`: drop the `final_decision` block from the company cell, render `totalOf(row)` there, remove the Total `TableHead`/`TableCell`, and change the Prepare outreach action to `navigate('/target-companies/' + row.id + '/outreach')`.
- `src/components/TargetCompanyReport.tsx`: case-insensitive lookup helper over `evaluation.company`; render Founders and a website link.
- New table `public.target_company_contacts`: `id`, `user_id`, `target_company_id` (FK, cascade), `name`, `title`, `linkedin_url`, `email`, `notes`, `status` (default `not_contacted`), `status_changed_at`, `draft_message`, `created_at`, `updated_at`. Grants for `authenticated` + `service_role`, RLS enabled, four owner policies on `auth.uid() = user_id`.
- New page `src/pages/TargetCompanyOutreach.tsx` at route `/target-companies/:id/outreach` in `App.tsx`; loads the target company plus its contacts.
- LinkedIn search links are plain URLs of the form `https://www.linkedin.com/search/results/people/?keywords=<role>%20<company>` — no LinkedIn API or connector needed.
- New edge function `draft-outreach`: takes company id + contact, reads `profiles.candidate_profile` and the stored `evaluation`, and calls Lovable AI to produce a short outreach message.
