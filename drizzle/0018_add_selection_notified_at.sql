-- Tracks whether a 'selected' applicant has already been emailed via the
-- admin's "Notify Selected" bulk action, so re-running it never double-sends.
ALTER TABLE "taaruf_program_applications" ADD COLUMN "selection_notified_at" timestamp with time zone;
