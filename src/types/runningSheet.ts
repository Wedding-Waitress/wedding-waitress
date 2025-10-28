export interface RunningSheet {
  id: string;
  event_id: string;
  user_id: string;
  venue_logo_url: string | null;
  show_responsible: boolean;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
  
  // Formatting settings
  all_font?: string;
  all_text_size?: 'small' | 'medium' | 'large';
  all_bold?: boolean;
  all_italic?: boolean;
  all_text_color?: string;
  header_font?: string;
  header_size?: 'small' | 'medium' | 'large';
  header_bold?: boolean;
  header_italic?: boolean;
  header_color?: string;
}

export interface RunningSheetItem {
  id: string;
  sheet_id: string;
  order_index: number;
  time_text: string;
  description_rich: any; // JSON/rich text object
  responsible: string | null;
  is_section_header: boolean;
  created_at: string;
  updated_at: string;
}

export interface RunningSheetWithUpdater extends RunningSheet {
  updated_by_name?: string;
}
