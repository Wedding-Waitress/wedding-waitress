/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This DJ-MC Questionnaire feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break questionnaire data, sharing, or PDF export
 *
 * Last locked: 2026-02-19
 */
import { DJMCSection } from '@/types/djMCQuestionnaire';

type InsertType = 'ceremony' | 'introductions' | 'speeches';

const SECTION_TYPE_MAP: Record<InsertType, string> = {
  ceremony: 'ceremony',
  introductions: 'introductions',
  speeches: 'speeches',
};

export function formatDJMCInsert(
  sections: DJMCSection[],
  type: InsertType,
  includeSongs: boolean
): string | null {
  const sectionType = SECTION_TYPE_MAP[type];
  const section = sections.find(s => s.section_type === sectionType);
  if (!section || section.items.length === 0) return null;

  const lines: string[] = [];

  for (const item of section.items) {
    if (type === 'ceremony') {
      if (includeSongs && item.song_title_artist) {
        lines.push(`${item.row_label}: ${item.song_title_artist}`);
      } else {
        lines.push(item.row_label);
      }
    } else if (type === 'introductions') {
      const name = item.value_text?.trim();
      const song = item.song_title_artist?.trim();
      if (includeSongs && name && song) {
        lines.push(`${item.row_label}: ${name} - ${song}`);
      } else if (name) {
        lines.push(`${item.row_label}: ${name}`);
      } else {
        lines.push(item.row_label);
      }
    } else if (type === 'speeches') {
      const name = item.value_text?.trim();
      if (name) {
        lines.push(`${item.row_label}: ${name}`);
      } else {
        lines.push(item.row_label);
      }
    }
  }

  return lines.join('\n');
}
