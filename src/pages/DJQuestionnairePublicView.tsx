import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Lock, ExternalLink, Music, Calendar, MapPin } from 'lucide-react';
import { ItemType } from '@/types/djQuestionnaire';
import { formatDisplayDate } from '@/lib/utils';

interface QuestionnaireData {
  questionnaire_id: string;
  event_id: string;
  event_name: string;
  event_date: string;
  template_type: string;
  status: string;
  approved_at: string | null;
  approved_by_name: string | null;
  header_overrides: Record<string, any>;
  section_id: string;
  section_label: string;
  section_sort_index: number;
  item_id: string;
  item_type: ItemType;
  item_prompt: string;
  item_sort_index: number;
  answer_value: any;
}

interface Section {
  id: string;
  label: string;
  sort_index: number;
  items: {
    id: string;
    type: ItemType;
    prompt: string;
    sort_index: number;
    value: any;
  }[];
}

export function DJQuestionnairePublicView() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);
  const [acknowledgerName, setAcknowledgerName] = useState('');
  const [questionnaire, setQuestionnaire] = useState<{
    id: string;
    eventName: string;
    eventDate: string;
    status: string;
    approvedAt: string | null;
    approvedBy: string | null;
    headerOverrides: Record<string, any>;
    sections: Section[];
  } | null>(null);

  useEffect(() => {
    fetchQuestionnaire();
  }, [token]);

  const fetchQuestionnaire = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_questionnaire_by_token', {
        _share_token: token,
      });

      if (error) throw error;
      if (!data || data.length === 0) {
        toast({
          title: 'Invalid Link',
          description: 'This questionnaire link is invalid or has expired.',
          variant: 'destructive',
        });
        return;
      }

      // Transform flat data into nested structure
      const firstRow = data[0] as QuestionnaireData;
      const sectionsMap = new Map<string, Section>();

      data.forEach((row: QuestionnaireData) => {
        if (!row.section_id) return;

        if (!sectionsMap.has(row.section_id)) {
          sectionsMap.set(row.section_id, {
            id: row.section_id,
            label: row.section_label,
            sort_index: row.section_sort_index,
            items: [],
          });
        }

        if (row.item_id) {
          const section = sectionsMap.get(row.section_id)!;
          section.items.push({
            id: row.item_id,
            type: row.item_type,
            prompt: row.item_prompt,
            sort_index: row.item_sort_index,
            value: row.answer_value,
          });
        }
      });

      const sections = Array.from(sectionsMap.values()).sort(
        (a, b) => a.sort_index - b.sort_index
      );

      sections.forEach((section) => {
        section.items.sort((a, b) => a.sort_index - b.sort_index);
      });

      setQuestionnaire({
        id: firstRow.questionnaire_id,
        eventName: firstRow.event_name,
        eventDate: firstRow.event_date,
        status: firstRow.status,
        approvedAt: firstRow.approved_at,
        approvedBy: firstRow.approved_by_name,
        headerOverrides: firstRow.header_overrides,
        sections,
      });
    } catch (error: any) {
      console.error('Error fetching questionnaire:', error);
      toast({
        title: 'Error',
        description: 'Failed to load questionnaire. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!token) return;

    try {
      setAcknowledging(true);

      const response = await supabase.functions.invoke('acknowledge-dj-questionnaire', {
        body: {
          shareToken: token,
          acknowledgerName: acknowledgerName.trim() || 'Anonymous',
        },
      });

      if (response.error) throw response.error;

      const { success, approvedAt, approvedBy, alreadyApproved } = response.data;

      if (success) {
        toast({
          title: alreadyApproved ? 'Already Approved' : 'Questionnaire Approved',
          description: alreadyApproved
            ? 'This questionnaire was already approved.'
            : 'Thank you for your acknowledgment!',
        });

        // Refresh to show approval status
        if (!alreadyApproved) {
          setQuestionnaire((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'approved',
                  approvedAt,
                  approvedBy,
                }
              : null
          );
        }
      }
    } catch (error: any) {
      console.error('Acknowledgment error:', error);
      toast({
        title: 'Error',
        description: 'Failed to acknowledge questionnaire. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAcknowledging(false);
    }
  };

  const renderValue = (type: ItemType, value: any) => {
    if (!value) return <span className="text-muted-foreground">Not provided</span>;

    switch (type) {
      case 'song_row':
        const { song, artist, link } = value;
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-primary" />
              <span className="font-medium">{song || 'N/A'}</span>
            </div>
            {artist && <div className="text-sm text-muted-foreground">by {artist}</div>}
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Listen
              </a>
            )}
          </div>
        );

      case 'bridal_party_row':
        const { groupName, type: partyType, entranceSong } = value;
        return (
          <div className="space-y-1">
            <div className="font-medium">{groupName || 'N/A'}</div>
            {partyType && <div className="text-sm text-muted-foreground">{partyType}</div>}
            {entranceSong && (
              <div className="text-sm">
                <Music className="w-3 h-3 inline mr-1" />
                {entranceSong}
              </div>
            )}
          </div>
        );

      case 'speech_row':
        return (
          <div>
            {value.name} {value.order && `(Order: ${value.order})`}
          </div>
        );

      case 'pronunciation_row':
        return (
          <div className="space-y-1">
            <div>
              <span className="font-medium">{value.name}</span>
              {value.role && <span className="text-muted-foreground"> - {value.role}</span>}
            </div>
            {value.phonetic && (
              <div className="text-sm text-muted-foreground">Phonetic: {value.phonetic}</div>
            )}
          </div>
        );

      case 'announcement_row':
        return (
          <div className="space-y-1">
            <div className="font-medium">{value.announcement}</div>
            {value.cue && <div className="text-sm text-muted-foreground">Time/Cue: {value.cue}</div>}
            {value.notes && <div className="text-sm text-muted-foreground">{value.notes}</div>}
          </div>
        );

      case 'cultural_row':
        return (
          <div className="space-y-1">
            <div className="font-medium">{value.tradition}</div>
            {value.songArtist && <div className="text-sm">Song: {value.songArtist}</div>}
            {value.whenToPlay && (
              <div className="text-sm text-muted-foreground">When: {value.whenToPlay}</div>
            )}
          </div>
        );

      case 'toggle':
        return <span>{value ? 'Yes' : 'No'}</span>;

      case 'list':
        return Array.isArray(value) ? (
          <ul className="list-disc list-inside space-y-1">
            {value.map((item: string, idx: number) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        ) : (
          <span>{value}</span>
        );

      default:
        return <span>{typeof value === 'object' ? JSON.stringify(value) : value}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading questionnaire...</p>
        </div>
      </div>
    );
  }

  if (!questionnaire) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Questionnaire Not Found</h2>
          <p className="text-muted-foreground">
            This link is invalid or has expired. Please contact the event organizer.
          </p>
        </Card>
      </div>
    );
  }

  const isApproved = questionnaire.status === 'approved';

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">DJ & MC Questionnaire</h1>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">{questionnaire.eventName}</span>
                </div>
                {questionnaire.eventDate && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{formatDisplayDate(questionnaire.eventDate)}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                🔒 Read-only view • No login required
              </div>
            </div>
          </div>
        </Card>

        {/* Approval Status */}
        {isApproved && questionnaire.approvedAt && (
          <Card className="p-4 mb-6 bg-success/10 border-success/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-success" />
              <div>
                <div className="font-medium text-success">Approved</div>
                <div className="text-sm text-muted-foreground">
                  Acknowledged on {new Date(questionnaire.approvedAt).toLocaleString()}
                  {questionnaire.approvedBy && ` by ${questionnaire.approvedBy}`}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Sections */}
        <div className="space-y-6">
          {questionnaire.sections.map((section) => (
            <Card key={section.id} className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-primary">📋</span>
                {section.label}
              </h2>
              <div className="space-y-4">
                {section.items.map((item) => (
                  <div key={item.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      {item.prompt}
                    </div>
                    <div className="text-foreground">{renderValue(item.type, item.value)}</div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Acknowledgment Section */}
        {!isApproved && (
          <Card className="p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Acknowledge & Approve</h2>
            <p className="text-muted-foreground text-sm mb-4">
              By clicking "Acknowledge & Approve", you confirm that you have reviewed all the
              information above and acknowledge the requirements for this event.
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Your Name (Optional)</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={acknowledgerName}
                  onChange={(e) => setAcknowledgerName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <Button
                onClick={handleAcknowledge}
                disabled={acknowledging}
                className="w-full"
                size="lg"
              >
                {acknowledging ? 'Processing...' : '✓ Acknowledge & Approve'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
