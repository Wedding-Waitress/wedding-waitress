/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * The Guest List page feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break guest list management
 * - Changes could break bulk actions and RSVP workflows
 * - Changes could break real-time synchronisation
 *
 * Last locked: 2026-02-19
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/enhanced-button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings } from "lucide-react";
import { CustomRoleManager } from './CustomRoleManager';

interface RelationSettings {
  relation_required: boolean;
  relation_allow_custom_role: boolean;
  relation_allow_single_partner: boolean;
  relation_disable_first_guest_alert: boolean;
  custom_roles?: string[];
}

interface RelationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSettingsUpdate: (settings: RelationSettings) => void;
}

export const RelationSettingsModal: React.FC<RelationSettingsModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onSettingsUpdate,
}) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<RelationSettings>({
    relation_required: true,
    relation_allow_custom_role: false,
    relation_allow_single_partner: true,
    relation_disable_first_guest_alert: false,
    custom_roles: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchSettings();
    }
  }, [isOpen, eventId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('relation_required, relation_allow_custom_role, relation_allow_single_partner, relation_disable_first_guest_alert, custom_roles')
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
        return;
      }

      if (data) {
        setSettings({
          relation_required: data.relation_required ?? true,
          relation_allow_custom_role: data.relation_allow_custom_role ?? false,
          relation_allow_single_partner: data.relation_allow_single_partner ?? true,
          relation_disable_first_guest_alert: data.relation_disable_first_guest_alert ?? false,
          custom_roles: Array.isArray(data.custom_roles) ? data.custom_roles as string[] : [],
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('events')
        .update(settings)
        .eq('id', eventId);

      if (error) {
        console.error('Error updating settings:', error);
        toast({
          title: "Error",
          description: "Failed to update Relation settings",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Relation settings updated successfully",
      });

      onSettingsUpdate(settings);
      onClose();
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof RelationSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Relation Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="required">Require "Relation" on Add/Edit Guest</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, guests must have a partner and role assigned
              </p>
            </div>
            <Switch
              id="required"
              checked={settings.relation_required}
              onCheckedChange={(checked) => updateSetting('relation_required', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="custom-role">Allow custom role text</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, users can enter custom roles beyond the predefined list
              </p>
            </div>
            <Switch
              id="custom-role"
              checked={settings.relation_allow_custom_role}
              onCheckedChange={(checked) => updateSetting('relation_allow_custom_role', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="single-partner">Allow single-partner events</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, events with only one partner name still show Relation options
              </p>
            </div>
            <Switch
              id="single-partner"
              checked={settings.relation_allow_single_partner}
              onCheckedChange={(checked) => updateSetting('relation_allow_single_partner', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="disable-alert">Disable first-guest alert</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, skip the partner name validation for the first guest
              </p>
            </div>
            <Switch
              id="disable-alert"
              checked={settings.relation_disable_first_guest_alert}
              onCheckedChange={(checked) => updateSetting('relation_disable_first_guest_alert', checked)}
            />
          </div>

          {/* Custom Role Manager - only show when custom roles are enabled */}
          {settings.relation_allow_custom_role && (
            <CustomRoleManager
              eventId={eventId}
              customRoles={settings.custom_roles || []}
              onRolesUpdate={(roles) => setSettings(prev => ({ ...prev, custom_roles: roles }))}
            />
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="default" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Settings button component for the UI
interface RelationSettingsButtonProps {
  eventId: string;
  onSettingsUpdate: (settings: RelationSettings) => void;
}

export const RelationSettingsButton: React.FC<RelationSettingsButtonProps> = ({
  eventId,
  onSettingsUpdate,
}) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowModal(true)}
        className="h-6 w-6 p-0"
        title="Relation Settings"
      >
        <Settings className="w-4 h-4" />
      </Button>

      <RelationSettingsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        eventId={eventId}
        onSettingsUpdate={onSettingsUpdate}
      />
    </>
  );
};

export type { RelationSettings };