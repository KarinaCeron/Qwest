# Format company insights and score display in My Target Companies

The webhook now answers with a full structured report (verified on the stored result for Open International): company facts, a five-part scorecard, risks, flags, sources, interview questions and a final summary. Today the app stores that raw text and its score reader still looks for a markdown table, so the score columns stay empty (`score_stage`, `score_history` are null for that row) and the insights panel shows unformatted JSON.

## What changes for you

1. **Scores fill in and show as stars.** Each of the five table criteria (Current stage, History, Compensation, Culture & team, My path to next role) gets a 0–5 star rating instead of a plain "3/5" badge, plus the total out of 25.
2. **Readable insights panel.** Opening "View insights" shows clean sections instead of raw data:
   - Verdict header: decision (e.g. REJECT), one-sentence verdict, total score, career trajectory.
   - One card per criterion, in the same order as the table columns, each with the star score and three labelled parts: **Criteria**, **Evidence**, **Why not higher**.
   - Green / yellow / red flags, risks (with severity and how to validate), interview questions, and clickable sources.
3. **Old results still readable.** Companies whose stored result is plain prose keep rendering as formatted text.

## Scorecard mapping

| Table column | Webhook key |
| --- | --- |
| Current stage | `scorecard.stage_funding_runway` |
| History | `scorecard.company_history_quality` |
| Compensation | `scorecard.compensation_non_negotiables` |
| Culture & team | `scorecard.culture_team` |
| My path to next role | `scorecard.my_path` |

## Technical notes

- **Database:** add `evaluation jsonb` to `public.target_companies` (nullable) to hold the parsed report. Existing grants/RLS unchanged.
- **Edge function `evaluate-target-company`:** after `unwrap()`, try `JSON.parse`. On success, map the five scorecard keys to `scores.*`, take `summary.decision` / `one_sentence_verdict` for `decision`, keep `criteria` per key in `verdicts`, and return the whole object as `evaluation`. Fall back to the current markdown/regex parser when the body is not JSON.
- **Frontend `src/pages/TargetCompanies.tsx`:** persist `evaluation` on evaluate; replace the score badge with a small `StarRating` component (filled/half/empty stars + `n/5` label, `aria-label` for screen readers); keep the total column.
- **New `src/components/TargetCompanyReport.tsx`:** renders the structured `evaluation` inside the existing sheet (criterion cards with Criteria / Evidence / Why not higher, flags, risks, interview questions, sources). If `evaluation` is absent, render `FormattedText` on `analysis` as today.
- No changes to the payload sent to n8n.
