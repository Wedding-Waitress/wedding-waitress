-- Add email/SMS tracking fields to dj_questionnaires
ALTER TABLE dj_questionnaires
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recipient_phones TEXT[],
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Create index for share token lookup
CREATE INDEX IF NOT EXISTS idx_dj_questionnaires_share_token 
ON dj_questionnaires(share_token);

-- Create share tokens table for security
CREATE TABLE IF NOT EXISTS dj_questionnaire_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES dj_questionnaires(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_dj_questionnaire_tokens_token 
ON dj_questionnaire_tokens(token);

-- RLS Policies for public token access
ALTER TABLE dj_questionnaire_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tokens are publicly readable with valid token"
ON dj_questionnaire_tokens FOR SELECT
USING (expires_at IS NULL OR expires_at > NOW());