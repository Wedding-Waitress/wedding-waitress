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
import { RelationSettingsButton, RelationSettings } from './RelationSettingsModal';
import { ImportErrorModal } from './ImportErrorModal';
import { whoIsAnalytics } from '@/lib/analytics';
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
  
  // Local state for partner names to prevent input interruption
  const [localPartner1Name, setLocalPartner1Name] = useState('');
  const [localPartner2Name, setLocalPartner2Name] = useState('');
  const [partnerNamesSaved, setPartnerNamesSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [firstGuestAdded, setFirstGuestAdded] = useState(false);
  const [isWeddingEngagement, setIsWeddingEngagement] = useState(true);

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

  // Update local partner names when selected event changes
  useEffect(() => {
    if (selectedEvent) {
      setLocalPartner1Name(selectedEvent.partner1_name || '');
      setLocalPartner2Name(selectedEvent.partner2_name || '');
      
      // RESTORE toggle state from database field
      // If relation_allow_single_partner is false, it means this is a single-person event (toggle OFF)
      // If true or null, it's a wedding/engagement (toggle ON)
      const isWedding = selectedEvent.relation_allow_single_partner !== false;
      setIsWeddingEngagement(isWedding);
      
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

  // Manual save function for partner names
  const handleManualSavePartnerNames = useCallback(async () => {
    if (!selectedEvent || isSaving) return;

    const partner1Value = localPartner1Name?.trim();
    const partner2Value = localPartner2Name?.trim();

    // Validate based on toggle state
    if (!partner1Value) {
      toast({
        title: "Error",
        description: "Partner 1 name is required",
        variant: "destructive",
      });
      return;
    }

    // Only validate Partner 2 if this is a wedding/engagement (two-person event)
    if (isWeddingEngagement && !partner2Value) {
      toast({
        title: "Error",
        description: "Both partner names are required for wedding/engagement events",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('events')
        .update({ 
          partner1_name: partner1Value,
          partner2_name: partner2Value 
        })
        .eq('id', selectedEvent.id);

      if (error) {
        console.error('Error updating partner names:', error);
        toast({
          title: "Error",
          description: "Failed to save partner names",
          variant: "destructive",
        });
        return;
      }

      // Update the selected event in the events hook
      await updateEvent(selectedEvent.id, { 
        partner1_name: partner1Value,
        partner2_name: partner2Value 
      });
      
      setPartnerNamesSaved(true);
      setHasUnsavedChanges(false);
      
      if (showNamesValidation) {
        setShowNamesValidation(false);
      }
      
      // Analytics tracking when partner names are set
      whoIsAnalytics.partnerNamesSet(selectedEvent.id);
      
      toast({
        title: "Success",
        description: "Partner names saved successfully",
      });
    } catch (error) {
      console.error('Error updating partner names:', error);
      toast({
        title: "Error",
        description: "Failed to save partner names",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedEvent, updateEvent, showNamesValidation, localPartner1Name, localPartner2Name, isSaving]);

  // Handler for partner name input changes (no auto-save)
  const handlePartnerNameInputChange = (field: 'partner1_name' | 'partner2_name', value: string) => {
    // Update local state immediately for responsive UI
    if (field === 'partner1_name') {
      setLocalPartner1Name(value);
    } else {
      setLocalPartner2Name(value);
    }

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
    
    // Reset saved status since names changed
    if (partnerNamesSaved) {
      setPartnerNamesSaved(false);
    }
  };

  // Sort and filter guests based on selected option and search term
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
    const namesAreMissing = isWeddingEngagement 
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
      {/* Couple Names Section */}
      <div id="guest-tools-section" className="px-6 py-6">
        <Card 
          className={`p-6 transition-all duration-300 border-2 border-[#7248e6] ${
            showNamesValidation 
              ? 'is-alert animate-pulse-soft animate-shake-soft' 
              : totalGuestCount > 0 
                ? 'is-muted' 
                : ''
          }`}
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              role="status"
              aria-live="polite"
            >
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="bg-white border-2 border-[#7248e6] rounded-full px-4 py-2">
                    <h3 className={`text-lg font-medium text-[#7248e6] ${
                      showNamesValidation ? 'animate-pulse-soft' : ''
                    }`}>
                      What relation is the guest to you?
                    </h3>
                  </div>
                  {selectedEventId && (
                    <RelationSettingsButton
                      eventId={selectedEventId}
                      onSettingsUpdate={setRelationSettings}
                    />
                  )}
                </div>
                <div className="flex justify-center mb-4">
                  <div className="bg-white border-0 rounded-full px-6 py-3 text-center">
                    <div className="text-sm font-medium text-foreground">
                      <div>If you're having a wedding or an engagement add the couple's first names below. Please turn on Wedding/Engagement Names.</div>
                      <div>If you're having any other type of event that only has one person that's celebrating or one organiser, please write that name twice.</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                {/* Wedding/Engagement Toggle - Left Column */}
                <div className="flex flex-col items-start justify-start gap-3">
                  {/* Toggle 1: Wedding/Engagement Names */}
                  <div className="flex flex-col gap-2">
                    {/* Purple Pill Label */}
                    <div className="inline-flex items-center justify-center rounded-full border-2 border-[#7248e6] bg-white px-4 py-2">
            <Label htmlFor="wedding-engagement-toggle" className="text-base font-medium text-[#7248e6] cursor-pointer">
              Add 2 Names for. Eg: Wedding Couple
            </Label>
                    </div>
                    
                    {/* Toggle and Instructional Text */}
                    <div className="flex items-center gap-3">
                      <Switch
                        id="wedding-engagement-toggle"
                        checked={isWeddingEngagement}
                        onCheckedChange={async (checked) => {
                          if (!checked) return; // Prevent turning OFF directly
                          
                          // Turn ON wedding mode, which automatically turns OFF single mode
                          setIsWeddingEngagement(true);
                          
                          // SAVE toggle state to database
                          if (selectedEvent) {
                            try {
                              await supabase
                                .from('events')
                                .update({ relation_allow_single_partner: true })
                                .eq('id', selectedEvent.id);
                              
                              await updateEvent(selectedEvent.id, { 
                                relation_allow_single_partner: true 
                              });
                            } catch (error) {
                              console.error('Error saving toggle state:', error);
                            }
                          }
                        }}
                      />
                      <span className="text-sm text-black">
                        Turn on for weddings/engagements (two people)
                      </span>
                    </div>
                  </div>

                  {/* Toggle 2: Single Person/Event */}
                  <div className="flex flex-col gap-2 mt-2">
                    {/* Purple Pill Label */}
                    <div className="inline-flex items-center justify-center rounded-full border-2 border-[#7248e6] bg-white px-4 py-2">
            <Label htmlFor="single-person-toggle" className="text-base font-medium text-[#7248e6] cursor-pointer">
              Add 1 Name for. Eg: Birthday / Event
            </Label>
                    </div>
                    
                    {/* Toggle and Instructional Text */}
                    <div className="flex items-center gap-3">
                      <Switch
                        id="single-person-toggle"
                        checked={!isWeddingEngagement}
                        onCheckedChange={async (checked) => {
                          if (!checked) return; // Prevent turning OFF directly
                          
                          // Turn ON single mode, which automatically turns OFF wedding mode
                          setIsWeddingEngagement(false);
                          
                          // Clear Partner 2 name
                          setLocalPartner2Name('');
                          handlePartnerNameInputChange('partner2_name', '');
                          
                          // SAVE toggle state to database
                          if (selectedEvent) {
                            try {
                              await supabase
                                .from('events')
                                .update({ relation_allow_single_partner: false })
                                .eq('id', selectedEvent.id);
                              
                              await updateEvent(selectedEvent.id, { 
                                relation_allow_single_partner: false 
                              });
                            } catch (error) {
                              console.error('Error saving toggle state:', error);
                            }
                          }
                        }}
                      />
                      <span className="text-sm text-black">
                        Turn on for single person events (birthdays, etc.)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Partner 1 - Middle Column */}
                <div>
                  <div className="inline-flex items-center justify-center rounded-full border-2 border-[#7248e6] bg-white px-3 py-1.5 mb-2">
                    <Label htmlFor="partner1-name" className="text-base font-medium text-[#7248e6]">
                      Partner 1 First Name
                    </Label>
                  </div>
                  <Input
                    id="partner1-name"
                    type="text"
                    placeholder="Enter first name"
                    value={localPartner1Name}
                    onChange={(e) => handlePartnerNameInputChange('partner1_name', e.target.value)}
                    className="mt-1 border-primary focus:ring-primary focus:ring-2 focus:ring-offset-2 font-bold"
                  />
                </div>

                {/* Partner 2 - Right Column */}
                <div>
                  <div className="inline-flex items-center justify-center rounded-full border-2 border-[#7248e6] bg-white px-3 py-1.5 mb-2">
                    <Label htmlFor="partner2-name" className="text-base font-medium text-[#7248e6]">
                      Partner 2 First Name
                    </Label>
                  </div>
                  <Input
                    id="partner2-name"
                    type="text"
                    placeholder={isWeddingEngagement ? "Enter first name" : "Not applicable"}
                    value={localPartner2Name}
                    onChange={(e) => handlePartnerNameInputChange('partner2_name', e.target.value)}
                    disabled={!isWeddingEngagement}
                    className={cn(
                      "mt-1 border-primary focus:ring-primary focus:ring-2 focus:ring-offset-2 font-bold",
                      !isWeddingEngagement && "bg-gray-100 cursor-not-allowed opacity-50 text-gray-400"
                    )}
                  />
                </div>
              </div>
              
              {/* Save Button */}
              <div className="mt-6 flex justify-center">
                <Button
                  variant="default"
                  size="xs"
                  onClick={handleManualSavePartnerNames}
                  disabled={!hasUnsavedChanges || !localPartner1Name?.trim() || (isWeddingEngagement && !localPartner2Name?.trim()) || isSaving}
                  className={`rounded-full px-8 transition-all duration-300 ${
                    partnerNamesSaved 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  {isSaving ? (
                    'Saving...'
                  ) : partnerNamesSaved ? (
                    <>
                      ✅ Saved
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </Card>
        </div>

      <Card className="border-2 border-primary" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {/* Header Controls */}
        <div className="px-6 py-4">
          <div className="space-y-4">
            {/* Row 1: Event selector and control buttons */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              {/* Event selector and search - left side */}
              <div className="flex items-center space-x-4">
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
              
              {/* Control buttons - right side */}
              <div className="flex items-center space-x-2">
                <TooltipProvider>
                  {/* Guest counter pill - positioned first */}
                  <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-300 h-9 px-3 bg-white border border-primary text-foreground pointer-events-none">
                    <Users className="w-4 h-4" />
                    {guestCount} Guest{guestCount !== 1 ? 's' : ''}
                    {guestCount !== totalGuestCount && ` (${totalGuestCount} total)`}
                  </div>

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
                    size="xs"
                    onClick={handleAddGuest}
                    className={`${
                      partnerNamesSaved || firstGuestAdded || totalGuestCount > 0
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-gradient-primary text-primary-foreground hover:shadow-purple-glow hover:scale-105 transform transition-all duration-300'
                    } rounded-full flex items-center gap-2`}
                  >
                    <Users className="w-4 h-4" />
                    Add First Guest
                  </Button>
                ) : (
                  <Button 
                    variant="default" 
                    size="xs"
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
        </div>

        {/* Who Is Filters */}

        <div className="overflow-x-auto">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-28 rounded-tl-lg">First Name</TableHead>
                <TableHead className="w-28">Last Name</TableHead>
                <TableHead className="w-20">Table No</TableHead>
                <TableHead className="w-20">Seat No.</TableHead>
                <TableHead className="w-24">RSVP Status</TableHead>
                <TableHead className="w-32">Relation</TableHead>
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
                  <TableCell colSpan={11} className="text-center py-8">
                    Loading guests...
                  </TableCell>
                </TableRow>
              ) : totalGuestCount === 0 ? (
                <TableRow className="border-card-border">
                  <TableCell colSpan={11} className="text-center py-8">
                    {/* Empty - the "No Guests Yet" widget is now in the header */}
                  </TableCell>
                </TableRow>
              ) : (
                sortedGuests.map((guest) => (
                  <TableRow 
                    key={guest.id} 
                    className="border-card-border hover:bg-muted/50"
                  >
                    <TableCell className="font-medium w-28">{guest.first_name}</TableCell>
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
              <TableCell className="w-24">
                <Badge variant="default" className="text-xs bg-primary text-white">
                  {guest.dietary}
                </Badge>
              </TableCell>
                    <TableCell className="w-24 pl-16">{renderPill(!!guest.mobile && guest.mobile.trim() !== '')}</TableCell>
                    <TableCell className="w-36 pl-16">{renderPill(!!guest.email && guest.email.trim() !== '')}</TableCell>
                    <TableCell className="w-28">
                      {guest.family_group ? (
                        <Badge variant="success" className="text-xs">
                          Grouped
                        </Badge>
                      ) : (
                        <Badge variant="single" className="text-xs">
                          Single
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="w-20">{renderPill(!!guest.notes && guest.notes.trim() !== '')}</TableCell>
                    <TableCell className="w-24">
                      <div className="flex items-center space-x-2">
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
      </>
    );
};
