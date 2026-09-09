# Prepare outreach page

"Prepare outreach" in My Target Companies stops opening the templates page and instead opens a page dedicated to that company.

## What the page shows

- **Header**: company name, role, total score, and a link back to My Target Companies.
- **Find people on LinkedIn**: ready-made search buttons that open LinkedIn in a new tab for CEO, CTO, CPO, VP Product, Head of Product, Head of Talent and Founder at that company, plus a free-text box to search any other title. Any founders named in the company report get their own direct search link.
- **People to contact**: add a person with name, title, LinkedIn address, email and notes; edit or remove them later. New people can be added straight from a LinkedIn search result by pasting the profile address.
- **Outreach status** per person: Not contacted, Message sent, Replied, Meeting booked, No response — with the date it last changed.
- **Draft a message**: for a selected person, produce a short personalised outreach note built from the company report, your Qwest candidate profile and that person's title. The draft appears in an editable box with a copy button and can be saved on the person.

LinkedIn does not let apps search people, so this uses normal LinkedIn search links that open in your browser where you are already signed in.

## Technical notes

- New table `public.target_company_contacts`: `id`, `user_id`, `target_company_id` (FK to `target_companies`, cascade delete), `name`, `title`, `linkedin_url`, `email`, `notes`, `status` (default `not_contacted`), `status_changed_at`, `draft_message`, `created_at`, `updated_at`. Grants to `authenticated` and `service_role`, RLS enabled, four owner policies on `auth.uid() = user_id`.
- New page `src/pages/TargetCompanyOutreach.tsx`, route `/target-companies/:id/outreach` in `App.tsx`; loads the target company plus its contacts.
- `src/pages/TargetCompanies.tsx`: the Prepare outreach menu item navigates to that route instead of `/templates`.
- Search links use `https://www.linkedin.com/search/results/people/?keywords=<title>%20<company>` — no LinkedIn API or connector.
- New edge function `draft-outreach`: takes the company id and contact, reads `profiles.candidate_profile` and the stored `evaluation`, and calls Lovable AI (`google/gemini-2.5-flash`) to produce the message. Requires the AI gateway key already used by other functions.
