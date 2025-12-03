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
  Search
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  validateRelationFields, 
  normalizePartner, 
  normalizeRole, 
  ImportError 
} from '@/lib/relationValidation';

type SortOption = 
  | 'first_name_asc' | 'first_name_desc'
  | 'last_name_asc' | 'last_name_desc' 
  | 'table_name_asc' | 'table_name_desc'
  | 'seat_no_asc' | 'seat_no_desc'
  | 'rsvp_attending_first' | 'rsvp_not_attending_first'
  | 'relation_asc' | 'relation_desc'
  | 'family_group_asc' | 'family_group_desc';

const SORT_OPTIONS = [
  { value: 'first_name_asc', label: 'First Name (A–Z)' },
  { value: 'first_name_desc', label: 'First Name (Z–A)' },
  { value: 'last_name_asc', label: 'Last Name (A–Z)' },
  { value: 'last_name_desc', label: 'Last Name (Z–A)' },
  { value: 'table_name_asc', label: 'Table (A→Z)' },
  { value: 'table_name_desc', label: 'Table (Z→A)' },
  { value: 'seat_no_asc', label: 'Seat No. (1→9)' },
  { value: 'rsvp_attending_first', label: 'RSVP (Attending → Pending → Not Attending)' },
  { value: 'rsvp_not_attending_first', label: 'RSVP (Not Attending → Pending → Attending)' },
  { value: 'relation_asc', label: 'Relation (A–Z)' },
  { value: 'relation_desc', label: 'Relation (Z–A)' },
  { value: 'family_group_asc', label: 'Family/Group (A–Z)' },
  { value: 'family_group_desc', label: 'Family/Group (Z–A)' },
] as const;

// Template headers (no who_is_display as it's computed)
const IMPORT_TEMPLATE_HEADERS = [
  'first_name', 'last_name', 'table_name', 'seat_no',
  'rsvp', 'dietary', 'mobile', 'email', 'notes', 
  'relation_partner', 'relation_role'
];

// Export headers (includes who_is_display)
const EXPORT_HEADERS = [
  'first_name', 'last_name', 'table_name', 'seat_no',
  'rsvp', 'dietary', 'mobile', 'email', 'notes', 
  'relation_partner', 'relation_role', 'relation_display'
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
  const [sortBy, setSortBy] = useState<SortOption>('first_name_asc');
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [firstGuestAdded, setFirstGuestAdded] = useState(false);
  type RelationMode = 'two' | 'single' | 'off';
  const [relationMode, setRelationMode] = useState<RelationMode>('two');
  const [showRelationSaved, setShowRelationSaved] = useState(false);
  const [partner1Name, setPartner1Name] = useState('');
  const [partner2Name, setPartner2Name] = useState('');
  
  // Bulk selection state
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [showBulkTableModal, setShowBulkTableModal] = useState(false);
  const [showBulkRsvpModal, setShowBulkRsvpModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

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
      // Update database in background
      const { error } = await supabase
        .from('events')
        .update({ relation_mode: newMode })
        .eq('id', selectedEventId);

      if (error) throw error;

      toast({
        description: "Relation mode updated successfully.",
      });

      await updateEvent(selectedEventId, { relation_mode: newMode } as any);
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

  // Handle saving partner names
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
      setSortBy('first_name_asc');
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
      // Initialize partner names from database
      setPartner1Name(selectedEvent.partner1_name || '');
      setPartner2Name(selectedEvent.partner2_name || '');
      
      // Only update relationMode if database provides a valid value
      const modeFromDb = (selectedEvent as any)?.relation_mode;
      if (modeFromDb === 'two' || modeFromDb === 'single' || modeFromDb === 'off') {
        if (modeFromDb !== relationMode) {
          setRelationMode(modeFromDb as RelationMode);
        }
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

    // First, sort all guests
    const allSortedGuests = [...guests].sort((a, b) => {
      const firstA = a.first_name?.toLowerCase() || '';
      const firstB = b.first_name?.toLowerCase() || '';
      return firstA.localeCompare(firstB);
    });

    // Apply search filter
    const filtered = searchTerm
      ? allSortedGuests.filter(guest =>
          guest.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          guest.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          guest.family_group?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : allSortedGuests;

    // Group by family_group
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

    // Add families and couples
    familyMap.forEach((members, groupName) => {
      const type = members.length === 2 ? 'couple' : 'family';
      groups.push({ type, groupName, members });
    });

    // Add individuals
    individuals.forEach(guest => {
      groups.push({ 
        type: 'individual', 
        groupName: null, 
        members: [guest] 
      });
    });

    return groups;
  }, [guests, searchTerm]);

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
    
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'first_name_asc':
          return (a.first_name || '').localeCompare(b.first_name || '');
        case 'first_name_desc':
          return (b.first_name || '').localeCompare(a.first_name || '');
        case 'last_name_asc':
          return (a.last_name || '').localeCompare(b.last_name || '');
        case 'last_name_desc':
          return (b.last_name || '').localeCompare(a.last_name || '');
        case 'table_name_asc':
          const tableA = getTableName(a) || 'zzz';
          const tableB = getTableName(b) || 'zzz';
          return tableA.localeCompare(tableB);
        case 'table_name_desc':
          const tableA2 = getTableName(a) || '';
          const tableB2 = getTableName(b) || '';
          return tableB2.localeCompare(tableA2);
        case 'seat_no_asc':
          return (a.seat_no || 999) - (b.seat_no || 999);
        case 'rsvp_attending_first':
          const orderA = a.rsvp === 'Attending' ? 0 : a.rsvp === 'Pending' ? 1 : 2;
          const orderB = b.rsvp === 'Attending' ? 0 : b.rsvp === 'Pending' ? 1 : 2;
          return orderA - orderB;
        case 'rsvp_not_attending_first':
          const orderA2 = a.rsvp === 'Not Attending' ? 0 : a.rsvp === 'Pending' ? 1 : 2;
          const orderB2 = b.rsvp === 'Not Attending' ? 0 : b.rsvp === 'Pending' ? 1 : 2;
          return orderA2 - orderB2;
        case 'relation_asc':
          const partnerNameA = a.relation_partner === 'partner_one' ? selectedEvent?.partner1_name : selectedEvent?.partner2_name;
          const partnerNameB = b.relation_partner === 'partner_one' ? selectedEvent?.partner1_name : selectedEvent?.partner2_name;
          const roleA = RELATION_ROLE_LABELS[a.relation_role] || '';
          const roleB = RELATION_ROLE_LABELS[b.relation_role] || '';
          
          // Primary sort: partner name
          const partnerCompare = (partnerNameA || 'zzz').localeCompare(partnerNameB || 'zzz');
          if (partnerCompare !== 0) return partnerCompare;
          
          // Secondary sort: role
          return roleA.localeCompare(roleB);
        case 'relation_desc':
          const partnerNameA3 = a.relation_partner === 'partner_one' ? selectedEvent?.partner1_name : selectedEvent?.partner2_name;
          const partnerNameB3 = b.relation_partner === 'partner_one' ? selectedEvent?.partner1_name : selectedEvent?.partner2_name;
          const roleA3 = RELATION_ROLE_LABELS[a.relation_role] || '';
          const roleB3 = RELATION_ROLE_LABELS[b.relation_role] || '';
          
          // Primary sort: partner name (desc)
          const partnerCompare3 = (partnerNameB3 || '').localeCompare(partnerNameA3 || '');
          if (partnerCompare3 !== 0) return partnerCompare3;
          
          // Secondary sort: role (desc)
          return roleB3.localeCompare(roleA3);
        case 'family_group_asc':
          return (a.family_group || '').localeCompare(b.family_group || '');
        case 'family_group_desc':
          return (b.family_group || '').localeCompare(a.family_group || '');
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [guests, sortBy, tables, selectedEvent, searchTerm]);


  // CSV Functions
  const downloadTemplate = () => {
    const csvContent = [
      IMPORT_TEMPLATE_HEADERS.join(','),
      'John,Doe,Table 1,1,Attending,NA,1234567890,john@example.com,Sample note,partner_one,father',
      'Jane,Smith,Table 2,3,Pending,Vegan,,jane@example.com,,partner_two,bridal_party'
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'guest-list-import-template.csv';
    link.click();
  };

  const exportGuestList = () => {
    if (!selectedEvent || !sortedGuests.length) return;
    
    const csvRows = [
      EXPORT_HEADERS.join(','),
      ...sortedGuests.map(guest => [
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
        (guest.notes || '').replace(/,/g, ';').replace(/\n/g, ' ')
      ].map(field => `"${field}"`).join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const eventName = selectedEvent.name.replace(/[^a-zA-Z0-9]/g, '-');
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    link.download = `guest-list-${eventName}-${dateStr}.csv`;
    link.click();
    
    toast({ title: `Exported ${sortedGuests.length} guests successfully` });
  };

  const handleImportCSV = () => {
    if (!selectedEvent) return;
    
    whoIsAnalytics.importStarted(selectedEvent.id, 0); // Will update with actual count
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
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
          
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
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
    const namesAreMissing = relationMode === 'two'
      ? (partner1Missing || partner2Missing)  // Wedding/engagement: need BOTH
      : relationMode === 'single' 
        ? partner1Missing                       // Single event: only need Partner 1
        : false;                                // Off mode: names not required
    
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

    // Count couple groups (2 members) and family groups (3+ members)
    familyGroups.forEach((members) => {
      if (members.length === 2) {
        stats.couple++;
      } else if (members.length >= 3) {
        stats.family++;
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
      {/* What relation is the guest to you? - Redesigned */}
      <div id="guest-tools-section" className="px-6 py-6">
        {selectedEventId && (
          <Card className="ww-box relative overflow-hidden transition-all duration-300 hover:shadow-purple-glow" 
            style={{ 
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 247, 255, 0.98) 100%)',
              boxShadow: '0 0 30px rgba(114, 72, 230, 0.15), 0 10px 25px rgba(114, 72, 230, 0.08)',
              borderColor: 'rgba(114, 72, 230, 0.2)', 
              borderWidth: '1px',
              backdropFilter: 'blur(10px)'
            }}>
            {/* Purple gradient accent bar */}
            <div 
              className="absolute top-0 left-0 right-0 h-1 opacity-80"
              style={{
                background: 'linear-gradient(90deg, #7248e6 0%, #9d7aee 50%, #c4b5fd 100%)'
              }}
            />
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <h1 className="text-2xl font-medium text-[#7248e6] mb-2">
                    Add What Relation Is Each Guest To You
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose if this event has one or two hosts, or if you want to hide guest relations completely.
                  </p>
                </div>
              </div>
              
              <div className="space-y-6 mt-6">
                {/* Mode Selection Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={() => handleRelationModeChange('two')}
                          className={cn(
                            "flex-1 sm:flex-none h-auto py-4 px-6 rounded-xl transition-all duration-200",
                            relationMode === 'two'
                              ? "bg-gradient-to-br from-[#7248e6] to-[#9d7aee] text-primary-foreground shadow-lg transform scale-[1.02]"
                              : "bg-white/80 text-foreground border-2 border-[#7248e6] hover:border-[#7248e6]/80 hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-100/50 hover:shadow-lg backdrop-blur-sm"
                          )}
                          style={relationMode === 'two' ? { 
                            boxShadow: '0 4px 16px rgba(114, 72, 230, 0.5), 0 0 20px rgba(114, 72, 230, 0.3)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                          } : undefined}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className="relative">
                              <span className="text-2xl">💍</span>
                              {relationMode === 'two' && (
                                <span className="absolute -top-1 -right-1 text-sm">✅</span>
                              )}
                            </div>
                            <span className="text-sm font-medium">Wedding / Engagement</span>
                            <span className="text-xs opacity-80">(two people)</span>
                          </div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>For events with two people</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={() => handleRelationModeChange('single')}
                          className={cn(
                            "flex-1 sm:flex-none h-auto py-4 px-6 rounded-xl transition-all duration-200",
                            relationMode === 'single'
                              ? "bg-gradient-to-br from-[#7248e6] to-[#9d7aee] text-primary-foreground shadow-lg transform scale-[1.02]"
                              : "bg-white/80 text-foreground border-2 border-[#7248e6] hover:border-[#7248e6]/80 hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-100/50 hover:shadow-lg backdrop-blur-sm"
                          )}
                          style={relationMode === 'single' ? { 
                            boxShadow: '0 4px 16px rgba(114, 72, 230, 0.5), 0 0 20px rgba(114, 72, 230, 0.3)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                          } : undefined}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className="relative">
                              <span className="text-2xl">🎂</span>
                              {relationMode === 'single' && (
                                <span className="absolute -top-1 -right-1 text-sm">✅</span>
                              )}
                            </div>
                            <span className="text-sm font-medium">Single Person Event</span>
                            <span className="text-xs opacity-80">(birthday, etc.)</span>
                          </div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>For birthdays or solo celebrations</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={() => handleRelationModeChange('off')}
                          className={cn(
                            "flex-1 sm:flex-none h-auto py-4 px-6 rounded-xl transition-all duration-200",
                            relationMode === 'off'
                              ? "bg-gradient-to-br from-[#7248e6] to-[#9d7aee] text-primary-foreground shadow-lg transform scale-[1.02]"
                              : "bg-white/80 text-foreground border-2 border-[#7248e6] hover:border-[#7248e6]/80 hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-100/50 hover:shadow-lg backdrop-blur-sm"
                          )}
                          style={relationMode === 'off' ? { 
                            boxShadow: '0 4px 16px rgba(114, 72, 230, 0.5), 0 0 20px rgba(114, 72, 230, 0.3)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                          } : undefined}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className="relative">
                              <span className="text-2xl">🚫</span>
                              {relationMode === 'off' && (
                                <span className="absolute -top-1 -right-1 text-sm">✅</span>
                              )}
                            </div>
                            <span className="text-sm font-medium">Hide Guest Relation</span>
                            <span className="text-xs opacity-80">&nbsp;</span>
                          </div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Hide all relation fields</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Saved Indicator */}
                {showRelationSaved && (
                  <div className="flex justify-center">
                    <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 shadow-sm animate-in fade-in slide-in-from-top-2">
                      <span className="text-sm font-semibold text-green-700">✅ Saved</span>
                    </div>
                  </div>
                )}

                {/* Partner Name Inputs - Always show both fields, but disable based on mode */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Partner 1 Field */}
                  <div className={relationMode === 'off' ? 'opacity-50' : ''}>
                    <Label htmlFor="partner1_name" className="text-sm font-medium">
                      {relationMode === 'two' ? 'Partner 1 First Name' : 'Host First Name'}
                    </Label>
                    <Input
                      id="partner1_name"
                      value={partner1Name}
                      onChange={(e) => setPartner1Name(e.target.value)}
                      onBlur={handleSavePartnerNames}
                      placeholder={relationMode === 'two' ? "e.g., Reema" : "e.g., Sarah"}
                      disabled={relationMode === 'off'}
                      className={cn(
                        "mt-1 rounded-full border-2 focus:ring-2 focus:ring-primary/20 bg-white/80 backdrop-blur-sm transition-all duration-200",
                        relationMode === 'off' 
                          ? "border-[#7248e6]/30 cursor-not-allowed" 
                          : "border-[#7248e6] focus:border-[#7248e6] hover:border-[#7248e6]/80"
                      )}
                    />
                  </div>

                  {/* Partner 2 Field */}
                  <div className={relationMode !== 'two' ? 'opacity-50' : ''}>
                    <Label htmlFor="partner2_name" className="text-sm font-medium">
                      Partner 2 First Name
                    </Label>
                    <Input
                      id="partner2_name"
                      value={partner2Name}
                      onChange={(e) => setPartner2Name(e.target.value)}
                      onBlur={handleSavePartnerNames}
                      placeholder="e.g., Hossam"
                      disabled={relationMode !== 'two'}
                      className={cn(
                        "mt-1 rounded-full border-2 focus:ring-2 focus:ring-primary/20 bg-white/80 backdrop-blur-sm transition-all duration-200",
                        relationMode !== 'two' 
                          ? "border-[#7248e6]/30 cursor-not-allowed" 
                          : "border-[#7248e6] focus:border-[#7248e6] hover:border-[#7248e6]/80"
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
        </div>

      <Card className="border-2 border-primary" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {/* Header Controls */}
        <div className="px-6 py-4">
          {/* Page Title and Description */}
          <div className="mb-6">
            <h1 className="text-2xl font-medium text-[#7248e6] mb-2">
              Guest List
            </h1>
            <p className="text-muted-foreground">
              Manage your event guests, track RSVPs, assign tables, and organize seating arrangements
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:justify-between">
            {/* Left Side: Event selector and search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="event-select" className="whitespace-nowrap text-sm font-medium">
                  Choose Event:
                </Label>
                <Select value={selectedEventId || "no-event"} onValueChange={handleEventSelect}>
                  <SelectTrigger className="w-[300px] border-[#7248E6] [&>span]:font-bold [&>span]:text-[#7248E6]">
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
              
              {/* Search field */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search guests by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-[250px] border-[#7248E6]"
                />
              </div>
            </div>
            
            {/* Right Side: All Control Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <TooltipProvider>
                {/* Sort By Dropdown */}
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
                        <DropdownMenuContent align="end" className="w-56">
                          {SORT_OPTIONS.map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={() => handleSortChange(option.value)}
                              className={sortBy === option.value ? "bg-accent" : ""}
                            >
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

                {/* Import/Export CSV Dropdown */}
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
              </TooltipProvider>

              {/* Add Guests button */}
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

          {/* Guest Type Stats Row */}
          <div className="flex items-center justify-end gap-2 px-6 pt-4 pb-4">
            {/* Total Guests Badge */}
            <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background h-9 px-3 w-[140px] bg-white border border-primary text-foreground">
              <Users className="w-4 h-4" />
              {guestCount} Guest{guestCount !== 1 ? 's' : ''}
            </div>

            {/* Individual Badge */}
            <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium h-9 px-3 w-[140px] bg-[#ff1493] text-white">
              {individualCount} Individual{individualCount !== 1 ? 's' : ''}
            </div>

            {/* Couple Badge */}
            <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium h-9 px-3 w-[140px] bg-[#FF5F1F] text-white">
              {coupleCount} Couple{coupleCount !== 1 ? 's' : ''}
            </div>

            {/* Family Badge */}
            <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium h-9 px-3 w-[140px] bg-[#0000FF] text-white">
              {familyCount} Famil{familyCount !== 1 ? 'ies' : 'y'}
            </div>
          </div>
        </div>

        {/* Who Is Filters */}

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
                <TableHead className="w-20">Table No</TableHead>
                <TableHead className="w-20">Seat No.</TableHead>
                <TableHead className="w-24">RSVP Status</TableHead>
                {relationMode !== 'off' && <TableHead className="w-32">Relation</TableHead>}
                <TableHead className="w-24">Dietary Requirements</TableHead>
                <TableHead className="w-24 pl-16">Mobile</TableHead>
                <TableHead className="w-36 pl-16">Email</TableHead>
                <TableHead className="w-28">Family/Group</TableHead>
                <TableHead className="w-20">Notes</TableHead>
                <TableHead className="w-24 rounded-tr-lg">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guestsLoading ? (
                <TableRow className="border-card-border">
                  <TableCell colSpan={12} className="text-center py-8">
                    Loading guests...
                  </TableCell>
                </TableRow>
              ) : totalGuestCount === 0 ? (
                <TableRow className="border-card-border">
                  <TableCell colSpan={12} className="text-center py-8">
                    {/* Empty - the "No Guests Yet" widget is now in the header */}
                  </TableCell>
                </TableRow>
              ) : (
                groupedGuests.map((group, groupIndex) => (
                  <React.Fragment key={`group-${groupIndex}-${group.groupName || 'individual'}`}>
                    {/* Group Header (for couples and families) */}
                    {group.type !== 'individual' && (
                      <TableRow className="bg-purple-50/50 border-l-4 border-l-[#7248e6]">
                        <TableCell colSpan={relationMode !== 'off' ? 13 : 12} className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#7248e6]" />
                            <span className="font-semibold text-sm text-[#7248e6]">
                              {group.groupName}
                            </span>
                            <Badge variant="secondary" className="text-xs">
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
                          <TableCell className="w-12">
                            <Checkbox
                              checked={selectedGuestIds.has(guest.id)}
                              onCheckedChange={(checked) => handleSelectGuest(guest.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-medium w-28">
                            {group.type !== 'individual' && (
                              <span className="inline-block w-2 h-2 rounded-full bg-[#7248e6] mr-2 align-middle" />
                            )}
                            {guest.first_name}
                          </TableCell>
                          <TableCell className="font-medium w-28">{guest.last_name}</TableCell>
                          <TableCell className="w-20">{getTableName(guest) || '—'}</TableCell>
                          <TableCell className="w-20">
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
                          <TableCell className="w-24">
                            <Badge 
                              variant={getRsvpBadgeVariant(guest.rsvp)} 
                              className="text-xs text-white"
                            >
                              {getRsvpDisplayLabel(guest.rsvp)}
                            </Badge>
                          </TableCell>
                          {relationMode !== 'off' && (
                          <TableCell className="w-32">
                            <RelationBadge
                              display={guest.relation_display || ''}
                              partner={guest.relation_partner || ''}
                              role={guest.relation_role || ''}
                              partnerName={guest.relation_partner === 'partner_one' ? selectedEvent?.partner1_name : selectedEvent?.partner2_name}
                              onClick={() => handleEditRelation(guest)}
                              isEmpty={!guest.relation_display}
                            />
                          </TableCell>
                          )}
                    <TableCell className="w-24">
                      <span className="text-sm text-foreground">
                        {guest.dietary || '—'}
                      </span>
                    </TableCell>
                          <TableCell className="w-24 pl-16">{renderPill(!!guest.mobile && guest.mobile.trim() !== '')}</TableCell>
                          <TableCell className="w-36 pl-16">{renderPill(!!guest.email && guest.email.trim() !== '')}</TableCell>
                          <TableCell className="w-28">
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
                          <TableCell className="w-20">{renderPill(!!guest.notes && guest.notes.trim() !== '')}</TableCell>
                          <TableCell className="w-28">
                            <div className="flex items-center space-x-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditGuest(guest)}
                              >
                                <Edit className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteGuest(guest)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
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
        <AlertDialog open={showBulkDeleteModal} onOpenChange={setShowBulkDeleteModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedGuestIds.size} Guests?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the selected guests.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
};
