// DJ Questionnaire Types - Normalized Data Structure

export type TemplateType = 'wedding_mr_mrs' | 'wedding_mr_mr' | 'wedding_mrs_mrs' | 'event_general';
export type QuestionnaireStatus = 'draft' | 'ready' | 'sent' | 'approved';
export type ItemType = 'text' | 'longtext' | 'name' | 'song' | 'list' | 'toggle' | 'time' | 'phone' | 'email';

export interface DJQuestionnaire {
  id: string;
  event_id: string;
  template_type: TemplateType;
  status: QuestionnaireStatus;
  recipient_emails: string[];
  notes: string | null;
  header_overrides: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DJSection {
  id: string;
  questionnaire_id: string;
  label: string;
  instructions: string | null;
  recommendations: Record<string, any>;
  sort_index: number;
  created_at: string;
  updated_at: string;
}

export interface DJItem {
  id: string;
  section_id: string;
  type: ItemType;
  prompt: string;
  help_text: string | null;
  required: boolean;
  sort_index: number;
  meta: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DJAnswer {
  id: string;
  item_id: string;
  value: any;
  answered_by: string | null;
  created_at: string;
  updated_at: string;
}

// Combined view for rendering
export interface DJQuestionnaireWithData extends DJQuestionnaire {
  sections: (DJSection & {
    items: (DJItem & {
      answer?: DJAnswer;
    })[];
  })[];
}
