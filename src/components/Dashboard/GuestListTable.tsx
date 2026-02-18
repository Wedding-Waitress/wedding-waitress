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
  ListOrdered
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
import { AddGuestModal } from './AddGuestModal';
import { GuestDeleteConfirmationModal } from './GuestDeleteConfirmationModal';

import { RelationBadge } from './RelationBadge';
import { supabase } from "@/integrations/supabase/client";
import { getRsvpBadgeVariant, getRsvpDisplayLabel } from "@/lib/rsvp";
import { formatDisplayDate } from '@/lib/utils';
import { RELATION_ROLE_LABELS, computeRelationDisplay } from "@/lib/relationUtils";
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { ImportErrorModal } from './ImportErrorModal';
import { whoIsAnalytics } from '@/lib/analytics';
import { GuestBulkActionsBar } from './GuestBulkActionsBar';
import { BulkTableAssignmentModal } from './BulkTableAssignmentModal';
import { BulkRsvpUpdateModal } from './BulkRsvpUpdateModal';
import { SendRsvpConfirmModal } from './SendRsvpConfirmModal';
import { RsvpActivationModal } from './RsvpActivationModal';
import { useRsvpInvites } from '@/hooks/useRsvpInvites';
import { useRsvpPurchase } from '@/hooks/useRsvpPurchase';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  { value: 'individuals_first', label: 'Individuals', icon: User },
  { value: 'couples_first', label: 'Couples', icon: Heart },
  { value: 'families_first', label: 'Families', icon: Users },
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
  'Dairy Free', 'Nut Free', 'Halal', 'Kosha', 'Vendor Meal'
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
  const { guests, loading: guestsLoading, deleteGuest, refetchGuests } = useRealtimeGuests(selectedEventId);
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
  const [showBulkTableModal, setShowBulkTableModal] = useState(false);
  const [showBulkRsvpModal, setShowBulkRsvpModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [sendChannel, setSendChannel] = useState<'email' | 'sms'>('email');
  const { sendEmailInvites, sendSmsInvites, sending } = useRsvpInvites();
  const { hasPurchased: hasRsvpPurchase, loading: rsvpPurchaseLoading } = useRsvpPurchase(selectedEventId);
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
    } catch (error) {
      console.error('Error updating relation visibility:', error);
      // Revert
      setRelationsHidden(!hidden);
      setRelationMode(hidden ? eventType : 'off');
    }
  };

  const handleSavePartnerNames = async () => {
    if (!selectedEventId) return;

    try {
      const { error} = await supabase
        .from('events')
        .update({
          partner1_name: partner1Name,
          partner2_name: partner2Name,
        })
        .eq('id', selectedEventId);

      if (error) throw error;

      setShowRelationSaved(true);
      setTimeout(() => setShowRelationSaved(false), 2000);

      await updateEvent(selectedEventId, { 
        partner1_name: partner1Name,
        partner2_name: partner2Name 
      });

      // Update local state so "Add Guest" button becomes active
      const bothFilled = relationsHidden
        ? true
        : eventType === 'two'
          ? (partner1Name?.trim() && partner2Name?.trim())
          : partner1Name?.trim();

      if (bothFilled) {
        setPartnerNamesSaved(true);
        setShowNamesValidation(false);
      }
    } catch (error) {
      console.error('Error saving partner names:', error);
      toast({
        title: "Error",
        description: "Failed to save partner names",
        variant: "destructive"
      });
    }
  };

  // Load selected event from localStorage on mount only if no prop provided
  useEffect(() => {
    if (propSelectedEventId === undefined) {
      const savedEventId = localStorage.getItem('active_event_id');
      if (savedEventId && events.some(event => event.id === savedEventId)) {
        setLocalSelectedEventId(savedEventId);
        
        // Load saved sort preference for this event
        const savedSort = localStorage.getItem(`guestSort_${savedEventId}`);
        if (savedSort && SORT_OPTIONS.some(opt => opt.value === savedSort)) {
          setSortBy(savedSort as SortOption);
        } else {
          setSortBy('first_name');
        }
      }
    }
  }, [events, propSelectedEventId]);


  // Save sort preference when changed
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    if (selectedEventId) {
      localStorage.setItem(`guestSort_${selectedEventId}`, newSort);
    }
  };

  // Refresh both guests and tables to keep counts in sync
  const handleGuestSuccess = async () => {
    await Promise.all([refetchGuests(), fetchTables()]);
    
    // Clear names validation if this was the first guest added
    if (guests.length === 0 && showNamesValidation) {
      setShowNamesValidation(false);
    }
    
    // Set first guest added flag when first guest is successfully added
    if (guests.length === 0) {
      setFirstGuestAdded(true);
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

  // Save selected event to localStorage when changed - use same key as Table Setup
  const handleEventSelect = (eventId: string) => {
    // Filter out placeholder values
    if (eventId === "no-event") {
      return;
    }
    
    if (propOnEventSelect) {
      // Use prop callback if provided (when used from Dashboard)
      propOnEventSelect(eventId);
    } else {
      // Use local state if standalone
      setLocalSelectedEventId(eventId);
      localStorage.setItem('active_event_id', eventId);
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
    }
  }, [selectedEvent]); // Removed guests.length to prevent toggle reset

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
      (guest.notes || '').replace(/\n/g, ' ')
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
    
    // Normal flow - open the add guest modal (allowed after saving required names)
    setEditingGuest(null);
    setShowAddModal(true);
  };

  const handleEditGuest = (guest: any) => {
    setEditingGuest(guest);
    setShowAddModal(true);
  };

  const handleEditRelation = (guest: any) => {
    setEditingGuest({ ...guest, focusRelation: true });
    setShowAddModal(true);
  };

  const guestCount = sortedGuests.length;
  const totalGuestCount = guests.length;

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
      className={`text-white ${condition ? yesColor : noColor}`}
    >
      {condition ? "YES" : "NO"}
    </Badge>
  );

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <div>Loading events...</div>
      </Card>
    );
  }

  // No event selected - show placeholder message like Table Setup
  if (!selectedEventId) {
    return (
      <Card>
        <div className="p-8 text-center space-y-4">
          <div className="text-muted-foreground">Select an event to view its guest list</div>
          
          {/* Event dropdown */}
          <div className="flex justify-center">
            <Select onValueChange={handleEventSelect} value="no-event">
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select an event..." />
              </SelectTrigger>
              <SelectContent>
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
    );
  }

  return (
    <>
      <Card className="border-2 border-primary" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {/* Header Controls */}
        <div className="px-3 sm:px-6 py-4">
          {/* Page Title with Couple Names Section */}
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Left: Title, Description, Event selector and Search */}
            <div className="w-full">
              <div className="flex items-baseline gap-3 mb-4">
                <h1 className="text-xl sm:text-2xl font-medium text-primary whitespace-nowrap">
                  Guest List
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Manage your event guests, track RSVPs, assign tables, and organize seating arrangements
                </p>
              </div>
              
              {/* Event selector + Type of Event + Guest Relations - all on same row */}
              <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_2fr_1fr] gap-4 items-stretch">
                <div className="border-2 border-[#7248E6] rounded-lg p-4 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-green-500 text-white font-bold text-sm w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0">1</span>
                    <Label htmlFor="event-select" className="whitespace-nowrap text-sm font-semibold text-primary">
                      Choose Event:
                    </Label>
                  </div>
                  <Select value={selectedEventId || "no-event"} onValueChange={handleEventSelect}>
                    <SelectTrigger className="w-full border-2 border-primary [&>span]:font-bold [&>span]:text-primary h-11 sm:h-10">
                      <SelectValue placeholder="Select an event..." />
                    </SelectTrigger>
                    <SelectContent>
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

                {/* Box 1: Type of Event */}
                {selectedEventId && (
                  <div className="border-2 border-[#7248E6] rounded-lg p-4 flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="bg-green-500 text-white font-bold text-sm w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0">2</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-primary">Type of Event:</span>
                        <span className="text-xs text-muted-foreground">(Two people or single person event)</span>
                        {showRelationSaved && (
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Saved</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleEventTypeChange('two')}
                         className={cn(
                           "h-8 text-sm justify-start transition-all",
                           eventType === 'two'
                             ? "border-2 border-green-500 bg-green-50 text-green-500 shadow-md hover:bg-green-100"
                             : "border-2 border-primary bg-primary/10 text-primary hover:bg-primary/15"
                         )}
                      >
                        💍 Wedding Or Engagement
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleEventTypeChange('single')}
                         className={cn(
                           "h-8 text-sm justify-start transition-all",
                           eventType === 'single'
                             ? "border-2 border-green-500 bg-green-50 text-green-500 shadow-md hover:bg-green-100"
                             : "border-2 border-primary bg-primary/10 text-primary hover:bg-primary/15"
                         )}
                      >
                        🎂 Birthday, Single Person Event Or Corporate Party
                      </Button>
                    </div>
                  </div>
                )}

                {/* Box 2: Guest Relations */}
                {selectedEventId && (
                  <div className="border-2 border-[#7248E6] rounded-lg p-4 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-green-500 text-white font-bold text-sm w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0">3</span>
                      <span className="text-sm font-semibold text-primary">Add what relationship each guest is to you. This will help your staff know who is who at your venue.</span>
                    </div>
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <span className="text-sm font-bold text-black">Activate</span>
                      <Switch
                        id="hide-relations"
                        checked={relationsHidden}
                        onCheckedChange={(checked) => handleHideRelationsToggle(checked)}
                        className="data-[state=checked]:bg-destructive data-[state=unchecked]:bg-green-500"
                      />
                      <span className="text-sm font-bold text-black">Deactivate</span>
                    </div>
                    {!relationsHidden && (
                    <div className="flex flex-col gap-3">
                      {/* Toggle: Use default names or custom names */}
                      <div className="flex flex-col gap-2">
                        <label
                          className={cn(
                            "flex items-center gap-2 cursor-pointer rounded-lg border-2 p-2 text-sm font-bold transition-all",
                            useDefaultNames
                              ? "border-green-500 bg-green-50 text-green-500 shadow-md"
                              : "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                          )}
                          onClick={async () => {
                            try {
                              setUseDefaultNames(true);
                              setPartner1Name('Bride');
                              setPartner2Name('Groom');
                              setPartnerNamesSaved(true);
                              setShowNamesValidation(false);
                              if (selectedEventId) {
                                await supabase
                                  .from('events')
                                  .update({ partner1_name: 'Bride', partner2_name: 'Groom' })
                                  .eq('id', selectedEventId);
                              }
                            } catch (err) {
                              console.error('Error saving default partner names:', err);
                            }
                          }}
                        >
                          <input type="radio" name="nameChoice" checked={useDefaultNames} readOnly className={useDefaultNames ? "accent-green-500" : "accent-primary"} />
                          Leave Partner 1 & Partner 2 Names as Bride/Groom
                        </label>
                        <label
                          className={cn(
                            "flex items-center gap-2 cursor-pointer rounded-lg border-2 p-2 text-sm font-bold transition-all",
                            !useDefaultNames
                              ? "border-green-500 bg-green-50 text-green-500 shadow-md"
                              : "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                          )}
                          onClick={() => {
                            setUseDefaultNames(false);
                          }}
                        >
                          <input type="radio" name="nameChoice" checked={!useDefaultNames} readOnly className={!useDefaultNames ? "accent-green-500" : "accent-primary"} />
                          Add New Names for Partner 1 & Partner 2
                        </label>
                      </div>

                      {/* Custom name inputs - only shown when useDefaultNames is false */}
                      {!useDefaultNames && (
                        <>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium w-24 shrink-0">Partner 1:</Label>
                            <Input
                              value={partner1Name}
                              onChange={(e) => {
                                setPartner1Name(e.target.value);
                                setPartnerNamesSaved(false);
                              }}
                              placeholder="e.g. Sarah"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium w-24 shrink-0">Partner 2:</Label>
                            <Input
                              value={partner2Name}
                              onChange={(e) => {
                                setPartner2Name(e.target.value);
                                setPartnerNamesSaved(false);
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
                              size="sm"
                              onClick={handleSavePartnerNames}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-sm"
                            >
                              Save Names
                            </Button>
                            {partnerNamesSaved && (
                              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                ✓ Names saved
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    )}
                  </div>
                )}
                {/* Box 4: Add Guest */}
                <div className="border-2 border-primary rounded-lg p-4 flex flex-col items-start gap-3 bg-primary/10">
                  <div className="flex items-center gap-2">
                    <span className="bg-green-500 text-white font-bold text-sm w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0">4</span>
                    <span className="text-sm font-semibold text-primary">Let the fun begin! Now start adding your guest list here.</span>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAddGuest}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Add Guest
                  </Button>
                </div>
              </div>

            </div>
          </div>

          {/* Stats + Control Buttons - Left/Right Layout */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 flex-wrap mb-4 sm:mb-6 mt-4">
            {/* LEFT SIDE: Search, category pills, Guests count */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search guests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-[180px] sm:w-[200px] border-2 border-primary h-8 sm:h-9 rounded-full text-xs sm:text-sm"
                />
              </div>
              <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-xs font-medium h-7 px-3 bg-pink-500 text-white flex-shrink-0">
                {individualCount} Individual{individualCount !== 1 ? 's' : ''}
              </div>
              <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-xs font-medium h-7 px-3 bg-orange-500 text-white flex-shrink-0">
                {coupleCount} Couple{coupleCount !== 1 ? 's' : ''}
              </div>
              <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-xs font-medium h-7 px-3 bg-blue-600 text-white flex-shrink-0">
                {familyCount} Famil{familyCount !== 1 ? 'ies' : 'y'}
              </div>
              <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-xs font-medium ring-offset-background h-7 px-3 bg-white border border-primary text-foreground">
                <Users className="w-4 h-4" />
                {guestCount} Total Guest{guestCount !== 1 ? 's' : ''}
              </div>
            </div>

            {/* RIGHT SIDE: Sort By, Import/Export, Add Guest */}
            <div className="flex items-center gap-2 flex-wrap">

              <TooltipProvider>
                {/* Sort By Dropdown - hidden on mobile */}
                <div className="hidden sm:block">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="default" 
                              size="xs"
                              className="rounded-full flex items-center gap-2"
                              disabled={!selectedEventId}
                            >
                              <ArrowUpDown className="w-4 h-4" />
                              Sort By
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
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
                <div className="hidden sm:block">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="default" 
                              size="xs"
                              className="rounded-full flex items-center gap-2"
                              disabled={!selectedEventId}
                            >
                              <FileText className="w-4 h-4" />
                              Import / Export CSV
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={downloadTemplate}>
                              <Download className="w-4 h-4 mr-2" />
                              Download Template
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleImportCSV}>
                              <Upload className="w-4 h-4 mr-2" />
                              Import CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={exportGuestList}
                              disabled={guestCount === 0}
                            >
                              <Download className="w-4 h-4 mr-2" />
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

              {/* Add Guest Button */}
              {totalGuestCount === 0 ? (
                <Button 
                  variant="default"
                  size="sm"
                  onClick={handleAddGuest}
                  className={`${
                    partnerNamesSaved || firstGuestAdded || totalGuestCount > 0
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  } rounded-full flex items-center gap-2`}
                >
                  <Users className="w-4 h-4" />
                  Add First Guest
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={handleAddGuest}
                  className="bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Add Guest
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 bg-primary text-primary-foreground rounded-tl-lg">
                  <Checkbox
                    checked={selectedGuestIds.size === sortedGuests.length && sortedGuests.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-28">First Name</TableHead>
                <TableHead className="w-28">Last Name</TableHead>
                <TableHead className="w-24 pl-16">Mobile</TableHead>
                <TableHead className="w-36 pl-16">Email</TableHead>
                <TableHead className="w-24">RSVP Invite</TableHead>
                <TableHead className="w-24">RSVP Status</TableHead>
                <TableHead className="w-20">Table No</TableHead>
                <TableHead className="w-20">Seat No.</TableHead>
                <TableHead className="w-32">Relation</TableHead>
                <TableHead className="w-24">Dietary Requirements</TableHead>
                <TableHead className="w-28">Family/Group</TableHead>
                <TableHead className="w-20">Notes</TableHead>
                <TableHead className="w-24 rounded-tr-lg">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guestsLoading ? (
                <TableRow className="border-card-border">
                  <TableCell colSpan={14} className="text-center py-8">
                    Loading guests...
                  </TableCell>
                </TableRow>
              ) : totalGuestCount === 0 ? (
                <TableRow className="border-card-border">
                  <TableCell colSpan={14} className="text-center py-8">
                    {/* Empty - the "No Guests Yet" widget is now in the header */}
                  </TableCell>
                </TableRow>
              ) : (
                groupedGuests.map((group, groupIndex) => (
                  <React.Fragment key={`group-${groupIndex}-${group.groupName || 'individual'}`}>
                    {/* Group Header (for couples and families) */}
                    {group.type !== 'individual' && (
                      <TableRow className={group.type === 'family' ? "bg-blue-600" : "bg-orange-500"}>
                        <TableCell colSpan={14} className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-white" />
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
                            "hover:bg-purple-50 dark:hover:bg-purple-950/20",
                            group.type !== 'individual' && "border-l-4 border-l-purple-200",
                            group.type !== 'individual' && isLastMember && "border-b-2 border-b-[#7248e6]"
                          )}
                        >
                          <TableCell className="py-1 w-12">
                            <Checkbox
                              checked={selectedGuestIds.has(guest.id)}
                              onCheckedChange={(checked) => handleSelectGuest(guest.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="py-1 font-medium w-28">
                            {group.type !== 'individual' && (
                              <span className="inline-block w-2 h-2 rounded-full bg-[#7248e6] mr-2 align-middle" />
                            )}
                            {guest.first_name}
                          </TableCell>
                          <TableCell className="py-1 font-medium w-28">{guest.last_name}</TableCell>
                          <TableCell className="py-1 w-24 pl-16">{renderPill(!!guest.mobile && guest.mobile.trim() !== '')}</TableCell>
                          <TableCell className="py-1 w-36 pl-16">{renderPill(!!guest.email && guest.email.trim() !== '')}</TableCell>
                          <TableCell className="py-1 w-24">
                            {(() => {
                              const status = guest.rsvp_invite_status || 'not_sent';
                              const statusConfig: Record<string, { label: string; className: string }> = {
                                'not_sent': { label: 'Not Sent', className: 'bg-gray-400 text-white' },
                                'email_sent': { label: 'Email Sent', className: 'bg-blue-500 text-white' },
                                'sms_sent': { label: 'SMS Sent', className: 'bg-green-500 text-white' },
                                'both_sent': { label: 'Both Sent', className: 'bg-purple-500 text-white' },
                              };
                              const config = statusConfig[status] || statusConfig['not_sent'];
                              return (
                                <Badge className={`text-xs ${config.className}`}>
                                  {config.label}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="py-1 w-24">
                            <Badge 
                              variant={getRsvpBadgeVariant(guest.rsvp)} 
                              className="text-xs text-white"
                            >
                              {getRsvpDisplayLabel(guest.rsvp)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1 w-20">{getTableName(guest) || '—'}</TableCell>
                          <TableCell className="py-1 w-20">
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
                          <TableCell className="py-1 w-32">
                            <RelationBadge
                              display={guest.relation_display || ''}
                              partner={guest.relation_partner || ''}
                              role={guest.relation_role || ''}
                              partnerName={guest.relation_partner === 'partner_one' ? selectedEvent?.partner1_name : selectedEvent?.partner2_name}
                              onClick={() => handleEditRelation(guest)}
                              isEmpty={!guest.relation_display}
                            />
                          </TableCell>
                    <TableCell className="py-1 w-24">
                      <span className="text-sm text-foreground">
                        {guest.dietary || '—'}
                      </span>
                    </TableCell>
                          <TableCell className="py-1 w-28">
                            {(() => {
                              const typeLabel = getGuestTypeLabel(guest);
                              let colorClasses = 'bg-[#ff1493] text-white';
                              
                              if (typeLabel === 'Couple') {
                                colorClasses = 'bg-[#FF5F1F] text-white';
                              } else if (typeLabel === 'Family') {
                                colorClasses = 'bg-[#0000FF] text-white';
                              }
                              
                              return (
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClasses}`}>
                                  {typeLabel}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="py-1 w-20">
                            {guest.notes && guest.notes.trim() !== '' ? (
                              <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white bg-green-500 cursor-pointer">Yes</span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs z-[9999]">
                                    <p className="whitespace-pre-wrap">{guest.notes}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <Badge className="text-white bg-red-500">No</Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-1 w-28">
                            <div className="flex items-center space-x-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleEditGuest(guest)}
                                    >
                                      <Edit className="w-4 h-4 text-green-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top"><p>Edit</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleDeleteGuest(guest)}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top"><p>Delete</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

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

        {/* Bulk Actions Toolbar */}
        {selectedGuestIds.size > 0 && (
          <GuestBulkActionsBar
            selectedCount={selectedGuestIds.size}
            totalCount={sortedGuests.length}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onAssignTable={() => setShowBulkTableModal(true)}
            onUpdateRsvp={() => setShowBulkRsvpModal(true)}
            onDelete={() => setShowBulkDeleteModal(true)}
            onCancel={handleDeselectAll}
            onSendEmail={() => {
              setSendChannel('email');
              if (hasRsvpPurchase) {
                setShowSendModal(true);
              } else {
                setShowActivationModal(true);
              }
            }}
            onSendSms={() => {
              setSendChannel('sms');
              if (hasRsvpPurchase) {
                setShowSendModal(true);
              } else {
                setShowActivationModal(true);
              }
            }}
          />
        )}

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
          <DialogContent className="sm:max-w-md">
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
      </>
    );
};
