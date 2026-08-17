/**
 * ⚠️ PRODUCTION-READY — LOCKED FOR PRODUCTION ⚠️
 * 
 * This Guest List Management feature is COMPLETE and APPROVED for production use.
 * 
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break real-time guest synchronization
 * - Changes could break RSVP normalization
 * - Changes could break relation tracking
 * - Changes could break bulk operations
 * - Changes could break security validation
 * 
 * See: MY_EVENTS_TABLES_GUESTLIST_SPECS.md for full specifications
 * 
 * Last locked: 2025-11-12
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx-js-style';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Users,
  Calendar,
  Edit,
  Trash2,
  ChevronDown,
  ArrowUpDown,
  Download,
  Upload,
  FileText,
  Search,
  Mail,
  Phone,
  UserRound,
  Hash,
  User,
  Heart,
  ListOrdered,
  UsersRound,
  Settings2,
  CalendarDays,
  HeartHandshake,
  ClipboardCheck,
  Contact,
  UserPlus,
  Link2,
  Save,
  Pencil,
  FileUp,
  FileDown,
  MapPin
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useEvents } from '@/hooks/useEvents';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useTables } from '@/hooks/useTables';
import { GuestIntelligencePanel } from './GuestIntelligence/GuestIntelligencePanel';
import { AddGuestModal } from './AddGuestModal';
import { GuestDeleteConfirmationModal } from './GuestDeleteConfirmationModal';

import { RelationBadge } from './RelationBadge';
import { supabase } from "@/integrations/supabase/client";
import { getRsvpBadgeVariant, getRsvpDisplayLabel } from "@/lib/rsvp";
import { formatDisplayDate } from '@/lib/utils';
import { RELATION_ROLE_LABELS, computeRelationDisplay } from "@/lib/relationUtils";
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { ImportErrorModal } from './ImportErrorModal';
import { GuestLimitDialog } from './GuestLimitDialog';
import { whoIsAnalytics } from '@/lib/analytics';
import { GuestBulkActionsBar } from './GuestBulkActionsBar';
import { BulkTableAssignmentModal } from './BulkTableAssignmentModal';
import { BulkRsvpUpdateModal } from './BulkRsvpUpdateModal';
import { SendRsvpConfirmModal } from './SendRsvpConfirmModal';
import { RsvpActivationModal } from './RsvpActivationModal';
import { RsvpAlreadyPaidModal } from './RsvpAlreadyPaidModal';
import { RsvpOverageModal } from './RsvpOverageModal';
import { ResendSmartRsvpModal } from './ResendSmartRsvpModal';
import { SmartSmsCreditStatus, getCreditHealth } from './SmartSmsCreditStatus';
import { useSmsCredits } from '@/hooks/useSmsCredits';
import { SmartRsvpFeatureStrip } from './SmartRsvpFeatureStrip';
import { SmartRsvpAnalyticsPanel } from './SmartRsvpAnalyticsPanel';
import { GuestDeliveryBadges } from './GuestDeliveryBadges';
import { useSearchParams } from 'react-router-dom';
import { toast as sonnerToast } from 'sonner';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useRsvpInvites } from '@/hooks/useRsvpInvites';
import { useRsvpPurchase, getTierMaxFromLabel } from '@/hooks/useRsvpPurchase';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import styles from './GuestListTable.module.css';
import { AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  validateRelationFields, 
  normalizePartner, 
  normalizeRole, 
  ImportError 
} from '@/lib/relationValidation';

type SortOption =
  | 'first_name' | 'last_name' | 'table_name'
  | 'individuals_first' | 'couples_first' | 'families_first'
  | 'default';

const SORT_OPTIONS = [
  { value: 'first_name', label: 'First Name', icon: UserRound },
  { value: 'last_name', label: 'Last Name', icon: UserRound },
  { value: 'table_name', label: 'Table No.', icon: Hash },
  { value: 'individuals_first', label: 'Individual', icon: User },
  { value: 'couples_first', label: 'Couple', icon: Heart },
  { value: 'families_first', label: 'Family', icon: Users },
  { value: 'default', label: 'Default', icon: ListOrdered },
] as const;

// Template headers (no who_is_display as it's computed)
const IMPORT_TEMPLATE_HEADERS = [
  'first_name', 'last_name', 'table_name', 'seat_no',
  'rsvp', 'dietary', 'mobile', 'email', 'notes', 
  'relation_partner', 'relation_role'
];

// Export headers (internal keys)
const EXPORT_HEADERS = [
  'first_name', 'last_name', 'table_name', 'seat_no',
  'rsvp', 'dietary', 'mobile', 'email', 'notes', 
  'relation_partner', 'relation_role', 'relation_display'
];

// Display export headers (Title Case for XLSX output)
const DISPLAY_EXPORT_HEADERS = [
  'First Name', 'Last Name', 'Table Name', 'Seat No',
  'RSVP', 'Dietary', 'Mobile', 'Email', 'Notes',
  'Relation Partner', 'Relation Role', 'Relation Display'
];

const DIETARY_OPTIONS = [
  'None', 'Kids Meal', 'Pescatarian', 'Vegetarian', 'Vegan', 'Seafood Free', 'Gluten Free', 
  'Dairy Free', 'Nut Free', 'Halal', 'Kosha', 'Vendor'
];

const RSVP_OPTIONS = ['Pending', 'Attending', 'Not Attending'];

interface GuestListTableProps {
  selectedEventId?: string | null;
  onEventSelect?: (eventId: string) => void;
}

interface RelationSettings {
  relation_required: boolean;
  relation_allow_custom_role: boolean;
  relation_allow_single_partner: boolean;
  relation_disable_first_guest_alert: boolean;
  custom_roles?: string[];
}

export const GuestListTable: React.FC<GuestListTableProps> = ({ 
  selectedEventId: propSelectedEventId, 
  onEventSelect: propOnEventSelect 
}) => {
  const { events, loading, updateEvent } = useEvents();
  const [localSelectedEventId, setLocalSelectedEventId] = useState<string | null>(null);
  
  // Use prop selectedEventId if provided, otherwise use local state
  const selectedEventId = propSelectedEventId !== undefined ? propSelectedEventId : localSelectedEventId;
  const [showAddModal, setShowAddModal] = useState(false);
  const [allowGuestPlusOnes, setAllowGuestPlusOnes] = useState(false);
  const [collectGuestAddresses, setCollectGuestAddresses] = useState(false);
  const { guests, loading: guestsLoading, deleteGuest, refetchGuests, updateGuest } = useRealtimeGuests(selectedEventId);
  // Mobile-only: locally acknowledged +1 alerts so highlight clears instantly
  // before the backend [NEW+] strip lands via realtime.
  const [ackedPlusOneIds, setAckedPlusOneIds] = useState<Set<string>>(new Set());
  const acknowledgePlusOneOptimistic = (guest: any) => {
    if (!guest?.notes?.startsWith('[NEW+]')) return;
    setAckedPlusOneIds(prev => {
      if (prev.has(guest.id)) return prev;
      const next = new Set(prev);
      next.add(guest.id);
      return next;
    });
    const cleanedNotes = guest.notes.replace(/^\[NEW\+\]/, '');
    // Fire-and-forget background update; UI already cleared optimistically.
    Promise.resolve(updateGuest(guest.id, { notes: cleanedNotes })).catch(() => {});
  };
  // Keep local ack set in sync with realtime backend state — drop ids whose
  // notes no longer carry the [NEW+] marker so the set never holds stale ids.
  useEffect(() => {
    setAckedPlusOneIds(prev => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set(prev);
      guests.forEach(g => {
        if (!g.notes?.startsWith('[NEW+]') && next.has(g.id)) {
          next.delete(g.id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [guests]);
  const { tables, fetchTables } = useTables(selectedEventId);
  const [editingGuest, setEditingGuest] = useState<any>(null);
  const [guestToDelete, setGuestToDelete] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [showNamesValidation, setShowNamesValidation] = useState(false);
  const [relationSettings, setRelationSettings] = useState<RelationSettings>({
    relation_required: true,
    relation_allow_custom_role: false,
    relation_allow_single_partner: true,
    relation_disable_first_guest_alert: false,
  });
  const [showImportErrors, setShowImportErrors] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [importStats, setImportStats] = useState({ total: 0, successful: 0 });
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  const [partnerNamesSaved, setPartnerNamesSaved] = useState(false);
  const [useDefaultNames, setUseDefaultNames] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [firstGuestAdded, setFirstGuestAdded] = useState(false);
  type RelationMode = 'two' | 'single' | 'off';
  const [relationMode, setRelationMode] = useState<RelationMode>('two');
  const [eventType, setEventType] = useState<'two' | 'single'>('two');
  const [relationsHidden, setRelationsHidden] = useState(false);
  const [showRelationSaved, setShowRelationSaved] = useState(false);
  const [partner1Name, setPartner1Name] = useState('');
  const [partner2Name, setPartner2Name] = useState('');
  
  // Bulk selection state
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [showBulkTableModal, setShowBulkTableModal] = useState(false);
  const [showBulkRsvpModal, setShowBulkRsvpModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showAlreadyPaidModal, setShowAlreadyPaidModal] = useState(false);
  const [showOverageModal, setShowOverageModal] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);
  const [showIntelligencePanel, setShowIntelligencePanel] = useState(false);
  const [sendChannel, setSendChannel] = useState<'email' | 'sms'>('email');
  const { sendEmailInvites, sendSmsInvites, sending } = useRsvpInvites();
  const { credits: smsCredits } = useSmsCredits(selectedEventId);
  const smsHealth = getCreditHealth(smsCredits.remaining, smsCredits.total);
  const smsEmpty = smsHealth.state === 'empty';
  const smsLowCredit = smsHealth.state === 'critical' || smsHealth.state === 'empty';
  const { hasPurchased: hasRsvpPurchase, purchase: rsvpPurchase, loading: rsvpPurchaseLoading, totalCapacity: rsvpTotalCapacity, refetch: refetchRsvpPurchase } = useRsvpPurchase(selectedEventId);

  // RSVP payment-success return handler: close bulk modal, clear selection,
  // fire success toast + inline banner, refresh allowance, and clean URL.
  const [searchParams, setSearchParams] = useSearchParams();
  const [rsvpSuccessBanner, setRsvpSuccessBanner] = useState<{
    guestCount: number;
    tierLabel: string;
    amount: number;
    ptype: 'rsvp' | 'rsvp_overage';
  } | null>(null);
  useEffect(() => {
    if (searchParams.get('payment') !== 'success') return;
    setBulkModalOpen(false);
    setSelectedGuestIds(new Set());

    let storedCount = 0;
    try { storedCount = Number(sessionStorage.getItem('ww:rsvpSelectedCount') || '0'); } catch {}
    const tierLabel = searchParams.get('tier') || '';
    const amount = Number(searchParams.get('amount') || '0');
    const ptype = (searchParams.get('ptype') as 'rsvp' | 'rsvp_overage') || 'rsvp';

    const summary = ptype === 'rsvp_overage'
      ? `${storedCount} extra guests • Add-on • $${amount.toFixed(2)} AUD`
      : `${storedCount} ${storedCount === 1 ? 'guest' : 'guests'} invited${tierLabel ? ` • ${tierLabel}` : ''} • $${amount.toFixed(2)} AUD`;

    sonnerToast.success('RSVP invitations sent successfully', {
      description: summary,
      duration: 6000,
      action: {
        label: 'View Responses',
        onClick: () => {
          try {
            document.getElementById('guest-list-table-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch {}
        },
      },
    });

    setRsvpSuccessBanner({ guestCount: storedCount, tierLabel, amount, ptype });
    // Auto-hide inline banner after ~8s.
    const t = window.setTimeout(() => setRsvpSuccessBanner(null), 8000);

    refetchRsvpPurchase?.();

    const next = new URLSearchParams();
    const tab = searchParams.get('tab');
    if (tab) next.set('tab', tab);
    setSearchParams(next, { replace: true });
    try { sessionStorage.removeItem('ww:rsvpSelectedCount'); } catch {}
    try { sessionStorage.removeItem('ww:returnTab'); } catch {}

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  
  // Pagination state
  const GUESTS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);

  // Guest limit dialog state
  const [showGuestLimitDialog, setShowGuestLimitDialog] = useState(false);
  const [guestLimitDialogVariant, setGuestLimitDialogVariant] = useState<'congratulations' | 'exceeded'>('exceeded');
  const guestLimitCongratulationsShownRef = React.useRef(false);
  // Selection handlers
  const handleSelectGuest = (guestId: string, checked: boolean) => {
    setSelectedGuestIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(guestId);
      } else {
        newSet.delete(guestId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedGuestIds.size === sortedGuests.length) {
      setSelectedGuestIds(new Set());
    } else {
      setSelectedGuestIds(new Set(sortedGuests.map(g => g.id)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedGuestIds(new Set());
  };

  // Bulk operations
  const handleBulkTableAssignment = async (tableId: string, assignSeats: boolean) => {
    try {
      const table = tables.find(t => t.id === tableId);
      const existingGuests = guests.filter(g => g.table_id === tableId);
      let nextSeatNo = assignSeats ? Math.max(0, ...existingGuests.map(g => g.seat_no || 0)) + 1 : null;

      for (const guestId of selectedGuestIds) {
        const update: any = {
          table_id: tableId,
          table_no: table?.table_no || null,
          assigned: true,
        };

        if (assignSeats && nextSeatNo !== null) {
          update.seat_no = nextSeatNo;
          nextSeatNo++;
        } else {
          update.seat_no = null;
        }

        await supabase
          .from('guests')
          .update(update)
          .eq('id', guestId);
      }

      toast({
        title: "Success",
        description: `${selectedGuestIds.size} guests assigned to ${table?.name || 'table'}`,
      });

      setSelectedGuestIds(new Set());
      setShowBulkTableModal(false);
      await refetchGuests();
    } catch (error) {
      console.error('Bulk table assignment error:', error);
      toast({
        title: "Error",
        description: "Failed to assign guests",
        variant: "destructive",
      });
    }
  };

  const handleBulkRsvpUpdate = async (newStatus: string) => {
    try {
      for (const guestId of selectedGuestIds) {
        await supabase
          .from('guests')
          .update({ rsvp: newStatus })
          .eq('id', guestId);
      }

      toast({
        title: "Success",
        description: `RSVP updated for ${selectedGuestIds.size} guests`,
      });

      setSelectedGuestIds(new Set());
      setShowBulkRsvpModal(false);
      await refetchGuests();
    } catch (error) {
      console.error('Bulk RSVP update error:', error);
      toast({
        title: "Error",
        description: "Failed to update RSVP",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const guestId of selectedGuestIds) {
        await deleteGuest(guestId);
      }

      toast({
        title: "Success",
        description: `${selectedGuestIds.size} guests deleted`,
      });

      setSelectedGuestIds(new Set());
      setShowBulkDeleteModal(false);
      await refetchGuests();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete guests",
        variant: "destructive",
      });
    }
  };

  // Handle relation mode change
  const handleRelationModeChange = async (newMode: RelationMode) => {
    if (!selectedEventId) return;

    // Set local state IMMEDIATELY for instant UI response
    setRelationMode(newMode);
    setShowRelationSaved(true);
    setTimeout(() => setShowRelationSaved(false), 2000);

    try {
      // Direct DB update only — no refetch, no toast. Realtime handles sync.
      const { error } = await supabase
        .from('events')
        .update({ relation_mode: newMode })
        .eq('id', selectedEventId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating relation mode:', error);
      
      // Revert local state if database update fails
      const selectedEvent = events.find(event => event.id === selectedEventId);
      const previousMode = (selectedEvent as any)?.relation_mode || 'two';
      setRelationMode(previousMode);
      
      toast({
        title: "Error",
        description: "Failed to update relation mode",
        variant: "destructive"
      });
    }
  };

  // Handle event type change (Box 2) - decoupled from hide relations toggle
  const handleEventTypeChange = async (newType: 'two' | 'single') => {
    if (!selectedEventId) return;
    setEventType(newType);
    setShowRelationSaved(true);
    setTimeout(() => setShowRelationSaved(false), 2000);

    // Only update DB if relations are visible
    if (!relationsHidden) {
      try {
        setRelationMode(newType);
        const { error } = await supabase
          .from('events')
          .update({ relation_mode: newType })
          .eq('id', selectedEventId);
        if (error) throw error;
      } catch (error) {
        console.error('Error updating event type:', error);
      }
    }
  };

  // Handle hide relations toggle (Box 3) - decoupled from event type
  const handleHideRelationsToggle = async (hidden: boolean) => {
    if (!selectedEventId) return;
    setRelationsHidden(hidden);
    const newMode: RelationMode = hidden ? 'off' : eventType;
    setRelationMode(newMode);
    setShowRelationSaved(true);
    setTimeout(() => setShowRelationSaved(false), 2000);

    try {
      const { error } = await supabase
        .from('events')
        .update({ relation_mode: newMode })
        .eq('id', selectedEventId);
      if (error) throw error;
      toast({
        title: "Success",
        description: hidden ? "Enabled relationships turned off" : "Enabled relationships turned on",
      });
    } catch (error) {
      console.error('Error updating relation visibility:', error);
      // Revert
      setRelationsHidden(!hidden);
      setRelationMode(hidden ? eventType : 'off');
    }
  };

  const getResolvedRelationDisplay = useCallback((guest: Pick<typeof guests[number], 'relation_partner' | 'relation_role' | 'relation_display'>, resolvedPartner1: string, resolvedPartner2: string) => {
    const computedDisplay = computeRelationDisplay(
      guest.relation_partner as any,
      guest.relation_role as any,
      resolvedPartner1,
      resolvedPartner2,
      relationSettings.custom_roles || []
    );

    return computedDisplay || guest.relation_display || '';
  }, [relationSettings.custom_roles]);

  const handleSavePartnerNames = async (nextPartner1Name?: string, nextPartner2Name?: string) => {
    if (!selectedEventId) return;

    const resolvedPartner1 = (nextPartner1Name ?? partner1Name).trim();
    const resolvedPartner2 = (nextPartner2Name ?? partner2Name).trim();

    const namesAreValid = relationsHidden
      ? true
      : eventType === 'two'
        ? Boolean(resolvedPartner1 && resolvedPartner2)
        : Boolean(resolvedPartner1);

    if (!namesAreValid) {
      setShowNamesValidation(true);
      setPartnerNamesSaved(false);
      return;
    }

    setIsSaving(true);

    try {
      // Update event partner names — the DB trigger automatically rebuilds
      // relation_display for all guests in this event
      await updateEvent(selectedEventId, { 
        partner1_name: resolvedPartner1,
        partner2_name: resolvedPartner2,
      });

      setShowRelationSaved(true);
      setTimeout(() => setShowRelationSaved(false), 2000);

      setPartner1Name(resolvedPartner1);
      setPartner2Name(resolvedPartner2);

      // Update local state so "Add Guest" button becomes active
      const bothFilled = relationsHidden
        ? true
        : eventType === 'two'
          ? (resolvedPartner1 && resolvedPartner2)
          : resolvedPartner1;

      if (bothFilled) {
        setPartnerNamesSaved(true);
        setShowNamesValidation(false);
        setHasUnsavedChanges(false);
      }

      // Refetch guests to pick up the trigger-updated relation_display values
      await refetchGuests();
    } catch (error) {
      console.error('Error saving partner names:', error);
      toast({
        title: "Error",
        description: "Failed to save partner names",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Selection persistence handled centrally by useSelectedEvent (Dashboard).
  // Sort preference for the standalone case is loaded when the user picks an event below.


  // Save sort preference when changed
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    if (selectedEventId) {
      localStorage.setItem(`guestSort_${selectedEventId}`, newSort);
    }
  };

  // Refresh both guests and tables to keep counts in sync
  const handleGuestSuccess = async () => {
    const previousGuestCount = guests.length;
    await Promise.all([refetchGuests(), fetchTables()]);
    
    // Clear names validation if this was the first guest added
    if (previousGuestCount === 0 && showNamesValidation) {
      setShowNamesValidation(false);
    }
    
    // Set first guest added flag when first guest is successfully added
    if (previousGuestCount === 0) {
      setFirstGuestAdded(true);
    }

    // Check if we just reached the guest limit (show congratulations once)
    const eventGuestLimit = selectedEvent?.guest_limit || 0;
    if (eventGuestLimit > 0 && !guestLimitCongratulationsShownRef.current) {
      // We need to re-check after refetch. Use a small delay to let state update.
      setTimeout(() => {
        // Re-read from DOM won't work, so we check optimistically:
        // previousGuestCount was below limit, and we just added at least 1
        const newCount = previousGuestCount + 1; // minimum addition
        if (newCount >= eventGuestLimit) {
          guestLimitCongratulationsShownRef.current = true;
          setGuestLimitDialogVariant('congratulations');
          setShowGuestLimitDialog(true);
        }
      }, 500);
    }
  };

  // Handle guest deletion with table count refresh
  const handleDeleteGuest = (guest: any) => {
    setGuestToDelete(guest);
    setShowDeleteModal(true);
  };

  // Handle confirmed guest deletion
  const handleConfirmDeleteGuest = async () => {
    if (!guestToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteGuest(guestToDelete.id);
      await fetchTables(); // Refresh table counts after deletion
      setShowDeleteModal(false);
      setGuestToDelete(null);
    } catch (error) {
      console.error('Error deleting guest:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setGuestToDelete(null);
  };

  // Selection change handler — delegates to parent (Dashboard) when wired,
  // otherwise updates local fallback state. Persistence is centralised in useSelectedEvent.
  const handleEventSelect = (eventId: string) => {
    if (eventId === "no-event") return;
    if (propOnEventSelect) {
      propOnEventSelect(eventId);
    } else {
      setLocalSelectedEventId(eventId);
    }
    
    // Load sort preference for new event
    const savedSort = localStorage.getItem(`guestSort_${eventId}`);
    if (savedSort && SORT_OPTIONS.some(opt => opt.value === savedSort)) {
      setSortBy(savedSort as SortOption);
    } else {
      setSortBy('first_name');
    }

    
    // Reset modal states when changing events 
    setShowAddModal(false);
    setEditingGuest(null);
    
    // Reset validation state
    setShowNamesValidation(false);
    
    // Reset partner names saved state
    setPartnerNamesSaved(false);
    setHasUnsavedChanges(false);
    setFirstGuestAdded(false);
    guestLimitCongratulationsShownRef.current = false;
    
    // Reset search
    setSearchTerm('');
  };

  // Get selected event
  const selectedEvent = events.find(event => event.id === selectedEventId);

  // Initialize partner names and relation mode when selected event changes
  useEffect(() => {
    if (selectedEvent) {
      // Initialize partner names from database - use defaults if empty
      setPartner1Name(selectedEvent.partner1_name || '');
      setPartner2Name(selectedEvent.partner2_name || '');
      const isUsingDefaultNames = !selectedEvent.partner1_name?.trim() || !selectedEvent.partner2_name?.trim()
        ? true
        : selectedEvent.partner1_name.trim() === 'Bride' && selectedEvent.partner2_name.trim() === 'Groom';
      setUseDefaultNames(isUsingDefaultNames);
      
      // Only update relationMode if database provides a valid value (two, single, or off)
      const modeFromDb = (selectedEvent as any)?.relation_mode;
      if (modeFromDb === 'off') {
        setRelationMode('off');
        setRelationsHidden(true);
        // Keep eventType as whatever it was (don't reset)
      } else if (modeFromDb === 'two' || modeFromDb === 'single') {
        setRelationMode(modeFromDb as RelationMode);
        setRelationsHidden(false);
        setEventType(modeFromDb as 'two' | 'single');
      } else {
        // Default to 'two' for truly invalid modes
        setRelationMode('two');
        setRelationsHidden(false);
        setEventType('two');
      }
      
      // Check if partner names are already saved
      const bothNamesFilled = selectedEvent.partner1_name?.trim() && selectedEvent.partner2_name?.trim();
      setPartnerNamesSaved(!!bothNamesFilled);
      setHasUnsavedChanges(false);
      
      // Check if first guest has been added
      const hasGuests = guests.length > 0;
      setFirstGuestAdded(hasGuests);

      // Sync Step 3 toggle from persisted event setting
      setAllowGuestPlusOnes(!!(selectedEvent as any)?.allow_guest_plus_ones);
      setCollectGuestAddresses(!!(selectedEvent as any)?.collect_guest_addresses);
    }
  }, [selectedEvent]); // Removed guests.length to prevent toggle reset

  // Persist Step 3 plus-one toggle to events table (optimistic + rollback)
  const handleAllowGuestPlusOnesChange = async (next: boolean) => {
    if (!selectedEventId) {
      toast({ title: "No event selected", description: "Please select an event first", variant: "destructive" });
      return;
    }
    const previous = allowGuestPlusOnes;
    setAllowGuestPlusOnes(next);
    try {
      await updateEvent(selectedEventId, { allow_guest_plus_ones: next } as any);
      toast({
        title: "Success",
        description: next ? "Allow guests to add +1 turned on" : "Allow guests to add +1 turned off",
      });
    } catch (err) {
      setAllowGuestPlusOnes(previous);
      toast({ title: "Couldn't save", description: "Failed to update plus-one setting. Please try again.", variant: "destructive" });
    }
  };

  // Persist Step 4 collect-guest-addresses toggle (optimistic + rollback)
  const handleCollectGuestAddressesChange = async (next: boolean) => {
    if (!selectedEventId) {
      toast({ title: "No event selected", description: "Please select an event first", variant: "destructive" });
      return;
    }
    const previous = collectGuestAddresses;
    setCollectGuestAddresses(next);
    try {
      await updateEvent(selectedEventId, { collect_guest_addresses: next } as any);
      toast({
        title: "Success",
        description: next ? "Guest mailing address collection turned on" : "Guest mailing address collection turned off",
      });
    } catch (err) {
      setCollectGuestAddresses(previous);
      toast({ title: "Couldn't save", description: "Failed to update mailing address setting. Please try again.", variant: "destructive" });
    }
  };

  // Helper function to get table name for a guest
  const getTableName = (guest: any) => {
    if (!guest.table_id) return null;
    const table = tables.find(t => t.id === guest.table_id);
    return table?.name || null;
  };

  // Helper function to check if a guest has a duplicate seat
  const isDuplicateSeat = useCallback((guest: any) => {
    if (!guest.seat_no || !guest.table_id) return false;
    
    const duplicates = guests.filter(g => 
      g.table_id === guest.table_id && 
      g.seat_no === guest.seat_no &&
      g.id !== guest.id
    );
    
    return duplicates.length > 0;
  }, [guests]);


  // Sort and filter guests based on selected option and search term
  // Group guests by family for visual display
  const groupedGuests = useMemo(() => {
    const groups: Array<{
      type: 'individual' | 'couple' | 'family';
      groupName: string | null;
      members: any[];
    }> = [];

    const familyMap = new Map<string, any[]>();
    const individuals: any[] = [];

    // First, sort all guests using the selected sortBy option
    const smartTableCompare = (nameA: string, nameB: string) => {
      const numA = nameA.match(/^(?:table\s+)?(\d+)$/i);
      const numB = nameB.match(/^(?:table\s+)?(\d+)$/i);
      const isNumA = !!numA;
      const isNumB = !!numB;
      if (isNumA && isNumB) return parseInt(numA![1]) - parseInt(numB![1]);
      if (isNumA && !isNumB) return 1; // numbered after named
      if (!isNumA && isNumB) return -1; // named before numbered
      return nameA.localeCompare(nameB);
    };

    const allSortedGuests = [...guests].sort((a, b) => {
      switch (sortBy) {
        case 'last_name':
          return (a.last_name || '').localeCompare(b.last_name || '');
        case 'table_name': {
          const tA = getTableName(a) || 'zzz';
          const tB = getTableName(b) || 'zzz';
          return smartTableCompare(tA, tB);
        }
        case 'default': {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateA - dateB;
        }
        case 'first_name':
        case 'individuals_first':
        case 'couples_first':
        case 'families_first':
        default:
          return (a.first_name || '').localeCompare(b.first_name || '');
      }
    });

    // Apply search filter
    const filtered = searchTerm
      ? allSortedGuests.filter(guest =>
          guest.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          guest.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          guest.family_group?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : allSortedGuests;

    // For first_name, last_name, table_name: flatten all guests into individual rows
    const shouldFlatten = sortBy === 'first_name' || sortBy === 'last_name' || sortBy === 'table_name';

    if (shouldFlatten) {
      filtered.forEach(guest => {
        groups.push({ type: 'individual', groupName: null, members: [guest] });
      });
    } else {
      // Group by family_group for individuals/couples/families sorts
      filtered.forEach(guest => {
        if (guest.family_group && guest.family_group.trim()) {
          if (!familyMap.has(guest.family_group)) {
            familyMap.set(guest.family_group, []);
          }
          familyMap.get(guest.family_group)!.push(guest);
        } else {
          individuals.push(guest);
        }
      });

      const inferGroupType = (name: string, count: number): 'couple' | 'family' => {
        if (name.endsWith(' Family')) return 'family';
        if (name.includes(' & ') || name.endsWith(' Couple')) return 'couple';
        return count >= 3 ? 'family' : 'couple';
      };

      familyMap.forEach((members, groupName) => {
        const type = inferGroupType(groupName, members.length);
        groups.push({ type, groupName, members });
      });

      individuals.forEach(guest => {
        groups.push({ type: 'individual', groupName: null, members: [guest] });
      });

      // Apply group-type ordering with secondary surname sort (skip for default sort)
      if (sortBy !== 'default') {
        const getOrderMap = () => {
          if (sortBy === 'individuals_first') return { individual: 0, couple: 1, family: 2 };
          if (sortBy === 'couples_first') return { couple: 0, family: 1, individual: 2 };
          if (sortBy === 'families_first') return { family: 0, couple: 1, individual: 2 };
          return { individual: 0, couple: 1, family: 2 };
        };
        const order = getOrderMap();
        groups.sort((a, b) => {
          const typeOrder = (order[a.type] ?? 9) - (order[b.type] ?? 9);
          if (typeOrder !== 0) return typeOrder;
          const surnameA = (a.members[0]?.last_name || '').toLowerCase();
          const surnameB = (b.members[0]?.last_name || '').toLowerCase();
          return surnameA.localeCompare(surnameB);
        });
      }
    }

    return groups;
  }, [guests, searchTerm, sortBy, tables, selectedEvent]);

  // Count total guests across all groups for pagination
  const totalFilteredGuestCount = useMemo(() => {
    return groupedGuests.reduce((sum, g) => sum + g.members.length, 0);
  }, [groupedGuests]);

  const totalPages = Math.max(1, Math.ceil(totalFilteredGuestCount / GUESTS_PER_PAGE));

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, sortBy, selectedEventId]);

  // Paginate groupedGuests by slicing members across groups
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * GUESTS_PER_PAGE;
    const end = start + GUESTS_PER_PAGE;
    let count = 0;
    const result: typeof groupedGuests = [];

    for (const group of groupedGuests) {
      const groupStart = count;
      const groupEnd = count + group.members.length;

      if (groupEnd <= start) { count = groupEnd; continue; }
      if (groupStart >= end) break;

      const sliceStart = Math.max(0, start - groupStart);
      const sliceEnd = Math.min(group.members.length, end - groupStart);
      result.push({ ...group, members: group.members.slice(sliceStart, sliceEnd) });
      count = groupEnd;
    }
    return result;
  }, [groupedGuests, currentPage]);

  // Create a map of family_group -> type for quick lookup
  const familyGroupTypeMap = useMemo(() => {
    const map = new Map<string, 'individual' | 'couple' | 'family'>();
    
    groupedGuests.forEach(group => {
      if (group.groupName) {
        map.set(group.groupName, group.type);
      }
    });
    
    return map;
  }, [groupedGuests]);

  // Helper function to get the type label for a guest
  const getGuestTypeLabel = (guest: any): string => {
    if (!guest.family_group) {
      return 'Individual';
    }
    
    const groupType = familyGroupTypeMap.get(guest.family_group);
    
    if (groupType === 'couple') {
      return 'Couple';
    } else if (groupType === 'family') {
      return 'Family';
    }
    
    return 'Individual'; // Fallback
  };

  const sortedGuests = useMemo(() => {
    if (!guests.length) return guests;
    
    // Filter guests by search term first
    const filtered = guests.filter(guest => {
      if (!searchTerm.trim()) return true;
      
      const searchLower = searchTerm.toLowerCase();
      const firstNameMatch = (guest.first_name || '').toLowerCase().includes(searchLower);
      const lastNameMatch = (guest.last_name || '').toLowerCase().includes(searchLower);
      
      return firstNameMatch || lastNameMatch;
    });
    
    const smartTableCompareExport = (nameA: string, nameB: string) => {
      const numA = nameA.match(/^(?:table\s+)?(\d+)$/i);
      const numB = nameB.match(/^(?:table\s+)?(\d+)$/i);
      const isNumA = !!numA;
      const isNumB = !!numB;
      if (isNumA && isNumB) return parseInt(numA![1]) - parseInt(numB![1]);
      if (isNumA && !isNumB) return 1;
      if (!isNumA && isNumB) return -1;
      return nameA.localeCompare(nameB);
    };

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'last_name':
          return (a.last_name || '').localeCompare(b.last_name || '');
        case 'table_name': {
          const tableA = getTableName(a) || 'zzz';
          const tableB = getTableName(b) || 'zzz';
          return smartTableCompareExport(tableA, tableB);
        }
        case 'first_name':
        case 'individuals_first':
        case 'couples_first':
        case 'families_first':
        default:
          return (a.first_name || '').localeCompare(b.first_name || '');
      }
    });
    
    return sorted;
  }, [guests, sortBy, tables, selectedEvent, searchTerm]);


  // CSV Functions
  const downloadTemplate = () => {
    const TEMPLATE_HEADERS = ['First Name', 'Last Name', 'Table Name', 'Seat No', 'RSVP', 'Dietary', 'Mobile', 'Email', 'Notes', 'Relation Partner', 'Relation Role'];
    const sampleData = [
      ['John', 'Doe', 'Table 1', 1, 'Attending', 'NA', '1234567890', 'john@example.com', 'Sample note', 'partner_one', 'father'],
      ['Jane', 'Smith', 'Table 2', 3, 'Pending', 'Vegan', '', 'jane@example.com', '', 'partner_two', 'bridal_party']
    ];
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...sampleData]);
    // Bold header row
    TEMPLATE_HEADERS.forEach((_, i) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
      if (!ws[cellRef]) ws[cellRef] = { v: TEMPLATE_HEADERS[i], t: 's' };
      ws[cellRef].s = { font: { bold: true } };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Guest-List-Import-Template.xlsx');
  };

  const exportGuestList = () => {
    if (!selectedEvent || !sortedGuests.length) return;
    
    const rows = sortedGuests.map(guest => [
      guest.first_name || '',
      guest.last_name || '',
      getTableName(guest) || '',
      guest.seat_no || '',
      guest.rsvp || 'Pending',
      guest.dietary || 'NA',
      guest.mobile || '',
      guest.email || '',
      guest.family_group || '',
      guest.relation_display || '',
      (guest.notes || '').replace(/^\[NEW\+\]/, '').replace(/\n/g, ' ')
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet([DISPLAY_EXPORT_HEADERS, ...rows]);
    // Bold header row
    DISPLAY_EXPORT_HEADERS.forEach((_, i) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
      if (!ws[cellRef]) ws[cellRef] = { v: DISPLAY_EXPORT_HEADERS[i], t: 's' };
      ws[cellRef].s = { font: { bold: true } };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Guest List');
    
    // Build filename: Guest-List-EventName-DD-MM-YYYY.xlsx
    const cleanName = selectedEvent.name
      .replace(/'/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('-');
    
    let dateStr = '';
    if (selectedEvent.date) {
      const d = new Date(selectedEvent.date);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      dateStr = `${dd}-${mm}-${yyyy}`;
    } else {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      dateStr = `${dd}-${mm}-${now.getFullYear()}`;
    }
    
    XLSX.writeFile(wb, `Guest-List-${cleanName}-${dateStr}.xlsx`);
    toast({ title: `Exported ${sortedGuests.length} guests successfully` });
  };

  const handleImportCSV = () => {
    if (!selectedEvent) return;
    
    whoIsAnalytics.importStarted(selectedEvent.id, 0); // Will update with actual count
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            toast({ 
              title: "Import failed", 
              description: "CSV file appears to be empty or invalid",
              variant: "destructive"
            });
            return;
          }
          
          const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const headerNormMap: Record<string, string> = {
            'First Name': 'first_name', 'Last Name': 'last_name', 'Table Name': 'table_name',
            'Seat No': 'seat_no', 'RSVP': 'rsvp', 'Dietary': 'dietary', 'Mobile': 'mobile',
            'Email': 'email', 'Notes': 'notes', 'Relation Partner': 'relation_partner', 'Relation Role': 'relation_role',
          };
          const headers = rawHeaders.map(h => headerNormMap[h] || h);
          const expectedHeaders = IMPORT_TEMPLATE_HEADERS;
          
          // Check if headers match (flexible - not all columns required)
          const requiredHeaders = ['first_name', 'last_name', 'table_name'];
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
          if (missingHeaders.length > 0) {
            toast({ 
              title: "Import failed", 
              description: `Missing required headers: ${missingHeaders.join(', ')}`,
              variant: "destructive"
            });
            return;
          }
          
          const dataRows = lines.slice(1);
          const currentGuestCount = guests.length;
          const guestLimit = selectedEvent.guest_limit || 50;
          
          // Update analytics with actual row count
          whoIsAnalytics.importStarted(selectedEvent.id, dataRows.length);
          
          if (currentGuestCount + dataRows.length > guestLimit) {
            toast({ 
              title: "Import failed", 
              description: `Adding ${dataRows.length} guests would exceed the limit of ${guestLimit}. Current: ${currentGuestCount}`,
              variant: "destructive"
            });
            return;
          }
          
          // Enhanced validation and processing
          const validRows: any[] = [];
          const allErrors: ImportError[] = [];
          
          // Get existing guests for duplicate checking
          const { data: existingGuests } = await supabase
            .from('guests')
            .select('first_name, last_name')
            .eq('event_id', selectedEventId);
          
          const existingNames = new Set(
            (existingGuests || []).map(g => 
              `${g.first_name.toLowerCase().trim()}_${g.last_name.toLowerCase().trim()}`
            )
          );
          
          const csvNames = new Set<string>();
          
          dataRows.forEach((row, index) => {
            const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
            const rowIndex = index + 2; // +2 because we skip header and arrays are 0-indexed
            
            const rowData: any = {};
            headers.forEach((header, i) => {
              rowData[header] = values[i] || '';
            });
            
            // Validate required fields
            if (!rowData.first_name?.trim()) {
              allErrors.push({
                rowIndex,
                field: 'first_name',
                value: rowData.first_name || '',
                reason: 'First name is required'
              });
              return;
            }
            
            if (!rowData.last_name?.trim()) {
              allErrors.push({
                rowIndex,
                field: 'last_name',
                value: rowData.last_name || '',
                reason: 'Last name is required'
              });
              return;
            }
            
            if (!rowData.table_name?.trim()) {
              allErrors.push({
                rowIndex,
                field: 'table_name',
                value: rowData.table_name || '',
                reason: 'Table name is required'
              });
              return;
            }
            
            // Check for duplicates
            const nameKey = `${rowData.first_name.toLowerCase().trim()}_${rowData.last_name.toLowerCase().trim()}`;
            if (existingNames.has(nameKey)) {
              allErrors.push({
                rowIndex,
                field: 'first_name',
                value: `${rowData.first_name} ${rowData.last_name}`,
                reason: 'Guest already exists in the event'
              });
              return;
            }
            
            if (csvNames.has(nameKey)) {
              allErrors.push({
                rowIndex,
                field: 'first_name',
                value: `${rowData.first_name} ${rowData.last_name}`,
                reason: 'Duplicate guest in CSV file'
              });
              return;
            }
            csvNames.add(nameKey);
            
            // Validate RSVP
            if (rowData.rsvp && !RSVP_OPTIONS.includes(rowData.rsvp)) {
              allErrors.push({
                rowIndex,
                field: 'rsvp',
                value: rowData.rsvp,
                reason: `Invalid RSVP status. Must be one of: ${RSVP_OPTIONS.join(', ')}`
              });
              return;
            }
            
            // Validate dietary
            if (rowData.dietary && !DIETARY_OPTIONS.includes(rowData.dietary)) {
              allErrors.push({
                rowIndex,
                field: 'dietary',
                value: rowData.dietary,
                reason: `Invalid dietary restriction. Must be one of: ${DIETARY_OPTIONS.join(', ')}`
              });
              return;
            }
            
            // Enhanced Relation validation
            const relationErrors = validateRelationFields(
              rowData.relation_partner || '',
              rowData.relation_role || '',
              rowIndex
            );
            allErrors.push(...relationErrors);
            
            if (relationErrors.length > 0) {
              return; // Skip this row due to Relation errors
            }
            
            // Normalize Relation fields
            if (rowData.relation_partner) {
              const normalizedPartner = normalizePartner(rowData.relation_partner);
              const normalizedRole = normalizeRole(rowData.relation_role);
              
              if (!normalizedPartner || !normalizedRole) {
                // Should have been caught by validation above, but just in case
                return;
              }
              
              rowData.relation_partner = normalizedPartner;
              rowData.relation_role = normalizedRole;
            }
            
            // Find table
            const foundTable = tables.find(t => t.name.toLowerCase() === rowData.table_name.toLowerCase());
            if (!foundTable) {
              allErrors.push({
                rowIndex,
                field: 'table_name',
                value: rowData.table_name,
                reason: `Table "${rowData.table_name}" not found`
              });
              return;
            }
            
            // Validate seat number if provided
            if (rowData.seat_no) {
              const seatNum = parseInt(rowData.seat_no);
              if (isNaN(seatNum) || seatNum < 1) {
                allErrors.push({
                  rowIndex,
                  field: 'seat_no',
                  value: rowData.seat_no,
                  reason: 'Seat number must be a positive integer'
                });
                return;
              }
              rowData.seat_no = seatNum;
            } else {
              rowData.seat_no = null;
            }
            
            // Transform data
            rowData.table_id = foundTable.id;
            rowData.event_id = selectedEventId;
            rowData.rsvp = rowData.rsvp || 'Pending';
            rowData.dietary = rowData.dietary || 'NA';
            delete rowData.table_name; // Remove table_name as we're using table_id
            
            validRows.push(rowData);
          });
          
          // If there are errors, show error modal
          if (allErrors.length > 0) {
            setImportErrors(allErrors);
            setImportStats({ total: dataRows.length, successful: validRows.length });
            setShowImportErrors(true);
            
            // If no valid rows, don't proceed with import
            if (validRows.length === 0) {
              return;
            }
          }
          
          // Show preview and confirm import
          const preview = validRows.slice(0, 5);
          let confirmMsg = `Import ${validRows.length} guests?`;
          if (allErrors.length > 0) {
            confirmMsg += `\n\n${allErrors.length} rows will be skipped due to errors.`;
          }
          confirmMsg += `\n\nPreview:\n${preview.map(r => `${r.first_name} ${r.last_name}`).join('\n')}`;
          
          if (confirm(confirmMsg)) {
            try {
              // Bulk insert guests with relation_display computed
              const { data: user } = await supabase.auth.getUser();
              if (!user.user) {
                toast({ 
                  title: "Import failed", 
                  description: "You must be logged in to import guests",
                  variant: "destructive"
                });
                return;
              }

              // Compute relation_display for each row
              const rowsWithDisplay = validRows.map(row => {
                const relationDisplay = computeRelationDisplay(
                  row.relation_partner || '',
                  row.relation_role || '',
                  selectedEvent?.partner1_name,
                  selectedEvent?.partner2_name
                );
                
                return {
                  ...row,
                  relation_display: relationDisplay,
                  user_id: user.user.id
                };
              });

              const { error } = await supabase
                .from('guests')
                .insert(rowsWithDisplay);
                
              if (error) {
                console.error('Import error:', error);
                toast({ 
                  title: "Import failed", 
                  description: "Error importing guests. Please try again.",
                  variant: "destructive"
                });
                return;
              }
              
              // Analytics tracking
              whoIsAnalytics.importCompleted(selectedEvent.id, validRows.length, allErrors.length);
              
              let successMsg = `Imported ${validRows.length} guests successfully`;
              if (allErrors.length > 0) {
                successMsg += `. Skipped ${allErrors.length} rows with errors`;
              }
              toast({ title: successMsg });
              refetchGuests();
            } catch (error) {
              console.error('Import error:', error);
              toast({ 
                title: "Import failed", 
                description: "Error importing guests. Please try again.",
                variant: "destructive"
              });
            }
          }
        } catch (error) {
          console.error('CSV parsing error:', error);
          toast({ 
            title: "Import failed", 
            description: "Error reading CSV file",
            variant: "destructive"
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleAddGuest = () => {
    if (!selectedEvent) return;
    
    const guestCount = guests.length;
    const partner1Missing = !selectedEvent.partner1_name?.trim();
    const partner2Missing = !selectedEvent.partner2_name?.trim();
    
    // Check admin settings for first guest alert override
    const shouldBlockFirstGuest = !relationSettings.relation_disable_first_guest_alert;
    
    // Determine if required names are missing based on toggle state
    const namesAreMissing = relationsHidden
      ? false                                   // Off mode: names not required
      : eventType === 'two'
        ? (partner1Missing || partner2Missing)  // Wedding/engagement: need BOTH
        : partner1Missing;                       // Single event: only need Partner 1
    
    // Gating rule: Only block for first guest if required names are missing AND haven't been saved
    if (shouldBlockFirstGuest && guestCount === 0 && namesAreMissing && !partnerNamesSaved) {
      // Analytics tracking
      whoIsAnalytics.addGuestBlockedMissingNames(selectedEvent.id);
      
      // Prevent opening the form
      setShowNamesValidation(true);
      
      // Scroll to the couple names section
      const coupleNamesSection = document.getElementById('guest-tools-section');
      if (coupleNamesSection) {
        coupleNamesSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Focus on the first partner input
        setTimeout(() => {
          const partner1Input = document.getElementById('partner1-name');
          if (partner1Input) {
            partner1Input.focus();
          }
        }, 500);
      }
      
      return;
    }
    // Guest limit check - block if already at or over limit
    const eventGuestLimit = selectedEvent?.guest_limit || 0;
    if (eventGuestLimit > 0 && guestCount >= eventGuestLimit) {
      setGuestLimitDialogVariant('exceeded');
      setShowGuestLimitDialog(true);
      return;
    }
    
    // Normal flow - open the add guest modal (allowed after saving required names)
    setEditingGuest(null);
    setShowAddModal(true);
  };

  const handleEditGuest = async (guest: any) => {
    // If guest has [NEW+] marker, strip it to acknowledge the alert
    if (guest.notes && guest.notes.startsWith('[NEW+]')) {
      const cleanedNotes = guest.notes.replace(/^\[NEW\+\]/, '');
      // Optimistically update local guest state immediately so flashing stops
      const updatedGuest = { ...guest, notes: cleanedNotes };
      await updateGuest(guest.id, { notes: cleanedNotes });
      setEditingGuest(updatedGuest);
      setShowAddModal(true);
      return;
    }
    setEditingGuest(guest);
    setShowAddModal(true);
  };

  const handleEditRelation = (guest: any) => {
    setEditingGuest({ ...guest, focusRelation: true });
    setShowAddModal(true);
  };

  const guestCount = sortedGuests.length;
  const totalGuestCount = guests.length;

  // Compute guests with [NEW+] alert marker for notification banner
  const alertGuests = useMemo(() => {
    return guests
      .filter(g => g.notes && g.notes.startsWith('[NEW+]'))
      .map(g => {
        const cleanedNotes = g.notes!.replace(/^\[NEW\+\]/, '');
        const match = cleanedNotes.match(/^(.+?) has added:/);
        const referrerName = match ? match[1].trim() : `${g.first_name} ${g.last_name || ''}`.trim();
        return { id: g.id, referrerName };
      });
  }, [guests]);

  // Calculate guest type counts for stats badges
  // Count groups (not individual guests) for Couple and Family
  const guestTypeStats = useMemo(() => {
    const stats = {
      individual: 0,
      couple: 0,
      family: 0
    };

    // Build a map of family_group -> members
    const familyGroups = new Map<string, any[]>();
    
    guests.forEach(guest => {
      if (guest.family_group && guest.family_group.trim()) {
        if (!familyGroups.has(guest.family_group)) {
          familyGroups.set(guest.family_group, []);
        }
        familyGroups.get(guest.family_group)!.push(guest);
      } else {
        // No family_group = Individual
        stats.individual++;
      }
    });

    // Count couple groups and family groups using name-based inference
    familyGroups.forEach((members, groupName) => {
      if (members.length === 1) {
        stats.individual++;
      } else {
        const isFamilyName = groupName.endsWith(' Family');
        const isCoupleName = groupName.includes(' & ') || groupName.endsWith(' Couple');
        if (isFamilyName) {
          stats.family++;
        } else if (isCoupleName) {
          stats.couple++;
        } else if (members.length >= 3) {
          stats.family++;
        } else {
          stats.couple++;
        }
      }
    });

    return stats;
  }, [guests]);

  const { individual: individualCount, couple: coupleCount, family: familyCount } = guestTypeStats;

  const renderPill = (condition: boolean, yesColor = "bg-green-500", noColor = "bg-red-500") => (
    <Badge 
      className={`text-white lv-premium-shade ${condition ? yesColor : noColor}`}
    >
      {condition ? "YES" : "NO"}
    </Badge>
  );

  const getMailingLines = (g: any): string[] => {
    const lines: string[] = [];
    const addr = (g?.mailing_address || '').trim();
    const suburb = (g?.mailing_suburb || '').trim();
    const state = (g?.mailing_state || '').trim();
    const postcode = (g?.mailing_postcode || '').trim();
    if (addr) lines.push(addr);
    if (suburb) lines.push(suburb);
    const last = [state, postcode].filter(Boolean).join(' ').trim();
    if (last) lines.push(last);
    return lines;
  };

  const renderAddressPill = (g: any) => {
    const received = g?.address_received === true;
    if (!received) {
      return <Badge className="text-white lv-premium-shade bg-red-500">NO</Badge>;
    }
    const lines = getMailingLines(g);
    const pill = <Badge className="text-white lv-premium-shade bg-green-500 cursor-default">YES</Badge>;
    if (lines.length === 0) return pill;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild><span>{pill}</span></TooltipTrigger>
          <TooltipContent>
            {lines.map((l, i) => (<div key={i} className="text-xs leading-tight">{l}</div>))}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (loading) {
    return (
      <div className={`${styles.page} ww-guest-list-page`}>
        <Card className={`${styles.pagePanel} p-8 text-center`}>
          <div>Loading events...</div>
        </Card>
      </div>
    );
  }

  // No event selected - show placeholder message like Table Setup
  if (!selectedEventId) {
    return (
      <div className={`${styles.page} ww-guest-list-page`}>
      <Card className={styles.pagePanel}>
        <div className="p-8 text-center space-y-4">
          <div className="text-muted-foreground">Select an event to view its guest list</div>
          
          {/* Event dropdown */}
          <div className="flex justify-center">
            <Select onValueChange={handleEventSelect} value="no-event">
              <SelectTrigger className="w-full sm:w-[300px] border-primary">
                <SelectValue placeholder="Select an event..." />
              </SelectTrigger>
              <SelectContent className="ww-guest-list-menu">
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>{event.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {events.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No events found. Create an event first to manage guests.
            </div>
          )}
        </div>
      </Card>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ww-guest-list-page`}>
      <Card className={`${styles.pagePanel} border-2 border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] overflow-hidden !p-0`}>
        {/* Header Controls */}
        <div className="px-3 sm:px-6 py-4">
          {/* Page Title with Couple Names Section */}
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Left: Title, Description, Event selector and Search */}
            <div className="w-full">
              <div className="flex items-baseline gap-3 mb-4 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground whitespace-nowrap inline-flex items-center gap-2">
                  <UsersRound size={22} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                  Guest List
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Manage your event guests, track RSVPs, assign tables, and organize seating arrangements
                </p>
                {hasRsvpPurchase && rsvpTotalCapacity > 0 && (
                  <span
                    className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                      guests.length > rsvpTotalCapacity
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : 'border-primary/30 bg-primary/5 text-primary'
                    }`}
                    title="RSVP invite allowance for this event"
                  >
                    RSVP Allowance: {guests.length} of {rsvpTotalCapacity} guests
                    {guests.length > rsvpTotalCapacity && ' • Additional guests required'}
                  </span>
                )}
              </div>

              {/* Smart RSVP & Messaging — Analytics + Resend (visible once activated) */}
              {hasRsvpPurchase && selectedEventId && (
                <div className="mb-4 flex items-center justify-end gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowAnalyticsPanel(true)}
                    className="lv-premium-shade inline-flex items-center gap-1.5 rounded-full border-2 border-primary text-primary bg-background px-3 py-1.5 text-xs font-semibold hover:bg-primary/5"
                    title="Open Smart RSVP Analytics"
                  >
                    Smart RSVP Analytics
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResendModal(true)}
                    className="lv-premium-shade inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90"
                    title="Resend Smart RSVP to a precise audience"
                  >
                    Resend Smart RSVP
                  </button>
                </div>
              )}

              {/* Inline RSVP success banner (auto-hides ~8s) */}
              {rsvpSuccessBanner && (
                <div
                  id="guest-list-table-anchor"
                  role="status"
                  className="mb-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 animate-in fade-in slide-in-from-top-2"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Invitations sent successfully.</p>
                    <p className="text-green-700/90">
                      {rsvpSuccessBanner.guestCount > 0 && (
                        <>
                          {rsvpSuccessBanner.guestCount}{' '}
                          {rsvpSuccessBanner.ptype === 'rsvp_overage' ? 'extra guests added' : 'guests invited'}
                          {' • '}
                        </>
                      )}
                      Responses will appear here.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRsvpSuccessBanner(null)}
                    className="text-green-700/70 hover:text-green-900 text-lg leading-none px-1"
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Smart RSVP premium feature strip — sits above Step 1/2/3 */}
              {selectedEventId && (
                <SmartRsvpFeatureStrip
                  className={`${styles.featureStrip} mb-4`}
                  onCommandCentre={() => {
                    document
                      .getElementById('smart-rsvp-command-centre')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  onCommunications={() => setShowAnalyticsPanel(true)}
                  onDelivery={() => setShowResendModal(true)}
                  onIntelligence={() => setShowIntelligencePanel(true)}
                />
              )}

              {/* Smart SMS Credit Status — premium credit intelligence */}
              {selectedEventId && (
                <SmartSmsCreditStatus
                  eventId={selectedEventId}
                  variant="full"
                  recipientCount={selectedGuestIds.size || undefined}
                  className={`${styles.smsPanel} mb-4`}
                />
              )}

              {/* Guest Live View APP Protection. You have full control in what your guests see by switching preferences On / Off. — informational banner */}
              <div className={`${styles.protectionPanel} bg-card border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.10)] p-4 mb-4 flex flex-col md:flex-row md:items-center gap-4`}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="bg-primary/10 text-primary rounded-full p-2.5 shrink-0">
                    <ShieldCheck size={21} strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-primary mb-1">Guest Live View APP Protection. You have full control in what your guests see by switching preferences On / Off.</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      7 days before your event, RSVP responses, guest edits, and +1 requests are automatically hidden from the Live View app for security and event-day stability.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                      You still have full control over what guests can view during the final week through your Guest Live View Configuration settings.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="lv-premium-shade shrink-0 max-md:w-full"
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('tab', 'qr-code');
                    url.hash = 'guest-live-view-configuration';
                    window.history.pushState({}, '', url);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                    setTimeout(() => {
                      document
                        .getElementById('guest-live-view-configuration')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 250);
                  }}
                >
                  <Settings2 size={15} strokeWidth={1.8} className="mr-1.5 shrink-0" aria-hidden="true" />
                  Configure Guest Live View →
                </Button>
              </div>

              {/* Event selector + Type of Event + Guest Relations - all on same row */}
                <div className={`${styles.setupGrid} grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[1fr_1.3fr_1fr_1fr_0.7fr] gap-4 items-stretch`}>
                {/* BOX 1: Step 1 - Set Up Your Event */}
                <div className="border border-primary rounded-xl p-5 flex flex-col shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
                  <h3 className="text-lg font-bold text-primary mb-0.5 flex items-center gap-2"><CalendarDays size={20} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />Step 1: Set Up Your Event</h3>
                  <p className="text-sm text-muted-foreground mb-4">Select your event and customise settings</p>

                  {/* Choose Event */}
                  <div className="mb-4">
                    <Label htmlFor="event-select" className="text-sm font-medium text-foreground mb-1.5 block">
                      Choose Event
                    </Label>
                    <Select value={selectedEventId || "no-event"} onValueChange={handleEventSelect}>
                      <SelectTrigger className="w-full border border-primary [&>span]:font-bold [&>span]:text-primary h-11 sm:h-10">
                        <SelectValue placeholder="Select an event..." />
                      </SelectTrigger>
                      <SelectContent className="ww-guest-list-menu">
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            <div className="flex items-center space-x-2">
                              <CalendarDays size={18} strokeWidth={1.8} aria-hidden="true" />
                              <span>{event.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Event Type */}
                  {selectedEventId && (
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-1.5 block">Event Type</Label>
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleEventTypeChange('two')}
                          aria-pressed={eventType === 'two'}
                          className={cn(
                            "ww-event-type-option h-9 text-sm justify-start transition-all",
                            eventType === 'two'
                              ? "border border-green-500 bg-green-50 text-green-500 shadow-md hover:bg-green-100"
                              : "border border-primary bg-primary/10 text-primary hover:bg-primary/15"
                           )}
                        >
                          💍 Wedding / Engagement
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleEventTypeChange('single')}
                          aria-pressed={eventType === 'single'}
                          className={cn(
                            "ww-event-type-option h-9 text-sm justify-start transition-all",
                            eventType === 'single'
                              ? "border border-green-500 bg-green-50 text-green-500 shadow-md hover:bg-green-100"
                              : "border border-primary bg-primary/10 text-primary hover:bg-primary/15"
                          )}
                        >
                          🎂 Birthday / Corporate / Other
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* BOX 2: Step 2 - Guest Relationship Settings */}
                <div className="border border-primary rounded-xl p-5 flex flex-col shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
                  <h3 className="text-lg font-bold text-primary mb-0.5 flex items-center gap-2"><HeartHandshake size={20} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />Step 2: Guest Relationship Settings</h3>
                  <p className="text-sm text-muted-foreground mb-4">Optionally define how guests are related to you</p>

                  {selectedEventId ? (
                    <div className={cn(
                      "rounded-lg p-3 transition-all duration-300",
                      relationsHidden ? "bg-muted/30" : "bg-primary/5"
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <Link2 size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                          Enable Relationships
                        </Label>
                        <span className="text-xs text-muted-foreground italic mr-2">Optional</span>
                      </div>
                      <div className="force-toggle-colors flex items-center gap-3 mb-2">
                        {relationsHidden && <span className="text-xs font-medium text-red-500">OFF</span>}
                        <Switch
                          checked={!relationsHidden}
                          onCheckedChange={(checked) => handleHideRelationsToggle(!checked)}
                          className="transition-colors duration-200"
                        />
                        {!relationsHidden && <span className="text-xs font-medium text-green-500">ON</span>}
                        <style>{`
                          .force-toggle-colors [data-state="checked"][role="switch"] {
                            background-color: #22c55e !important;
                          }
                          .force-toggle-colors [data-state="unchecked"][role="switch"] {
                            background-color: #ef4444 !important;
                          }
                          .force-toggle-colors [data-state="checked"][role="switch"]:hover {
                            background-color: #22c55e !important;
                          }
                          .force-toggle-colors [data-state="unchecked"][role="switch"]:hover {
                            background-color: #ef4444 !important;
                          }
                        `}</style>
                      </div>

                      {/* Expandable content with animation */}
                      <div className={cn(
                        "overflow-hidden transition-all duration-300 ease-in-out",
                        relationsHidden ? "max-h-0 opacity-0" : "max-h-[400px] opacity-100"
                      )}>
                        <div className="flex flex-col gap-2 pt-2 border-0 bg-transparent shadow-none">
                          {/* Option 1: Default names */}
                          <label
                            data-active={useDefaultNames}
                            className={cn(
                             "ww-relationship-option flex items-center gap-2 cursor-pointer rounded-lg border p-2 text-sm font-medium transition-all",
                              useDefaultNames
                                ? "border-green-500 bg-green-50 text-green-600 shadow-sm"
                                : "border-border bg-background text-foreground hover:bg-muted/50"
                            )}
                            onClick={() => {
                              setUseDefaultNames(true);
                              void handleSavePartnerNames('Bride', 'Groom');
                            }}
                          >
                            <input type="radio" name="nameChoice" checked={useDefaultNames} readOnly className={useDefaultNames ? "accent-green-500" : "accent-muted-foreground"} />
                            Use default labels (Bride / Groom)
                          </label>

                          {/* Option 2: Custom names */}
                          <label
                            data-active={!useDefaultNames}
                            className={cn(
                             "ww-relationship-option flex items-center gap-2 cursor-pointer rounded-lg border p-2 text-sm font-medium transition-all",
                              !useDefaultNames
                                ? "border-green-500 bg-green-50 text-green-600 shadow-sm"
                                : "border-border bg-background text-foreground hover:bg-muted/50"
                            )}
                            onClick={() => {
                              setUseDefaultNames(false);
                            }}
                          >
                            <input type="radio" name="nameChoice" checked={!useDefaultNames} readOnly className={!useDefaultNames ? "accent-green-500" : "accent-muted-foreground"} />
                            Use custom names for Partner 1 & Partner 2
                          </label>

                          {/* Custom name inputs */}
                          {!useDefaultNames && (
                            <div className="flex flex-col gap-2 pl-2 mt-1">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium w-24 shrink-0 flex items-center gap-1.5"><UserRound size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />Partner 1:</Label>
                                <Input
                                  id="partner1-name"
                                  value={partner1Name}
                                  onChange={(e) => {
                                    setPartner1Name(e.target.value);
                                    setPartnerNamesSaved(false);
                                    setHasUnsavedChanges(true);
                                  }}
                                  placeholder="e.g. Sarah"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium w-24 shrink-0 flex items-center gap-1.5"><UserRound size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />Partner 2:</Label>
                                <Input
                                  value={partner2Name}
                                  onChange={(e) => {
                                    setPartner2Name(e.target.value);
                                    setPartnerNamesSaved(false);
                                    setHasUnsavedChanges(true);
                                  }}
                                  placeholder="e.g. James"
                                  className="h-8 text-sm"
                                />
                              </div>
                              {showNamesValidation && (
                                <p className="text-xs text-destructive">Both partner names are required</p>
                              )}
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="success"
                                  size="sm"
                                  onClick={() => { void handleSavePartnerNames(); }}
                                  disabled={isSaving}
                                  className="h-8 rounded-full px-4 text-sm lv-premium-shade"
                                >
                                  <Save size={15} strokeWidth={1.8} className="mr-1.5 shrink-0" aria-hidden="true" />
                                  {isSaving ? 'Saving...' : 'Save Names'}
                                </Button>
                                {partnerNamesSaved && (
                                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                    ✓ Names saved
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Select an event first to configure relationships</p>
                  )}
                </div>

                {/* BOX 3: Step 3 - Guest RSVP Settings */}
                <div className="border border-primary rounded-xl p-5 flex flex-col justify-between shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
                  <div>
                    <h3 className="text-lg font-bold text-primary mb-0.5 flex items-center gap-2"><ClipboardCheck size={20} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />Step 3: Guest RSVP Settings</h3>
                    <p className="text-sm text-muted-foreground mb-4">Control whether invited guests can add additional people during RSVP.</p>

                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-sm font-medium text-foreground">Allow Guests To Add +1s</Label>
                    </div>
                    <div className="force-toggle-colors-step3 flex items-center gap-3 mb-2">
                      {!allowGuestPlusOnes && <span className="text-xs font-medium text-red-500">OFF</span>}
                      <Switch
                        checked={allowGuestPlusOnes}
                        onCheckedChange={handleAllowGuestPlusOnesChange}
                        className="transition-colors duration-200"
                      />
                      {allowGuestPlusOnes && <span className="text-xs font-medium text-green-500">ON</span>}
                      <style>{`
                        .force-toggle-colors-step3 [data-state="checked"][role="switch"] {
                          background-color: #22c55e !important;
                        }
                        .force-toggle-colors-step3 [data-state="unchecked"][role="switch"] {
                          background-color: #ef4444 !important;
                        }
                        .force-toggle-colors-step3 [data-state="checked"][role="switch"]:hover {
                          background-color: #22c55e !important;
                        }
                        .force-toggle-colors-step3 [data-state="unchecked"][role="switch"]:hover {
                          background-color: #ef4444 !important;
                        }
                      `}</style>
                    </div>

                    <div className="border-t border-border my-4" />

                    <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                      <p>When you send the RSVP link (app), guests can add a +1 extra guest without being pre-assigned in your guest list.</p>
                      <p>Recommended for large weddings, paper invitations, verbal invitations, or flexible seating arrangements.</p>
                      <p>If disabled, you can still manually assign plus-ones directly inside your Guest List table. You have full control.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-3 text-sm font-medium text-[#967A59] hover:text-[#7a6347] underline underline-offset-2 self-start"
                  >
                    ​
                  </button>
                </div>

                {/* BOX 4: Step 4 - Guest Contact Settings */}
                <div className="border border-primary rounded-xl p-5 flex flex-col shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
                  <h3 className="text-lg font-bold text-primary mb-0.5 flex items-center gap-2"><Contact size={20} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />Step 4: Guest Contact Settings</h3>
                  <p className="text-sm text-muted-foreground mb-4">Control what guest information can be collected through Live View RSVP.</p>

                  {selectedEventId ? (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm font-medium text-foreground flex items-center gap-1.5"><MapPin size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />Collect Guest Mailing Addresses</Label>
                      </div>
                      <div className="force-toggle-colors-step4 flex items-center gap-3 mb-2">
                        {!collectGuestAddresses && <span className="text-xs font-medium text-red-500">OFF</span>}
                        <Switch
                          checked={collectGuestAddresses}
                          onCheckedChange={handleCollectGuestAddressesChange}
                          className="transition-colors duration-200"
                        />
                        {collectGuestAddresses && <span className="text-xs font-medium text-green-500">ON</span>}
                        <style>{`
                          .force-toggle-colors-step4 [data-state="checked"][role="switch"] { background-color: #22c55e !important; }
                          .force-toggle-colors-step4 [data-state="unchecked"][role="switch"] { background-color: #ef4444 !important; }
                          .force-toggle-colors-step4 [data-state="checked"][role="switch"]:hover { background-color: #22c55e !important; }
                          .force-toggle-colors-step4 [data-state="unchecked"][role="switch"]:hover { background-color: #ef4444 !important; }
                        `}</style>
                      </div>

                      <div className="border-t border-border my-4" />

                      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                        <p>If you're sending printed invitations, RSVP cards, or thank-you cards by mail, guests can securely submit or update their physical mailing address through the Live View RSVP app — saving you hours of follow-ups, reducing mistakes, and keeping all guest details organised in one place.</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Select an event first to configure contact settings</p>
                  )}
                </div>

                {/* BOX 5: Step 5 - Add Your Guests */}
                <div className="border border-primary rounded-xl p-5 flex flex-col shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
                  <h3 className="text-lg font-bold text-primary mb-0.5 flex items-center gap-2"><UserPlus size={20} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />Step 5: Add Your Guests</h3>
                  <p className="text-sm text-muted-foreground mb-6">Start building your guest list</p>
                  <div className="flex-1 flex flex-col items-center justify-center">
                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => {
                      if (!selectedEventId) {
                        toast({
                          title: "No event selected",
                          description: "Please select an event first",
                          variant: "destructive",
                        });
                        return;
                      }
                      handleAddGuest();
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center gap-2 px-8 py-3 text-base lv-premium-shade"
                  >
                    <UserPlus size={16} strokeWidth={1.8} aria-hidden="true" />
                    + Add Guest
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">Guests will appear in the table below</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Control Buttons Row */}
          <div id="smart-rsvp-command-centre" className="flex items-center justify-between gap-2 flex-wrap mb-4 sm:mb-6 mt-4">

            {/* LEFT SIDE: Plus-guest notification banner */}
            <div className="flex flex-col gap-1">
              {alertGuests.length > 0 && (
                <div
                  className="animate-flash inline-flex flex-col gap-1 rounded-2xl border-4 border-red-500 bg-[#FFFF00] px-4 py-2 text-xs font-semibold text-gray-900"
                >
                  {alertGuests.map((ag) => (
                    <span key={ag.id}>{ag.referrerName} - Has added a +1 Guest. Please acknowledge that in the below flashing row by opening the &quot;EDIT&quot; button.</span>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT SIDE: Sort By, Import/Export, Add Guest */}
            <div className="flex items-center gap-2 flex-wrap">

              <TooltipProvider>
                {/* Sort By Dropdown - hidden on mobile */}
                <div className="hidden sm:block lg:hidden">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button 
                              className="ww-guest-toolbar-button inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                              disabled={!selectedEventId}
                            >
                              <ArrowUpDown size={16} strokeWidth={1.8} aria-hidden="true" />
                              Sort By
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="ww-guest-list-menu w-40">
                            {SORT_OPTIONS.map((option) => (
                              <DropdownMenuItem
                                key={option.value}
                                onClick={() => handleSortChange(option.value)}
                                className={`gap-2 ${sortBy === option.value ? "bg-accent" : ""} ${option.value === 'individuals_first' ? 'text-pink-500' : option.value === 'couples_first' ? 'text-orange-500' : option.value === 'families_first' ? 'text-blue-600' : option.value === 'default' ? 'text-red-500' : ''}`}
                              >
                                <option.icon className="h-4 w-4" />
                                {option.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TooltipTrigger>
                    {!selectedEventId && (
                      <TooltipContent>
                        <p>Choose an event first</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>

                {/* Import/Export CSV Dropdown - hidden on mobile */}
                <div className="hidden sm:block lg:hidden">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button 
                              className="ww-guest-toolbar-button inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                              disabled={!selectedEventId}
                            >
                              <FileUp size={16} strokeWidth={1.8} aria-hidden="true" />
                              Import / Export CSV
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="ww-guest-list-menu w-48">
                            <DropdownMenuItem onClick={downloadTemplate}>
                              <Download className="w-4 h-4 mr-2" />
                              Download Template
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleImportCSV}>
                              <FileUp size={16} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                              Import CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={exportGuestList}
                              disabled={guestCount === 0}
                            >
                              <FileDown size={16} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                              Export Guest List
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TooltipTrigger>
                    {!selectedEventId && (
                      <TooltipContent>
                        <p>Choose an event first</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
              </TooltipProvider>

            </div>
          </div>
        </div>

        {/* MOBILE-ONLY layout: filters → search+total → instruction */}
        <div className="lg:hidden mt-3 mb-3 mx-4 flex flex-col gap-3">
          {/* Filter tabs row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full text-xs font-medium h-8 px-3 bg-pink-500 text-white lv-premium-shade">
              {individualCount} Individual
            </div>
            <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full text-xs font-medium h-8 px-3 bg-orange-500 text-white lv-premium-shade">
              {coupleCount} Couple
            </div>
            <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full text-xs font-medium h-8 px-3 bg-blue-600 text-white lv-premium-shade">
              {familyCount} Family
            </div>
          </div>

          {/* Search + Total Guests row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={18} strokeWidth={1.8} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search guests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border-2 border-primary h-10 rounded-full text-sm"
              />
            </div>
            <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-xs font-medium h-10 px-3 bg-white border-2 border-primary text-foreground flex-shrink-0 lv-premium-shade">
              <Users className="w-3.5 h-3.5" />
              {guestCount} Total Guest{guestCount !== 1 ? 's' : ''}
            </div>
          </div>

        </div>

        {/* DESKTOP layout */}
        <div className="hidden lg:flex mt-2 mb-8 mx-3 sm:mx-6 items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={18} strokeWidth={1.8} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search guests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-[180px] sm:w-[200px] border-2 border-primary h-8 sm:h-9 rounded-full text-xs sm:text-sm"
              />
            </div>
            <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-xs font-medium h-7 px-3 bg-pink-500 text-white flex-shrink-0 lv-premium-shade">
              {individualCount} Individual
            </div>
            <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-xs font-medium h-7 px-3 bg-orange-500 text-white flex-shrink-0 lv-premium-shade">
              {coupleCount} Couple
            </div>
            <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-xs font-medium h-7 px-3 bg-blue-600 text-white flex-shrink-0 lv-premium-shade">
              {familyCount} Family
            </div>
            <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-xs font-medium ring-offset-background h-7 px-3 bg-white border-2 border-primary text-foreground lv-premium-shade">
              <Users className="w-4 h-4" />
              {guestCount} Total Guest{guestCount !== 1 ? 's' : ''}
            </div>
          </div>

          {/* RIGHT SIDE: Sort By + Import/Export (desktop only — tablet keeps them in the upper row) */}
          <div className="flex items-center gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ww-guest-toolbar-button inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  disabled={!selectedEventId}
                >
                  <ArrowUpDown size={16} strokeWidth={1.8} aria-hidden="true" />
                  Sort By
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="ww-guest-list-menu w-40">
                {SORT_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={`gap-2 ${sortBy === option.value ? "bg-accent" : ""} ${option.value === 'individuals_first' ? 'text-pink-500' : option.value === 'couples_first' ? 'text-orange-500' : option.value === 'families_first' ? 'text-blue-600' : option.value === 'default' ? 'text-red-500' : ''}`}
                  >
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ww-guest-toolbar-button inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  disabled={!selectedEventId}
                >
                  <FileUp size={16} strokeWidth={1.8} aria-hidden="true" />
                  Import / Export CSV
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="ww-guest-list-menu w-48">
                <DropdownMenuItem onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleImportCSV}>
                  <FileUp size={16} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                  Import CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={exportGuestList}
                  disabled={guestCount === 0}
                >
                  <FileDown size={16} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
                  Export Guest List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* MOBILE CARD VIEW (mobile + tablet < lg) */}
        <div className={`${styles.mobileCards} lg:hidden border-t-2 border-primary bg-[#FBF7F2]`}>
          {guestsLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading guests...</div>
          ) : totalGuestCount === 0 ? (
            <div className="text-center py-8" />
          ) : (
            <div className="px-4 py-4 space-y-3">
              {paginatedGroups.map((group, groupIndex) => (
                <React.Fragment key={`m-group-${groupIndex}-${group.groupName || 'individual'}`}>
                  {group.type !== 'individual' && (
                    <div
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg",
                        group.type === 'family' ? "bg-blue-600" : "bg-orange-500"
                      )}
                    >
                      <Users className="w-4 h-4 text-white" />
                      <span className="font-semibold text-sm text-white truncate">{group.groupName}</span>
                      <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0 ml-auto">
                        {group.type === 'couple' ? 'Couple' : 'Family'} • {group.members.length}
                      </Badge>
                    </div>
                  )}
                  {group.members.map((guest) => {
                    const typeLabel = getGuestTypeLabel(guest);
                    const typeColor =
                      typeLabel === 'Couple'
                        ? 'bg-[#FF5F1F] text-white'
                        : typeLabel === 'Family'
                        ? 'bg-[#0000FF] text-white'
                        : 'bg-[#ff1493] text-white';
                    const rsvpLabel = getRsvpDisplayLabel(guest.rsvp);
                    const isNotAttending = rsvpLabel === 'Not Attending';
                    const relationDisplay = getResolvedRelationDisplay(
                      guest,
                      selectedEvent?.partner1_name || 'Bride',
                      selectedEvent?.partner2_name || 'Groom'
                    );
                    const inviteStatus = guest.rsvp_invite_status || 'not_sent';
                    const inviteConfig: Record<string, { label: string; className: string }> = {
                      not_sent: { label: 'Not Sent', className: 'bg-gray-400 text-white' },
                      email_sent: { label: 'Email Sent', className: 'bg-green-500 text-white' },
                      sms_sent: { label: 'SMS Sent', className: 'bg-green-500 text-white' },
                      both_sent: { label: 'Both Sent', className: 'bg-green-500 text-white' },
                      mail_sent: { label: 'Sent (Mail)', className: 'bg-green-500 text-white' },
                    };
                    const invite = inviteConfig[inviteStatus] || inviteConfig.not_sent;
                    const isSelected = selectedGuestIds.has(guest.id);
                    const hasPlusOneAlert =
                      !!guest.notes?.startsWith('[NEW+]') && !ackedPlusOneIds.has(guest.id);
                    return (
                      <div
                        key={`m-${guest.id}`}
                        className={cn(
                          "bg-white rounded-2xl shadow-sm border-2 border-[#967A59] p-4 transition-all",
                          isSelected && "ring-2 ring-primary",
                          hasPlusOneAlert && "animate-row-flash"
                        )}
                      >
                        {/* Select pill button (top, centered) — matches SMS Sent badge sizing */}
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (hasPlusOneAlert) acknowledgePlusOneOptimistic(guest);
                              handleSelectGuest(guest.id, !isSelected);
                            }}
                            aria-pressed={isSelected}
                            className={cn(
                              "ww-small-pill !border-2 !border-[#967A59]",
                              isSelected && "ww-small-pill--active",
                              hasPlusOneAlert &&
                                "!bg-[#FFFF00] !border-4 !border-red-500 !text-gray-900 !h-8 !px-4 !text-[13px] !font-semibold animate-flash"
                            )}
                          >
                            {isSelected ? '✓ Selected' : "Send RSVP's & Invitation"}
                          </button>
                        </div>

                        {/* Guest name (centered, single line) */}
                        <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                          <span className="font-bold text-base text-[#1D1D1F] truncate">
                            {guest.first_name} {guest.last_name}
                          </span>
                          {hasPlusOneAlert && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[#FEF3C7] border border-[#967A59] text-[#1D1D1F]">
                              +1 Added
                            </span>
                          )}
                        </div>

                        {/* Status row: RSVP + group type (centered, one line) — identical pill sizing */}
                        <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
                          <Badge
                            variant={getRsvpBadgeVariant(guest.rsvp)}
                            className="text-xs font-semibold text-white px-2.5 py-0.5 leading-tight inline-flex items-center justify-center text-center min-w-[68px]"
                          >
                            {isNotAttending ? (
                              <span className="flex flex-col items-center justify-center leading-[1.05]">
                                <span>Not</span>
                                <span>Attending</span>
                              </span>
                            ) : (
                              rsvpLabel
                            )}
                          </Badge>
                          <span className={cn("inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-tight", typeColor)}>
                            {typeLabel}
                          </span>
                        </div>

                        {/* Middle: 2-column info grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-sm">
                          <div>
                            <div className="text-[11px] uppercase tracking-wide font-semibold text-[#3A3A3C]">Mobile</div>
                            <div className="text-[#1D1D1F] font-medium truncate">{guest.mobile?.trim() || '—'}</div>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-wide font-semibold text-[#3A3A3C]">Email</div>
                            <div className="text-[#1D1D1F] font-medium truncate">{guest.email?.trim() || '—'}</div>
                          </div>
                          {collectGuestAddresses && (
                            <div>
                              <div className="text-[11px] uppercase tracking-wide font-semibold text-[#3A3A3C]">Address</div>
                              <div className="mt-1">{renderAddressPill(guest)}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-[11px] uppercase tracking-wide font-semibold text-[#3A3A3C]">Table No</div>
                            <div className="text-[#1D1D1F] font-medium truncate">{getTableName(guest) || '—'}</div>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-wide font-semibold text-[#3A3A3C]">Seat No</div>
                            <div className="text-[#1D1D1F] font-medium">
                              {guest.seat_no ? (
                                isDuplicateSeat(guest) ? (
                                  <span className="text-red-600 font-semibold">{guest.seat_no}</span>
                                ) : (
                                  guest.seat_no
                                )
                              ) : (
                                '—'
                              )}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] uppercase tracking-wide font-semibold text-[#3A3A3C] mb-1">Relation</div>
                            {relationsHidden ? (
                              <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-full bg-red-500 text-white text-xs font-semibold">OFF</span>
                            ) : (
                              <RelationBadge
                                display={relationDisplay}
                                partner={guest.relation_partner || ''}
                                role={guest.relation_role || ''}
                                partnerName={guest.relation_partner === 'partner_one' ? selectedEvent?.partner1_name : selectedEvent?.partner2_name}
                                onClick={() => handleEditRelation(guest)}
                                isEmpty={!relationDisplay}
                              />
                            )}
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-wide font-semibold text-[#3A3A3C]">Dietary</div>
                            <div className="text-[#1D1D1F] font-medium truncate">{guest.dietary || '—'}</div>
                          </div>
                        </div>

                        {/* Optional notes (expandable via native details) */}
                        {guest.notes && guest.notes.trim() !== '' && (
                          <details className="mt-3 text-sm">
                            <summary className="cursor-pointer text-primary font-semibold text-xs">
                              View notes
                            </summary>
                            <p className="mt-2 text-[#1D1D1F] whitespace-pre-wrap text-xs font-medium">
                              {guest.notes.replace(/^\[NEW\+\]/, '')}
                            </p>
                          </details>
                        )}

                        {/* Bottom: invite status + actions */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#EDE5DB]">
                          <div className="flex items-center flex-wrap gap-1.5 min-w-0">
                            <Badge className={cn("text-xs whitespace-nowrap", invite.className)}>
                              {invite.label}
                            </Badge>
                            <GuestDeliveryBadges
                              inviteStatus={guest.rsvp_invite_status}
                              rsvp={guest.rsvp}
                              purchaseDeliveryMethod={(rsvpPurchase as any)?.delivery_method ?? null}
                              lowCredits={smsLowCredit}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { acknowledgePlusOneOptimistic(guest); handleEditGuest(guest); }}
                              className="h-9 w-9 p-0 border-0 bg-green-500 hover:bg-green-600 text-white ww-guest-action-btn"
                              aria-label="Edit guest"
                              title="Edit guest"
                            >
                              <Pencil size={16} strokeWidth={1.8} className="text-white" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGuest(guest)}
                              className="h-9 w-9 p-0 border-0 bg-red-500 hover:bg-red-600 text-white ww-guest-action-btn"
                              aria-label="Delete guest"
                              title="Delete guest"
                            >
                              <Trash2 size={16} strokeWidth={1.8} className="text-white" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* DESKTOP TABLE VIEW (lg and up) */}
        <div className={`${styles.tableWrap} hidden lg:block overflow-x-auto border-t-2 border-primary`}>
          
          <Table className="w-full table-fixed border-collapse">
            <colgroup>
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              {collectGuestAddresses && <col style={{ width: '5%' }} />}
              <col style={{ width: '6%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '7.5%' }} />
              <col style={{ width: '7.5%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '6%' }} />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-primary text-primary-foreground px-1 py-2 text-center align-middle">
                  <button
                    type="button"
                    title="Send RSVP & Invite"
                    aria-label="Send RSVP & Invite"
                    onClick={() => setBulkModalOpen(true)}
                    className="mx-auto px-2 py-1 rounded-full border border-white bg-white/10 hover:bg-white/20 text-[11px] font-medium text-white whitespace-nowrap leading-tight transition-colors"
                  >
                    <span className="block">Send</span>
                    <span className="block">RSVP &amp; Invite</span>
                  </button>
                </TableHead>
                <TableHead className="px-2 py-2 text-xs text-center align-middle">First Name</TableHead>
                <TableHead className="px-2 py-2 text-xs text-center align-middle">Last Name</TableHead>
                <TableHead className="px-2 py-2 text-xs text-center align-middle">Mobile</TableHead>
                <TableHead className="px-2 py-2 text-xs text-center align-middle">Email</TableHead>
                {collectGuestAddresses && (
                  <TableHead className="px-2 py-2 text-xs text-center align-middle">Address</TableHead>
                )}
                <TableHead 
                  className="px-2 py-2 text-xs text-center align-middle cursor-pointer hover:bg-primary/80 transition-colors select-none"
                  onClick={async () => {
                    if (!selectedEventId || sortedGuests.length === 0) return;
                    const allOn = sortedGuests.every(g => g.allow_plus_one !== false);
                    const newValue = !allOn;
                    try {
                      const { error } = await supabase
                        .from('guests')
                        .update({ allow_plus_one: newValue })
                        .eq('event_id', selectedEventId);
                      if (error) throw error;
                      await refetchGuests();
                      toast({
                        title: "Success",
                        description: `+ Guest ${newValue ? 'enabled' : 'disabled'} for all guests`,
                      });
                    } catch (err) {
                      console.error('Error toggling all + Guest:', err);
                      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
                    }
                  }}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block leading-tight">
                          + Guest
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click to toggle all guests. Controls whether guests can add extra people via Live View.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="ww-rsvp-invite-column px-2 py-2 text-xs text-center align-middle">RSVP Invite</TableHead>
                <TableHead className="px-2 py-2 text-xs text-center align-middle">RSVP Status</TableHead>
                <TableHead className="px-2 py-2 text-xs text-center align-middle">
                  <span className="block leading-tight">Table</span>
                  <span className="block leading-tight">No</span>
                </TableHead>
                <TableHead className="px-2 py-2 text-xs text-center align-middle">
                  <span className="block leading-tight">Seat</span>
                  <span className="block leading-tight">No</span>
                </TableHead>
                <TableHead className="px-2 py-2 text-xs text-center align-middle">Relation</TableHead>
                <TableHead className="px-2 py-2 text-xs text-center align-middle">
                  <span className="block leading-tight">Dietary</span>
                  <span className="block leading-tight">Requirements</span>
                </TableHead>
                <TableHead className="px-2 py-2 text-xs text-center align-middle">
                  <span className="block leading-tight">Family</span>
                  <span className="block leading-tight">Group</span>
                </TableHead>
                <TableHead className="px-2 py-2 text-xs text-center align-middle">Notes</TableHead>
                <TableHead className="px-2 py-2 text-xs text-center align-middle">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guestsLoading ? (
                <TableRow className="border-card-border">
                   <TableCell colSpan={collectGuestAddresses ? 16 : 15} className="text-center py-8">
                    Loading guests...
                  </TableCell>
                </TableRow>
              ) : totalGuestCount === 0 ? (
                <TableRow className="border-card-border">
                   <TableCell colSpan={collectGuestAddresses ? 16 : 15} className="text-center py-8">
                    {/* Empty - the "No Guests Yet" widget is now in the header */}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedGroups.map((group, groupIndex) => (
                  <React.Fragment key={`group-${groupIndex}-${group.groupName || 'individual'}`}>
                    {/* Group Header (for couples and families) */}
                    {group.type !== 'individual' && (
                       <TableRow className={group.type === 'family' ? "bg-blue-600 hover:bg-blue-600" : "bg-orange-500 hover:bg-orange-500"}>
                         <TableCell colSpan={collectGuestAddresses ? 16 : 15} className="py-2 px-0">
                           <div className="flex items-center gap-2 pl-[7%]">
                            {group.type === 'couple'
                              ? <Heart size={15} strokeWidth={1.8} className="text-white" aria-hidden="true" />
                              : <UsersRound size={15} strokeWidth={1.8} className="text-white" aria-hidden="true" />}
                            <span className="font-semibold text-sm text-white">
                              {group.groupName}
                            </span>
                            <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                              {group.type === 'couple' ? 'Couple' : 'Family'} • {group.members.length} members
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Render each member */}
                    {group.members.map((guest, memberIndex) => {
                      const isLastMember = memberIndex === group.members.length - 1;
                      return (
                        <TableRow 
                          key={guest.id}
                          className={cn(
                            "border-card-border",
                            "hover:bg-[#F5F0EB] dark:hover:bg-[#5A4835]/30",
                            group.type !== 'individual' && "border-l-4 border-l-[#EDE5DB]",
                            group.type !== 'individual' && isLastMember && "border-b-2 border-b-[#967A59]",
                            guest.notes && guest.notes.startsWith('[NEW+]') && "animate-row-flash"
                          )}
                        >
                          <TableCell className="px-2 py-2 text-center align-middle">
                            <Checkbox
                              checked={selectedGuestIds.has(guest.id)}
                              onCheckedChange={(checked) => handleSelectGuest(guest.id, checked as boolean)}
                              className="ww-guest-select-checkbox"
                            />
                          </TableCell>
                          <TableCell className="px-2 py-2 text-center align-middle font-medium">
                            {guest.first_name}
                          </TableCell>
                          <TableCell className="px-2 py-2 text-center align-middle font-medium">{guest.last_name}</TableCell>
                          <TableCell className="px-2 py-2 text-center align-middle">{renderPill(!!guest.mobile && guest.mobile.trim() !== '')}</TableCell>
                          <TableCell className="px-2 py-2 text-center align-middle">{renderPill(!!guest.email && guest.email.trim() !== '')}</TableCell>
                          {collectGuestAddresses && (
                            <TableCell className="px-2 py-2 text-center align-middle">{renderAddressPill(guest)}</TableCell>
                          )}
                          <TableCell className="px-2 py-2 text-center align-middle">
                            <Badge 
                              className={cn(
                                "text-white cursor-pointer lv-premium-shade",
                                guest.notes && /has added:/i.test(guest.notes.replace(/^\[NEW\+\]/, ''))
                                  ? guest.notes.startsWith('[NEW+]')
                                    ? "bg-green-500 hover:bg-green-600 animate-flash"
                                    : "bg-green-500 hover:bg-green-600"
                                  : guest.allow_plus_one !== false
                                    ? "bg-green-500 hover:bg-green-600"
                                    : "bg-red-500 hover:bg-red-600"
                              )}
                              onClick={async () => {
                                const newValue = guest.allow_plus_one === false;
                                try {
                                  await supabase
                                    .from('guests')
                                    .update({ allow_plus_one: newValue })
                                    .eq('id', guest.id);
                                  await refetchGuests();
                                } catch (err) {
                                  console.error('Error toggling + Guest:', err);
                                  toast({ title: "Error", description: "Failed to update", variant: "destructive" });
                                }
                              }}
                            >
                              {guest.notes && /has added:/i.test(guest.notes.replace(/^\[NEW\+\]/, ''))
                                ? "+Guest"
                                : guest.allow_plus_one !== false
                                  ? "YES"
                                  : "NO"}
                            </Badge>
                          </TableCell>
                          <TableCell className="ww-rsvp-invite-column px-2 py-2 text-center align-middle">
                            {(() => {
                              const status = guest.rsvp_invite_status || 'not_sent';
                              const statusConfig: Record<string, { label: string; className: string }> = {
                                'not_sent': { label: 'Not Sent', className: 'bg-gray-400 text-white' },
                                'email_sent': { label: 'Email Sent', className: 'bg-green-500 text-white' },
                                'sms_sent': { label: 'SMS Sent', className: 'bg-green-500 text-white' },
                                'both_sent': { label: 'Both Sent', className: 'bg-green-500 text-white' },
                                'mail_sent': { label: 'Sent (Mail)', className: 'bg-green-500 text-white' },
                              };
                              const config = statusConfig[status] || statusConfig['not_sent'];
                              return (
                                <span className="ww-rsvp-invite-stack inline-flex flex-col items-center justify-center gap-1 whitespace-nowrap">
                                  <Badge className={`ww-rsvp-invite-primary text-xs whitespace-nowrap break-normal lv-premium-shade ${config.className}`}>
                                    {config.label}
                                  </Badge>
                                  <GuestDeliveryBadges
                                    inviteStatus={guest.rsvp_invite_status}
                                    rsvp={guest.rsvp}
                                    purchaseDeliveryMethod={(rsvpPurchase as any)?.delivery_method ?? null}
                                    lowCredits={smsLowCredit}
                                    className="ww-rsvp-invite-secondary-stack !ml-0 !flex-col !flex-nowrap !gap-1"
                                  />
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="px-2 py-2 text-center align-middle">
                            {(() => {
                              const label = getRsvpDisplayLabel(guest.rsvp);
                              const isNotAttending = label === 'Not Attending';
                              return (
                                <Badge 
                                  variant={getRsvpBadgeVariant(guest.rsvp)} 
                                  className="text-xs text-white px-2 py-0.5 leading-tight lv-premium-shade"
                                >
                                  {isNotAttending ? (
                                    <>Not<br />Attending</>
                                  ) : (
                                    label
                                  )}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="px-2 py-2 text-center align-middle">{getTableName(guest) || '—'}</TableCell>
                          <TableCell className="px-2 py-2 text-center align-middle">
                            {guest.seat_no ? (
                              isDuplicateSeat(guest) ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-red-600 font-medium cursor-help">
                                        {guest.seat_no}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Duplicate seat on this table. Edit to resolve.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                guest.seat_no
                              )
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-2 text-center align-middle">
                            {relationsHidden ? (
                              <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-full bg-red-500 text-white text-xs font-semibold lv-premium-shade">OFF</span>
                            ) : (
                            (() => {
                              const relationDisplay = getResolvedRelationDisplay(
                                guest,
                                selectedEvent?.partner1_name || 'Bride',
                                selectedEvent?.partner2_name || 'Groom'
                              );

                              return (
                            <RelationBadge
                              display={relationDisplay}
                              partner={guest.relation_partner || ''}
                              role={guest.relation_role || ''}
                              partnerName={guest.relation_partner === 'partner_one' ? selectedEvent?.partner1_name : selectedEvent?.partner2_name}
                              onClick={() => handleEditRelation(guest)}
                              isEmpty={!relationDisplay}
                            />
                              );
                            })()
                            )}
                          </TableCell>
                    <TableCell className="px-2 py-2 text-center align-middle">
                      <span className="text-sm text-foreground">
                        {guest.dietary || '—'}
                      </span>
                    </TableCell>
                          <TableCell className="px-2 py-2 text-center align-middle">
                            {(() => {
                              const typeLabel = getGuestTypeLabel(guest);
                              let colorClasses = 'bg-[#ff1493] text-white';
                              
                              if (typeLabel === 'Couple') {
                                colorClasses = 'bg-[#FF5F1F] text-white';
                              } else if (typeLabel === 'Family') {
                                colorClasses = 'bg-[#0000FF] text-white';
                              }
                              
                              return (
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold lv-premium-shade ${colorClasses}`}>
                                  {typeLabel}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="px-2 py-2 text-center align-middle">
                            {guest.notes && guest.notes.trim() !== '' ? (() => {
                              const hasNewAlert = guest.notes.startsWith('[NEW+]');
                              const displayNotes = guest.notes.replace(/^\[NEW\+\]/, '');
                              const hasPlusGuestHistory = /has added:/i.test(displayNotes);
                              return (
                                <TooltipProvider delayDuration={100}>
                                  <Tooltip>
                                    <TooltipTrigger className="border-0 bg-transparent p-0">
                                      <span className={cn(
                                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white bg-green-500 cursor-pointer lv-premium-shade",
                                        hasNewAlert && "animate-flash"
                                      )}>{hasPlusGuestHistory ? "Yes" : "Yes"}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs z-[9999]">
                                      <p className="whitespace-pre-wrap">{displayNotes}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })() : (
                              <Badge className="text-white bg-red-500 lv-premium-shade">No</Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-2 text-center align-middle">
                            <span className="whitespace-nowrap">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-8 w-8 p-0 border-0 bg-green-500 hover:bg-green-600 text-white ww-guest-action-btn"
                                      onClick={() => handleEditGuest(guest)}
                                      aria-label="Edit guest"
                                    >
                                      <Pencil size={16} strokeWidth={1.8} className="text-white" aria-hidden="true" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="ww-guest-action-tooltip"><p>Edit Guest</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-8 w-8 p-0 border-0 bg-red-500 hover:bg-red-600 text-white ww-guest-action-btn"
                                      onClick={() => handleDeleteGuest(guest)}
                                      aria-label="Delete guest"
                                      title="Delete guest"
                                    >
                                      <Trash2 size={16} strokeWidth={1.8} className="text-white" aria-hidden="true" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top"><p>Delete guest</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
          <div className="h-12 bg-primary" />
          
        </div>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className={`${styles.pagination} flex items-center justify-between px-4 py-3 max-lg:flex-col max-lg:items-center max-lg:gap-2`}>
          <p className="text-sm text-muted-foreground max-lg:order-1 max-lg:text-center max-lg:whitespace-nowrap">
            Showing {((currentPage - 1) * GUESTS_PER_PAGE) + 1}–{Math.min(currentPage * GUESTS_PER_PAGE, totalFilteredGuestCount)} of {totalFilteredGuestCount} guests
          </p>
          <div className="flex items-center gap-2 max-lg:order-2 max-lg:justify-center max-lg:flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="px-1 text-muted-foreground">…</span>
                ) : (
                  <Button
                    key={item}
                    variant={item === currentPage ? 'default' : 'outline'}
                    size="sm"
                    className="min-w-[36px]"
                    onClick={() => setCurrentPage(item)}
                  >
                    {item}
                  </Button>
                )
              )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AddGuestModal 
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingGuest(null);
        }}
        eventId={selectedEventId}
        onGuestAdded={handleGuestSuccess}
        editGuest={editingGuest}
        isEdit={!!editingGuest}
        relationsHidden={relationsHidden}
      />
        <GuestDeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDeleteGuest}
          guestName={guestToDelete ? `${guestToDelete.first_name} ${guestToDelete.last_name}` : ''}
          isLoading={isDeleting}
        />
        <ImportErrorModal
          isOpen={showImportErrors}
          onClose={() => setShowImportErrors(false)}
          errors={importErrors}
          totalRows={importStats.total}
          successfulRows={importStats.successful}
        />

        {/* Bulk Actions Modal */}
        <GuestBulkActionsBar
          isOpen={bulkModalOpen || selectedGuestIds.size > 0}
          onClose={() => { setBulkModalOpen(false); handleDeselectAll(); }}
          selectedCount={selectedGuestIds.size}
          totalCount={sortedGuests.length}
          selectedGuests={sortedGuests.filter(g => selectedGuestIds.has(g.id)).map(g => ({ id: g.id, first_name: g.first_name, last_name: g.last_name }))}
          allGuests={sortedGuests.map(g => ({ id: g.id, first_name: g.first_name, last_name: g.last_name }))}
          onSelectGuests={(ids) => setSelectedGuestIds(new Set(ids))}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onUpdateRsvp={() => setShowBulkRsvpModal(true)}
          onDelete={() => setShowBulkDeleteModal(true)}
          onSendEmail={() => {
             if (selectedGuestIds.size === 0) {
               toast({
                 title: "No guests selected",
                 description: "Please select at least one guest, use 'Select All Guests', or add guests from the search bar before sending.",
                 variant: "destructive",
                 className: "[&_*]:text-white",
               });
               return;
             }
             setSendChannel('email');
            if (hasRsvpPurchase && rsvpPurchase) {
              if (rsvpTotalCapacity > 0 && guests.length <= rsvpTotalCapacity) {
                setShowAlreadyPaidModal(true);
              } else {
                // Tier already paid but guest count now exceeds total capacity → buy overage
                setShowOverageModal(true);
              }
            } else {
              setShowActivationModal(true);
            }
          }}
          onSendSms={() => {
             if (selectedGuestIds.size === 0) {
               toast({
                 title: "No guests selected",
                 description: "Please select at least one guest, use 'Select All Guests', or add guests from the search bar before sending.",
                 variant: "destructive",
                 className: "[&_*]:text-white",
               });
               return;
             }
             if (smsEmpty) {
               toast({
                 title: "SMS credits required",
                 description: "SMS credits required to continue Smart RSVP messaging. Top up to keep sending invites.",
                 variant: "destructive",
                 className: "[&_*]:text-white",
               });
               return;
             }
             setSendChannel('sms');
            if (hasRsvpPurchase && rsvpPurchase) {
              if (rsvpTotalCapacity > 0 && guests.length <= rsvpTotalCapacity) {
                setShowAlreadyPaidModal(true);
              } else {
                setShowOverageModal(true);
              }
            } else {
              setShowActivationModal(true);
            }
          }}
          onMarkManualInvite={async (method: string) => {
            try {
              const ids = Array.from(selectedGuestIds);
              for (const guestId of ids) {
                await supabase
                  .from('guests')
                  .update({ rsvp_invite_status: method, rsvp_invite_sent_at: new Date().toISOString() })
                  .eq('id', guestId);
              }
              toast({
                title: "Success",
                description: `${ids.length} guest(s) marked as invite sent`,
              });
              handleDeselectAll();
              refetchGuests();
            } catch (error) {
              console.error('Error marking manual invite:', error);
              toast({
                title: "Error",
                description: "Failed to update invite status",
                variant: "destructive",
              });
            }
          }}
        />

        {/* Bulk Table Assignment Modal */}
        <BulkTableAssignmentModal
          isOpen={showBulkTableModal}
          onClose={() => setShowBulkTableModal(false)}
          selectedGuests={sortedGuests.filter(g => selectedGuestIds.has(g.id))}
          tables={tables}
          onConfirm={handleBulkTableAssignment}
        />

        {/* Bulk RSVP Update Modal */}
        <BulkRsvpUpdateModal
          isOpen={showBulkRsvpModal}
          onClose={() => setShowBulkRsvpModal(false)}
          selectedGuests={sortedGuests.filter(g => selectedGuestIds.has(g.id))}
          onConfirm={handleBulkRsvpUpdate}
        />

        {/* Bulk Delete Confirmation */}
        <Dialog open={showBulkDeleteModal} onOpenChange={(open) => { if (!open) { setBulkDeleteConfirmText(''); } setShowBulkDeleteModal(open); }}>
          <DialogContent className="ww-guest-list-dialog sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <DialogTitle className="text-primary">
                  {selectedGuestIds.size === 1 ? 'You are deleting this guest' : `You are deleting ${selectedGuestIds.size} guests`}
                </DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                <span className="text-primary">
                  {selectedGuestIds.size === 1 ? '1 guest selected' : `${selectedGuestIds.size} guests selected`}
                </span>
                <br /><br />
                Once it's gone you can't bring it back.
                <br /><br />
                Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm deletion.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="bulk-confirm-delete">Confirmation</Label>
              <Input
                id="bulk-confirm-delete"
                value={bulkDeleteConfirmText}
                onChange={(e) => setBulkDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="font-mono"
              />
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button
                variant="default"
                size="xs"
                className="rounded-full"
                onClick={() => { setBulkDeleteConfirmText(''); setShowBulkDeleteModal(false); }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="xs"
                className="rounded-full"
                onClick={() => { handleBulkDelete(); setBulkDeleteConfirmText(''); }}
                disabled={bulkDeleteConfirmText !== 'DELETE'}
              >
                Delete Guest
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send RSVP Confirm Modal */}
        <SendRsvpConfirmModal
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
          channel={sendChannel}
          selectedGuests={sortedGuests.filter(g => selectedGuestIds.has(g.id))}
          totalGuestCount={guests.length}
          isSending={sending}
          onConfirm={async () => {
            const guestIds = Array.from(selectedGuestIds);
            const result = sendChannel === 'email'
              ? await sendEmailInvites(selectedEventId!, guestIds)
              : await sendSmsInvites(selectedEventId!, guestIds);
            if (result) {
              setShowSendModal(false);
              setSelectedGuestIds(new Set());
              await refetchGuests();
            }
          }}
        />

        {/* RSVP Activation Modal (payment gate) */}
        <RsvpActivationModal
          isOpen={showActivationModal}
          onClose={() => setShowActivationModal(false)}
          totalGuestCount={guests.length}
          eventId={selectedEventId}
          onPayNow={() => {
            setShowActivationModal(false);
            toast({
              title: "Stripe Not Connected",
              description: "Payment processing will be available once Stripe is connected. Contact support for assistance.",
            });
          }}
        />

        {/* RSVP Already Paid Modal (within tier) */}
        {rsvpPurchase && (
          <RsvpAlreadyPaidModal
            isOpen={showAlreadyPaidModal}
            onClose={() => setShowAlreadyPaidModal(false)}
            onContinue={() => {
              setShowAlreadyPaidModal(false);
              setShowSendModal(true);
            }}
            tierLabel={rsvpPurchase.guest_tier_label || ''}
            amountPaid={Number(rsvpPurchase.amount_paid) || 0}
            paidAt={rsvpPurchase.created_at}
            currentGuestCount={guests.length}
            tierMax={getTierMaxFromLabel(rsvpPurchase.guest_tier_label)}
          />
        )}

        {/* RSVP Overage Modal (tier paid, but guest count exceeded total capacity) */}
        <RsvpOverageModal
          isOpen={showOverageModal}
          onClose={() => setShowOverageModal(false)}
          eventId={selectedEventId}
          currentGuestCount={guests.length}
          totalCapacity={rsvpTotalCapacity}
          tierLabel={rsvpPurchase?.guest_tier_label || ''}
        />

        {/* Resend Smart RSVP — precision re-targeting */}
        <ResendSmartRsvpModal
          isOpen={showResendModal}
          onClose={() => setShowResendModal(false)}
          eventId={selectedEventId}
          onSend={async (channel, guestIds) => {
            if (!selectedEventId || guestIds.length === 0) return false;
            const result = channel === 'email'
              ? await sendEmailInvites(selectedEventId, guestIds)
              : await sendSmsInvites(selectedEventId, guestIds);
            if (result) await refetchGuests();
            return !!result;
          }}
        />

        {/* Smart RSVP Analytics — slide-over (Communications Centre) */}
        <SmartRsvpAnalyticsPanel
          eventId={selectedEventId}
          open={showAnalyticsPanel}
          onOpenChange={setShowAnalyticsPanel}
        />

        {/* Guest Intelligence Centre — modular insights panel (Phase 1) */}
        <GuestIntelligencePanel
          open={showIntelligencePanel}
          onClose={() => setShowIntelligencePanel(false)}
          guests={guests}
          tables={tables}
          event={selectedEvent ? {
            id: selectedEvent.id,
            date: (selectedEvent as any).date ?? null,
            rsvp_deadline: (selectedEvent as any).rsvp_deadline ?? null,
            guest_limit: (selectedEvent as any).guest_limit ?? null,
            partner1_name: (selectedEvent as any).partner1_name ?? null,
            partner2_name: (selectedEvent as any).partner2_name ?? null,
          } : null}
        />

        <GuestLimitDialog
          isOpen={showGuestLimitDialog}
          onClose={() => setShowGuestLimitDialog(false)}
          variant={guestLimitDialogVariant}
          guestLimit={selectedEvent?.guest_limit || 0}
        />
    </div>
    );
};
