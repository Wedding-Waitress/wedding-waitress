-- Add campaign_type to rsvp_reminder_campaigns
ALTER TABLE rsvp_reminder_campaigns 
ADD COLUMN campaign_type text NOT NULL DEFAULT 'reminder' CHECK (campaign_type IN ('initial_invitation', 'reminder'));

-- Create email_templates table
CREATE TABLE email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_templates
CREATE POLICY "Users can manage their own email templates"
  ON email_templates
  FOR ALL
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();