import React, { useState } from 'react';
import { Button } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Event } from '@/hooks/useEvents';

interface PartnerNamesInlineProps {
  event: Event;
  onUpdate: (updatedEvent: Event) => void;
}

export const PartnerNamesInline: React.FC<PartnerNamesInlineProps> = ({ 
  event, 
  onUpdate 
}) => {
  const [editingInline, setEditingInline] = useState(false);
  const [inlineName1, setInlineName1] = useState(event.partner1_name || '');
  const [inlineName2, setInlineName2] = useState(event.partner2_name || '');
  const [modalName1, setModalName1] = useState(event.partner1_name || '');
  const [modalName2, setModalName2] = useState(event.partner2_name || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasPartnerNames = event.partner1_name && event.partner2_name;

  const savePartnerNames = async (name1: string, name2: string, isModal = false) => {
    if (!name1.trim() || !name2.trim()) {
      toast({
        title: "Both names are required",
        description: "Please enter both names before saving.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({
          partner1_name: name1.trim(),
          partner2_name: name2.trim()
        })
        .eq('id', event.id);

      if (error) {
        console.error('Error updating partner names:', error);
        toast({
          title: "Error saving names",
          description: "Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Update the event object
      const updatedEvent = {
        ...event,
        partner1_name: name1.trim(),
        partner2_name: name2.trim()
      };
      
      onUpdate(updatedEvent);
      
      if (isModal) {
        setIsModalOpen(false);
      } else {
        setEditingInline(false);
      }
      
      toast({
        title: "Names saved successfully"
      });
    } catch (error) {
      console.error('Error saving partner names:', error);
      toast({
        title: "Error saving names",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInlineSave = () => {
    savePartnerNames(inlineName1, inlineName2, false);
  };

  const handleModalSave = () => {
    savePartnerNames(modalName1, modalName2, true);
  };

  const startEditing = () => {
    setInlineName1(event.partner1_name || '');
    setInlineName2(event.partner2_name || '');
    setEditingInline(true);
  };

  const openModal = () => {
    setModalName1(event.partner1_name || '');
    setModalName2(event.partner2_name || '');
    setIsModalOpen(true);
  };

  // If names are missing, show inline editing inputs
  if (!hasPartnerNames || editingInline) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Input
            placeholder="Name 1"
            value={inlineName1}
            onChange={(e) => setInlineName1(e.target.value)}
            className="w-full sm:w-32"
            disabled={saving}
          />
          <Input
            placeholder="Name 2"
            value={inlineName2}
            onChange={(e) => setInlineName2(e.target.value)}
            className="w-full sm:w-32"
            disabled={saving}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={handleInlineSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {hasPartnerNames && editingInline && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setEditingInline(false)}
              disabled={saving}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  // If names exist, show display view with edit button
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
        <span className="text-sm text-muted-foreground">This event is for</span>
        <span className="text-sm font-semibold text-primary">
          {event.partner1_name} & {event.partner2_name}
        </span>
      </div>
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button 
            size="sm" 
            variant="outline"
            onClick={openModal}
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Who is this event for?</DialogTitle>
            <DialogDescription>
              Enter the two names of the people getting married or engaged. For birthdays/other events, you can enter the same name twice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name 1</label>
              <Input
                value={modalName1}
                onChange={(e) => setModalName1(e.target.value)}
                placeholder="Enter first name"
                disabled={saving}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Name 2</label>
              <Input
                value={modalName2}
                onChange={(e) => setModalName2(e.target.value)}
                placeholder="Enter second name"
                disabled={saving}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleModalSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};