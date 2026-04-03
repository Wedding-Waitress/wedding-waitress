ALTER TABLE public.running_sheets
  ADD COLUMN IF NOT EXISTS section_notes text,
  ADD COLUMN IF NOT EXISTS section_label text DEFAULT 'Running Sheet';