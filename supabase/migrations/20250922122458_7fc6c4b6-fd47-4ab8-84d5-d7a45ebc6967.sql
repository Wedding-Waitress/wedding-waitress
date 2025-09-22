-- Create family_groups table
CREATE TABLE public.family_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on event_id and name
CREATE UNIQUE INDEX idx_family_groups_event_name ON public.family_groups (event_id, name);

-- Enable RLS on family_groups
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for family_groups
CREATE POLICY "Users can view family groups for their events" 
ON public.family_groups 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = family_groups.event_id 
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create family groups for their events" 
ON public.family_groups 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = family_groups.event_id 
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update family groups for their events" 
ON public.family_groups 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = family_groups.event_id 
    AND events.user_id = auth.uid()
  )
);

-- Create family_group_members table
CREATE TABLE public.family_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on group_id and guest_id
CREATE UNIQUE INDEX idx_family_group_members_group_guest ON public.family_group_members (group_id, guest_id);

-- Enable RLS on family_group_members
ALTER TABLE public.family_group_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for family_group_members
CREATE POLICY "Users can view family group members for their events" 
ON public.family_group_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.family_groups fg
    JOIN public.events e ON fg.event_id = e.id
    WHERE fg.id = family_group_members.group_id 
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create family group members for their events" 
ON public.family_group_members 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_groups fg
    JOIN public.events e ON fg.event_id = e.id
    JOIN public.guests g ON g.id = family_group_members.guest_id
    WHERE fg.id = family_group_members.group_id 
    AND e.user_id = auth.uid()
    AND g.event_id = e.id
  )
);

CREATE POLICY "Users can update family group members for their events" 
ON public.family_group_members 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.family_groups fg
    JOIN public.events e ON fg.event_id = e.id
    WHERE fg.id = family_group_members.group_id 
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete family group members for their events" 
ON public.family_group_members 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.family_groups fg
    JOIN public.events e ON fg.event_id = e.id
    WHERE fg.id = family_group_members.group_id 
    AND e.user_id = auth.uid()
  )
);