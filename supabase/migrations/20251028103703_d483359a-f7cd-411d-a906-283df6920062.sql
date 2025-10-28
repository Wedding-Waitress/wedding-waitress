-- Create running_sheets table
CREATE TABLE public.running_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_logo_url TEXT,
  show_responsible BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.running_sheets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for running_sheets
CREATE POLICY "Users can view their own running sheets"
  ON public.running_sheets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own running sheets"
  ON public.running_sheets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own running sheets"
  ON public.running_sheets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own running sheets"
  ON public.running_sheets FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for running_sheets
CREATE INDEX idx_running_sheets_event_id ON public.running_sheets(event_id);
CREATE INDEX idx_running_sheets_user_id ON public.running_sheets(user_id);

-- Create running_sheet_items table
CREATE TABLE public.running_sheet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.running_sheets(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  time_text TEXT NOT NULL,
  description_rich JSONB NOT NULL DEFAULT '{}',
  responsible TEXT,
  is_section_header BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.running_sheet_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for running_sheet_items
CREATE POLICY "Users can view items for their sheets"
  ON public.running_sheet_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.running_sheets rs
      WHERE rs.id = running_sheet_items.sheet_id
      AND rs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create items for their sheets"
  ON public.running_sheet_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.running_sheets rs
      WHERE rs.id = running_sheet_items.sheet_id
      AND rs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items for their sheets"
  ON public.running_sheet_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.running_sheets rs
      WHERE rs.id = running_sheet_items.sheet_id
      AND rs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items for their sheets"
  ON public.running_sheet_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.running_sheets rs
      WHERE rs.id = running_sheet_items.sheet_id
      AND rs.user_id = auth.uid()
    )
  );

-- Indexes for running_sheet_items
CREATE INDEX idx_running_sheet_items_sheet_id ON public.running_sheet_items(sheet_id);
CREATE INDEX idx_running_sheet_items_order ON public.running_sheet_items(sheet_id, order_index);

-- Create storage bucket for venue logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-logos', 'venue-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Users can upload venue logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'venue-logos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can view venue logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'venue-logos');

CREATE POLICY "Users can update their venue logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'venue-logos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their venue logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'venue-logos'
    AND auth.uid() IS NOT NULL
  );