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
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Music, ExternalLink, Calendar, MapPin, Clock, AlertCircle, Download, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DJMCSection } from '@/types/djMCQuestionnaire';
import { exportEntireQuestionnairePDF } from '@/lib/djMCQuestionnairePdfExporter';

interface PublicQuestionnaireData {
  questionnaire_id: string;
  event_id: string;
  event_name: string;
  event_date: string | null;
  event_venue: string | null;
  start_time: string | null;
  finish_time: string | null;
  ceremony_date: string | null;
  ceremony_venue: string | null;
  ceremony_start_time: string | null;
  ceremony_finish_time: string | null;
  permission: 'view_only' | 'can_edit';
  sections: DJMCSection[];
}

// Format date as "Saturday, 5th December 2026"
const formatFullDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  
  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  
  return `${dayOfWeek}, ${day}${getOrdinalSuffix(day)} ${month} ${year}`;
};

// Check if a string is a valid URL
const isValidUrl = (str: string | null | undefined): boolean => {
  if (!str) return false;
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

// Music Link Button Component
function MusicLinkButton({ url }: { url: string }) {
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  const isSpotify = url.includes('spotify.com');
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        isYouTube 
          ? 'bg-red-100 text-red-700 hover:bg-red-200' 
          : isSpotify 
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-primary/10 text-primary hover:bg-primary/20'
      }`}
    >
      {isYouTube ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      ) : isSpotify ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      ) : (
        <ExternalLink className="w-4 h-4" />
      )}
      {isYouTube ? 'YouTube' : isSpotify ? 'Spotify' : 'Music Link'}
    </a>
  );
}

// Section Display Component
function PublicSectionDisplay({ section }: { section: DJMCSection }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Card className="border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
                <Music className="h-5 w-5" />
                {section.section_label}
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {section.notes && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground italic">
                Notes: {section.notes}
              </div>
            )}
            
            <div className="space-y-3">
              {section.items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${
                    idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                    {/* Row Label */}
                    <div className="font-medium text-primary min-w-[150px]">
                      {item.row_label}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      {item.value_text && (
                        <div className="text-foreground">{item.value_text}</div>
                      )}
                      
                      {item.song_title_artist && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="secondary" className="font-normal">
                            🎵 {item.song_title_artist}
                          </Badge>
                        </div>
                      )}
                      
                      {item.duration && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {item.duration}
                        </div>
                      )}
                    </div>
                    
                    {/* Music Link */}
                    {item.music_url && isValidUrl(item.music_url) && (
                      <div className="flex-shrink-0">
                        <MusicLinkButton url={item.music_url} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {section.items.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No items in this section
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function DJMCPublicView() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicQuestionnaireData | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        const { data: result, error: fetchError } = await supabase.rpc(
          'get_dj_mc_questionnaire_by_token',
          { share_token: token }
        );

        if (fetchError) {
          console.error('Error fetching questionnaire:', fetchError);
          setError('This link is invalid or has expired');
          setLoading(false);
          return;
        }

        if (!result || result.length === 0) {
          setError('This link is invalid or has expired');
          setLoading(false);
          return;
        }

        const row = result[0];
        
        // Parse sections from JSON
        const parsedSections = (row.sections as unknown as DJMCSection[]) || [];
        
        setData({
          questionnaire_id: row.questionnaire_id,
          event_id: row.event_id,
          event_name: row.event_name,
          event_date: row.event_date,
          event_venue: row.event_venue,
          start_time: (row as any).start_time || null,
          finish_time: (row as any).finish_time || null,
          ceremony_date: (row as any).ceremony_date || null,
          ceremony_venue: (row as any).ceremony_venue || null,
          ceremony_start_time: (row as any).ceremony_start_time || null,
          ceremony_finish_time: (row as any).ceremony_finish_time || null,
          permission: row.permission as 'view_only' | 'can_edit',
          sections: parsedSections,
        });
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load questionnaire');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleDownloadPDF = async () => {
    if (!data) return;
    setDownloadingPDF(true);
    try {
      const eventData = {
        id: data.event_id,
        name: data.event_name,
        date: data.event_date,
        venue: data.event_venue,
        start_time: data.start_time,
        finish_time: data.finish_time,
        ceremony_date: data.ceremony_date,
        ceremony_venue: data.ceremony_venue,
        ceremony_start_time: data.ceremony_start_time,
        ceremony_finish_time: data.ceremony_finish_time,
      };
      const questionnaireData = {
        id: data.questionnaire_id,
        sections: data.sections,
      };
      await exportEntireQuestionnairePDF(questionnaireData as any, eventData);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading questionnaire...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Link Unavailable</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact the person who shared this link with you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 print:static">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Music className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{data.event_name}</h1>
                <p className="text-sm text-muted-foreground">DJ-MC Questionnaire</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 print:hidden">
              <span className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-full border-2 border-red-500 text-red-500 bg-transparent">
                View Only
              </span>
              <button
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-full border-2 border-green-500 text-green-600 bg-transparent hover:bg-green-50 transition-colors disabled:opacity-50"
              >
                {downloadingPDF ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {downloadingPDF ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Event Info Banner */}
      <div className="bg-primary/5 border-b border-primary/10 print:bg-transparent">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            {data.event_date && (
              <div className="flex items-center gap-2 text-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                {formatFullDate(data.event_date)}
              </div>
            )}
            {data.event_venue && (
              <div className="flex items-center gap-2 text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                {data.event_venue}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {data.sections.map((section) => (
            <PublicSectionDisplay key={section.id} section={section} />
          ))}
          
          {data.sections.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sections have been added to this questionnaire yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 print:border-0">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <a href="https://www.weddingwaitress.com" target="_blank" rel="noopener noreferrer" className="inline-block mb-2">
            <img 
              src="/wedding-waitress-share-logo.png" 
              alt="Wedding Waitress" 
              className="h-10 mx-auto"
            />
          </a>
          <a href="https://www.weddingwaitress.com" target="_blank" rel="noopener noreferrer" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">
            Powered by Wedding Waitress
          </a>
        </div>
      </footer>
    </div>
  );
}
