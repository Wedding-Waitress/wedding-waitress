import React, { useState } from 'react';
import { Music, Share2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StandardEventSelector } from '../StandardEventSelector';
import { DJMCQuestionnaireSection } from './DJMCQuestionnaireSection';
import { DJMCProgressIndicator } from './DJMCProgressIndicator';
import { DJMCShareModal } from './DJMCShareModal';
import { useDJMCQuestionnaire } from '@/hooks/useDJMCQuestionnaire';
import { useEvents } from '@/hooks/useEvents';

export function DJMCQuestionnairePage() {
  const { events } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const {
    questionnaire,
    loading,
    saving,
    shareTokens,
    updateSection,
    updateItem,
    addItem,
    deleteItem,
    duplicateItem,
    reorderItems,
    resetSectionToDefault,
    generateShareToken,
    deleteShareToken,
    calculateProgress,
  } = useDJMCQuestionnaire(selectedEventId);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const progress = calculateProgress();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Music className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">DJ-MC Questionnaire</h1>
            <p className="text-sm text-muted-foreground">
              Plan your music and entertainment details
            </p>
          </div>
        </div>

        {saving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </div>
        )}
      </div>

      {/* Event Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <StandardEventSelector
                events={events}
                selectedEventId={selectedEventId}
                onEventSelect={setSelectedEventId}
                placeholder="Select an event to manage..."
              />
            </div>

            {selectedEventId && questionnaire && (
              <div className="flex items-center gap-4">
                <DJMCProgressIndicator progress={progress} />
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShareModal(true)}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>

                <Button variant="outline" size="sm" disabled>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {!selectedEventId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select an event to start planning your music and entertainment</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading questionnaire...</p>
          </CardContent>
        </Card>
      ) : questionnaire ? (
        <div className="space-y-4">
          {/* Event header */}
          {selectedEvent && (
            <div className="text-center py-4 border-b border-border">
              <h2 className="text-xl font-semibold text-primary">{selectedEvent.name}</h2>
              {selectedEvent.date && (
                <p className="text-sm text-muted-foreground">
                  {selectedEvent.date} {selectedEvent.venue && `• ${selectedEvent.venue}`}
                </p>
              )}
            </div>
          )}

          {/* Sections */}
          {questionnaire.sections.map((section) => (
            <DJMCQuestionnaireSection
              key={section.id}
              section={section}
              onUpdateSection={(updates) => updateSection(section.id, updates)}
              onUpdateItem={(itemId, updates) => updateItem(itemId, updates)}
              onAddItem={() => addItem(section.id)}
              onDeleteItem={(itemId) => deleteItem(itemId)}
              onDuplicateItem={(item) => duplicateItem(item)}
              onReorderItems={(items) => reorderItems(section.id, items)}
              onResetToDefault={() => resetSectionToDefault(section.id)}
            />
          ))}
        </div>
      ) : null}

      {/* Share Modal */}
      <DJMCShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        shareTokens={shareTokens}
        onGenerateToken={generateShareToken}
        onDeleteToken={deleteShareToken}
      />
    </div>
  );
}
