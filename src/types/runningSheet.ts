/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This Running Sheet feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break running sheet data, sharing, or PDF export
 *
 * Last locked: 2026-02-19
 */
export interface RunningSheetItem {
  id: string;
  sheet_id: string;
  order_index: number;
  time_text: string;
  description_rich: any;
  responsible: string | null;
  is_section_header: boolean;
  created_at: string;
  updated_at: string;
}

export interface RunningSheetShareToken {
  id: string;
  sheet_id: string;
  token: string;
  permission: string;
  recipient_name: string | null;
  expires_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
}
