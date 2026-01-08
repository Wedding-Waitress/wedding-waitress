import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  BorderStyle,
  ExternalHyperlink,
} from 'docx';
import { validateMusicURL, getPlatformName, ensureAbsoluteUrl } from './urlValidation';
import { saveAs } from 'file-saver';
import { DJQuestionnaireWithData, TemplateType } from '@/types/djQuestionnaire';
import {
  Event,
  formatEventDate,
  getEventName,
  getTemplateDisplayLabel,
  formatTimeRange,
  getCurrentDateTime,
} from './djQuestionnaireFormatters';

export const exportToDocx = async (
  event: Event,
  questionnaire: DJQuestionnaireWithData,
  templateType: TemplateType
) => {
  const headerOverrides = (questionnaire.header_overrides as Record<string, any>) || {};
  const { date: generatedDate, time: generatedTime } = getCurrentDateTime();
  const activeSection = questionnaire.meta?.activeSection || 'All Sections';

  // Header data
  const eventName = getEventName(event);
  const templateLabel = getTemplateDisplayLabel(templateType);
  const fullDate = formatEventDate(event.date);
  const venue = headerOverrides.venue_override || event.venue_name || event.venue || 'Venue TBD';
  const ceremonyTime = formatTimeRange(
    headerOverrides.ceremony_start || event.start_time,
    headerOverrides.ceremony_finish || event.start_time
  );
  const canapesTime = formatTimeRange(
    headerOverrides.canapes_start || null,
    headerOverrides.canapes_finish || null
  );
  const receptionTime = formatTimeRange(
    headerOverrides.reception_start || event.start_time,
    headerOverrides.reception_finish || event.finish_time
  );
  const djName = headerOverrides.dj_name || 'TBD';
  const djMobile = headerOverrides.dj_mobile || 'TBD';
  const mcName = headerOverrides.mc_name || 'TBD';
  const mcMobile = headerOverrides.mc_mobile || 'TBD';

  // Filter sections based on activeSection
  const visibleSections = activeSection === 'All Sections'
    ? questionnaire.sections
    : questionnaire.sections.filter(section => section.label === activeSection);

  // Build document sections
  const sections: Paragraph[] = [];

  // Line 1: Event Name
  sections.push(
    new Paragraph({
      text: eventName,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: eventName,
          color: '6D28D9',
          bold: true,
          size: 32,
        }),
      ],
    })
  );

  // Line 2: Template & Date
  sections.push(
    new Paragraph({
      text: `${templateLabel} – ${fullDate}`,
      spacing: { after: 200 },
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: `${templateLabel} – ${fullDate}`,
          bold: true,
          size: 24,
        }),
      ],
    })
  );

  // Line 3: Event Details
  sections.push(
    new Paragraph({
      text: `Venue: ${venue}`,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'Venue: ',
          bold: true,
          size: 20,
        }),
        new TextRun({
          text: venue,
          size: 20,
        }),
      ],
    })
  );

  // Build time range with optional canapés
  const timeChildren: any[] = [
    new TextRun({
      text: 'Ceremony: ',
      bold: true,
      size: 20,
    }),
    new TextRun({
      text: ceremonyTime,
      size: 20,
    }),
  ];

  if (canapesTime && canapesTime !== 'TBD') {
    timeChildren.push(
      new TextRun({
        text: ' — Canapés: ',
        bold: true,
        size: 20,
      }),
      new TextRun({
        text: canapesTime,
        size: 20,
      })
    );
  }

  timeChildren.push(
    new TextRun({
      text: ' — Reception: ',
      bold: true,
      size: 20,
    }),
    new TextRun({
      text: receptionTime,
      size: 20,
    })
  );

  sections.push(
    new Paragraph({
      spacing: { after: 100 },
      children: timeChildren,
    })
  );

  sections.push(
    new Paragraph({
      text: `DJ: ${djName}, ${djMobile} — MC: ${mcName}, ${mcMobile}`,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'DJ: ',
          bold: true,
          size: 20,
        }),
        new TextRun({
          text: `${djName}, ${djMobile}`,
          size: 20,
        }),
        new TextRun({
          text: ' — MC: ',
          bold: true,
          size: 20,
        }),
        new TextRun({
          text: `${mcName}, ${mcMobile}`,
          size: 20,
        }),
      ],
    })
  );

  // Line 4: Metadata
  const estimatedPages = Math.ceil(visibleSections.length / 2) + 1; // Rough estimate: 2 sections per page + header
  sections.push(
    new Paragraph({
      text: `Pages: ~${estimatedPages} (varies in Word) — Generated on: ${generatedDate} — Time: ${generatedTime}`,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: `Pages: ~${estimatedPages} (varies in Word) — Generated on: ${generatedDate} — Time: ${generatedTime}`,
          size: 18,
          italics: true,
          color: '666666',
        }),
      ],
    })
  );

  // Add questionnaire sections (filtered by visibility)
  visibleSections.forEach((section) => {
    sections.push(
      new Paragraph({
        text: section.label,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
        children: [
          new TextRun({
            text: section.label,
            bold: true,
            size: 28,
            color: '6D28D9',
          }),
        ],
      })
    );

    if (section.instructions) {
      sections.push(
        new Paragraph({
          text: section.instructions,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: section.instructions,
              italics: true,
              size: 20,
            }),
          ],
        })
      );
    }

    section.items.forEach((item) => {
      sections.push(
        new Paragraph({
          text: item.prompt,
          spacing: { before: 150, after: 100 },
          children: [
            new TextRun({
              text: item.prompt,
              bold: true,
              size: 22,
            }),
          ],
        })
      );

      if (item.help_text) {
        sections.push(
          new Paragraph({
            text: item.help_text,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: item.help_text,
                size: 20,
                color: '666666',
              }),
            ],
          })
        );
      }

      // Answer value
      const answerValue = item.answer?.value;

      // Helper function to render a link as hyperlink
      const renderLink = (link: string): Paragraph => {
        const linkUrl = ensureAbsoluteUrl(link);
        const validation = validateMusicURL(linkUrl);
        const platformName = getPlatformName(validation.platform);

        return new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: '🔗 ',
              size: 20,
            }),
            new ExternalHyperlink({
              children: [
                new TextRun({
                  text: `${platformName}: ${linkUrl}`,
                  size: 20,
                  color: '6D28D9',
                  underline: {},
                }),
              ],
              link: linkUrl,
            }),
          ],
        });
      };

      // Handle all music row types with links
      if (
        (item.type === 'song_row' ||
          item.type === 'ceremony_music_row' ||
          item.type === 'main_event_song_row' ||
          item.type === 'background_music_row' ||
          item.type === 'dance_music_row') &&
        answerValue
      ) {
        const songData = answerValue;

        // Moment (if applicable)
        if (songData.moment) {
          sections.push(
            new Paragraph({
              spacing: { after: 50 },
              children: [
                new TextRun({
                  text: `Moment: ${songData.moment}`,
                  size: 20,
                  italics: true,
                  color: '666666',
                }),
              ],
            })
          );
        }

        // Song title + artist
        sections.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: `♪ ${songData.song || '[No title]'} – ${songData.artist || '[No artist]'}`,
                size: 20,
                bold: true,
              }),
            ],
          })
        );

        // Clickable link
        if (songData.link) {
          sections.push(renderLink(songData.link));
        }

        sections.push(
          new Paragraph({
            text: '',
            spacing: { after: 200 },
          })
        );
      } else if (item.type === 'bridal_party_enhanced_row' && answerValue) {
        const bridalData = answerValue;

        sections.push(
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: `${bridalData.role || '[Role]'}: ${bridalData.names || '[Names]'}`,
                size: 20,
                bold: true,
              }),
            ],
          })
        );

        if (bridalData.pronunciation) {
          sections.push(
            new Paragraph({
              spacing: { after: 50 },
              children: [
                new TextRun({
                  text: `Pronunciation: ${bridalData.pronunciation}`,
                  size: 20,
                  italics: true,
                }),
              ],
            })
          );
        }

        if (bridalData.entranceSong) {
          sections.push(
            new Paragraph({
              spacing: { after: 50 },
              children: [
                new TextRun({
                  text: `♪ Entrance: ${bridalData.entranceSong}`,
                  size: 20,
                }),
              ],
            })
          );
        }

        if (bridalData.link) {
          sections.push(renderLink(bridalData.link));
        }

        sections.push(
          new Paragraph({
            text: '',
            spacing: { after: 200 },
          })
        );
      } else {
        // Default handling for other item types
        let displayValue = '';
        if (answerValue !== null && answerValue !== undefined) {
          if (typeof answerValue === 'boolean') {
            displayValue = answerValue ? 'Yes' : 'No';
          } else if (Array.isArray(answerValue)) {
            displayValue = answerValue.join(', ');
          } else if (typeof answerValue === 'object') {
            displayValue = JSON.stringify(answerValue);
          } else {
            displayValue = String(answerValue);
          }
        }

        sections.push(
          new Paragraph({
            text: displayValue || '___________________________________',
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: displayValue || '___________________________________',
                size: 20,
              }),
            ],
          })
        );
      }
    });
  });

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_DJ_Questionnaire.docx`);
};
