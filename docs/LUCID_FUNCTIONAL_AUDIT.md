# Lucid functional audit — 24 November 2026

## Scope applied in this change

- Study Rooms are removed from the current user-facing navigation, dashboard quick actions, and page content.
- The Leaderboard markup and its existing profile/Xp query are intentionally untouched.
- PDF upload continues to store the original file in Supabase Storage and extracted text separately for AI processing.
- The Reading Room now opens a signed URL for the original uploaded PDF in the browser's PDF viewer. Extracted text is hidden from the reader UI and remains an internal AI-processing asset.
- PDF extraction now preserves line breaks where PDF.js exposes end-of-line markers. The stored page count is the real PDF page count, including scanned PDFs with no selectable text.
- Catalogue resource associations are represented as many-to-many mappings rather than silently assigning a resource to only one catalogue. Catalogue counts are unique-resource counts, and opening a catalogue fetches its linked resources explicitly.

## Findings from the current repository

### PDF and resource management

Before this change, `uploadLucidPdf` stored the original binary in the `learning-assets` bucket and wrote its path to `resource_files`, but `openLucidResource` queried only `resource_pages`. The Reading Room then rendered each extracted page as a plain paragraph. That is why the uploaded PDF's layout, figures, tables, equations, and page design were lost in the reader.

The updated reader retrieves the matching `resource_files` row, creates a one-hour signed URL, and embeds the original PDF. AI text extraction remains separate. Scanned PDFs still need an OCR service for searchable AI context; the original file can nevertheless be viewed.

### Catalogue and Library

The previous resource-to-catalogue map used one catalogue ID per resource, so a resource linked to multiple catalogues could be represented incorrectly in Library state. The updated mapping keeps all catalogue IDs, counts distinct linked resources, previews resource names on catalogue cards, and resolves each catalogue's linked resources through explicit owner-scoped queries.

### Learning, quizzes, and mastery — remaining implementation gap

The repository currently contains a static in-memory `quizBank`. The `answerQuiz` handler increments browser state and local XP but does not create rows in `quizzes`, `questions`, `quiz_attempts`, or `quiz_answers`. AI-generated quiz questions are added to the in-memory bank and are not persisted as assessment records.

The database migration defines `compute_mastery(exposure, understanding, recall, application)` with weights 20%, 30%, 25%, and 25%, plus `update_concept_mastery`. However, the current frontend does not call that RPC, and the AI-learning Edge Function returns generated JSON without persisting assessment attempts or updating concept mastery. Therefore the presence of the schema/function is not proof that the mastery feature is operational.

This change adds an assessment-event call through the existing `track_learning_event` RPC when an answer is submitted. It is an evidence trail, not a claim that full mastery is now calculated. A proper next implementation step is to persist quiz definitions, question records, attempts, and per-question answers; associate questions with concepts; and update mastery from authenticated assessment evidence with an auditable, repeatable server-side calculation. The migration must be applied to the connected Supabase project before the RPC-backed event logging can work.

### Leaderboard

The existing Leaderboard UI and `loadLucidLeaderboard` implementation were not changed. It continues to query profiles ordered by XP. XP and leaderboard infrastructure are deliberately retained; no room-related tables, shared XP records, or profile data are dropped.

### Study Rooms

Only the current frontend experience is removed. Room tables and room-related database objects are left intact to avoid destructive schema changes and accidental impact on shared XP, profile, or leaderboard infrastructure.

## Verification checklist

- [ ] Sign in with a learner account.
- [ ] Upload a text-based PDF and confirm the Reading Room shows the original formatted PDF.
- [ ] Upload a scanned PDF and confirm it still opens, with an OCR-needed warning for AI text processing.
- [ ] Confirm the PDF opens in a new tab and browser-native zoom/page controls work.
- [ ] Confirm the PDF's extracted text is not displayed as the primary reader document.
- [ ] Create a catalogue, upload a PDF into it, and confirm the resource count and preview update.
- [ ] Open the catalogue and confirm every linked resource appears.
- [ ] Link one resource to more than one catalogue and confirm it appears in both.
- [ ] Confirm Study Rooms are absent from desktop navigation, mobile navigation, dashboard quick actions, and page content.
- [ ] Confirm the Leaderboard remains available and loads the same profile/XP standings.
- [ ] Confirm quiz answers create learning events after the `track_learning_event` migration is applied.
- [ ] Implement and test durable quiz attempts and concept-level mastery separately before presenting mastery percentages as verified learner outcomes.

## Deployment note

The repository changes do not deploy Supabase migrations or Edge Functions. The connected Supabase project must have the relevant schema migrations applied. No live database rows or room tables were deleted by this change.
