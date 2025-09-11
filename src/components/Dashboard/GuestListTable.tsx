import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card } from "@/components/ui/enhanced-card";
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
  FileText
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useEvents } from '@/hooks/useEvents';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useTables } from '@/hooks/useTables';
import { AddGuestModal } from './AddGuestModal';

import { WhoIsBadge } from './WhoIsBadge';
import { supabase } from "@/integrations/supabase/client";
import { WHO_IS_ROLE_LABELS, computeWhoIsDisplay } from "@/lib/whoIsUtils";
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { WhoIsSettingsButton, WhoIsSettings } from './WhoIsSettingsModal';
import { ImportErrorModal } from './ImportErrorModal';
import { whoIsAnalytics } from '@/lib/analytics';
import { 
  validateWhoIsFields, 
  normalizePartner, 
  normalizeRole, 
  ImportError 
} from '@/lib/whoIsValidation';

type SortOption = 
  | 'first_name_asc' | 'first_name_desc'
  | 'last_name_asc' | 'last_name_desc' 
  | 'table_name_asc' | 'table_name_desc'
  | 'seat_no_asc' | 'seat_no_desc'
  | 'rsvp_attending_first' | 'rsvp_not_attending_first'
  | 'who_is_asc' | 'who_is_desc';

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
  { value: 'who_is_asc', label: 'Who Is (A–Z)' },
  { value: 'who_is_desc', label: 'Who Is (Z–A)' },
] as const;

// Template headers (no who_is_display as it's computed)
const IMPORT_TEMPLATE_HEADERS = [
  'first_name', 'last_name', 'table_name', 'seat_no',
  'rsvp', 'dietary', 'mobile', 'email', 'notes', 
  'who_is_partner', 'who_is_role'
];

// Export headers (includes who_is_display)
const EXPORT_HEADERS = [
  'first_name', 'last_name', 'table_name', 'seat_no',
  'rsvp', 'dietary', 'mobile', 'email', 'notes', 
  'who_is_partner', 'who_is_role', 'who_is_display'
];

const DIETARY_OPTIONS = [
  'NA', 'Vegan', 'Vegetarian', 'Gluten Free', 'Dairy Free', 
  'Nut Free', 'Seafood Free', 'Kosher', 'Halal'
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
  const [sortBy, setSortBy] = useState<SortOption>('first_name_asc');
  const [showNamesValidation, setShowNamesValidation] = useState(false);
  const [whoIsSettings, setWhoIsSettings] = useState<WhoIsSettings>({
    who_is_required: true,
    who_is_allow_custom_role: false,
    who_is_allow_single_partner: true,
    who_is_disable_first_guest_alert: false,
  });
  const [showImportErrors, setShowImportErrors] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [importStats, setImportStats] = useState({ total: 0, successful: 0 });
  
  // Local state for partner names to prevent input interruption
  const [localPartner1Name, setLocalPartner1Name] = useState('');
  const [localPartner2Name, setLocalPartner2Name] = useState('');
  const [partnerNamesSaved, setPartnerNamesSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [firstGuestAdded, setFirstGuestAdded] = useState(false);

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
  const handleDeleteGuest = async (guestId: string) => {
    await deleteGuest(guestId);
    await fetchTables(); // Refresh table counts after deletion
  };

  // Save selected event to localStorage when changed - use same key as Table Setup
  const handleEventSelect = (eventId: string) => {
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
  };

  // Get selected event
  const selectedEvent = events.find(event => event.id === selectedEventId);

  // Update local partner names when selected event changes
  useEffect(() => {
    if (selectedEvent) {
      setLocalPartner1Name(selectedEvent.partner1_name || '');
      setLocalPartner2Name(selectedEvent.partner2_name || '');
      // Check if partner names are already saved
      const bothNamesFilled = selectedEvent.partner1_name?.trim() && selectedEvent.partner2_name?.trim();
      setPartnerNamesSaved(!!bothNamesFilled);
      setHasUnsavedChanges(false);
      
      // Check if first guest has been added
      const hasGuests = guests.length > 0;
      setFirstGuestAdded(hasGuests);
    }
  }, [selectedEvent]);

  // Helper function to get table name for a guest
  const getTableName = (guest: any) => {
    if (!guest.table_id) return null;
    const table = tables.find(t => t.id === guest.table_id);
    return table?.name || null;
  };

  // Manual save function for partner names
  const handleManualSavePartnerNames = useCallback(async () => {
    if (!selectedEvent || isSaving) return;

    const partner1Value = localPartner1Name?.trim();
    const partner2Value = localPartner2Name?.trim();

    if (!partner1Value || !partner2Value) {
      toast({
        title: "Error",
        description: "Both partner names are required",
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

  // Sort guests based on selected option
  const sortedGuests = useMemo(() => {
    if (!guests.length) return guests;
    
    const sorted = [...guests].sort((a, b) => {
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
        case 'who_is_asc':
          const partnerNameA = a.who_is_partner === 'partner_one' ? selectedEvent?.partner1_name : selectedEvent?.partner2_name;
          const partnerNameB = b.who_is_partner === 'partner_one' ? selectedEvent?.partner1_name : selectedEvent?.partner2_name;
          const roleA = WHO_IS_ROLE_LABELS[a.who_is_role] || '';
          const roleB = WHO_IS_ROLE_LABELS[b.who_is_role] || '';
          
          // Primary sort: partner name
          const partnerCompare = (partnerNameA || 'zzz').localeCompare(partnerNameB || 'zzz');
          if (partnerCompare !== 0) return partnerCompare;
          
          // Secondary sort: role
          return roleA.localeCompare(roleB);
        case 'who_is_desc':
          const partnerNameA3 = a.who_is_partner === 'partner_one' ? selectedEvent?.partner1_name : selectedEvent?.partner2_name;
          const partnerNameB3 = b.who_is_partner === 'partner_one' ? selectedEvent?.partner1_name : selectedEvent?.partner2_name;
          const roleA3 = WHO_IS_ROLE_LABELS[a.who_is_role] || '';
          const roleB3 = WHO_IS_ROLE_LABELS[b.who_is_role] || '';
          
          // Primary sort: partner name (desc)
          const partnerCompare3 = (partnerNameB3 || '').localeCompare(partnerNameA3 || '');
          if (partnerCompare3 !== 0) return partnerCompare3;
          
          // Secondary sort: role (desc)
          return roleB3.localeCompare(roleA3);
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [guests, sortBy, tables, selectedEvent]);


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
        (guest.notes || '').replace(/,/g, ';').replace(/\n/g, ' '),
        guest.who_is_partner || '',
        guest.who_is_role || '',
        guest.who_is_display || ''
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
            
            // Enhanced Who Is validation
            const whoIsErrors = validateWhoIsFields(
              rowData.who_is_partner || '',
              rowData.who_is_role || '',
              rowIndex
            );
            allErrors.push(...whoIsErrors);
            
            if (whoIsErrors.length > 0) {
              return; // Skip this row due to Who Is errors
            }
            
            // Normalize Who Is fields
            if (rowData.who_is_partner) {
              const normalizedPartner = normalizePartner(rowData.who_is_partner);
              const normalizedRole = normalizeRole(rowData.who_is_role);
              
              if (!normalizedPartner || !normalizedRole) {
                // Should have been caught by validation above, but just in case
                return;
              }
              
              rowData.who_is_partner = normalizedPartner;
              rowData.who_is_role = normalizedRole;
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
              // Bulk insert guests with who_is_display computed
              const { data: user } = await supabase.auth.getUser();
              if (!user.user) {
                toast({ 
                  title: "Import failed", 
                  description: "You must be logged in to import guests",
                  variant: "destructive"
                });
                return;
              }

              // Compute who_is_display for each row
              const rowsWithDisplay = validRows.map(row => {
                const whoIsDisplay = computeWhoIsDisplay(
                  row.who_is_partner || '',
                  row.who_is_role || '',
                  selectedEvent?.partner1_name,
                  selectedEvent?.partner2_name
                );
                
                return {
                  ...row,
                  who_is_display: whoIsDisplay,
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
    const shouldBlockFirstGuest = !whoIsSettings.who_is_disable_first_guest_alert;
    
    // Gating rule: Only block for first guest if partner names haven't been manually saved
    if (shouldBlockFirstGuest && guestCount === 0 && !partnerNamesSaved) {
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
    
    // Normal flow - open the add guest modal (allowed after first guest even if names are empty)
    setEditingGuest(null);
    setShowAddModal(true);
  };

  const handleEditGuest = (guest: any) => {
    setEditingGuest(guest);
    setShowAddModal(true);
  };

  const handleEditWhoIs = (guest: any) => {
    setEditingGuest({ ...guest, focusWhoIs: true });
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
      <Card variant="elevated" className="p-8 text-center">
        <div>Loading events...</div>
      </Card>
    );
  }

  // No event selected - show placeholder message like Table Setup
  if (!selectedEventId) {
    return (
      <Card variant="elevated">
        <div className="p-8 text-center space-y-4">
          <div className="text-muted-foreground">Select an event to view its guest list</div>
          
          {/* Event dropdown */}
          <div className="flex justify-center">
            <Select onValueChange={handleEventSelect} value="">
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
        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            <Card 
              className={`p-6 transition-all duration-300 ${
                showNamesValidation 
                  ? 'is-alert animate-pulse-soft animate-shake-soft' 
                  : totalGuestCount > 0 
                    ? 'is-muted' 
                    : 'border-border'
              }`}
              role="status"
              aria-live="polite"
            >
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className={`text-lg font-medium text-foreground ${
                    showNamesValidation ? 'animate-pulse-soft' : ''
                  }`}>
                    Partner Names
                  </h3>
                  {selectedEventId && (
                    <WhoIsSettingsButton
                      eventId={selectedEventId}
                      onSettingsUpdate={setWhoIsSettings}
                    />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  If you're having a wedding or an engagement add the couple's first names below. If you're having any other type of event, write the organiser's first name only.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="partner1-name" className="text-sm font-medium">
                    Partner 1 First Name
                  </Label>
                  <Input
                    id="partner1-name"
                    type="text"
                    placeholder="Enter first name"
                    value={localPartner1Name}
                    onChange={(e) => handlePartnerNameInputChange('partner1_name', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="partner2-name" className="text-sm font-medium">
                    Partner 2 First Name
                  </Label>
                  <Input
                    id="partner2-name"
                    type="text"
                    placeholder="Enter first name"
                    value={localPartner2Name}
                    onChange={(e) => handlePartnerNameInputChange('partner2_name', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              
              {/* Save Button */}
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleManualSavePartnerNames}
                  disabled={!hasUnsavedChanges || !localPartner1Name?.trim() || !localPartner2Name?.trim() || isSaving}
                  className={`px-8 py-2 transition-all duration-300 ${
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
        </div>
      </div>

      <Card variant="elevated">
        {/* Header Controls */}
        <div className="px-6 py-4">
          <div className="space-y-4">
            {/* Row 1: Event selector and control buttons */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              {/* Event selector - left side */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="event-select" className="whitespace-nowrap text-sm font-medium">
                  Choose Event:
                </Label>
                <Select value={selectedEventId || ""} onValueChange={handleEventSelect}>
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
              
              {/* Control buttons - right side */}
              <div className="flex items-center space-x-2">
                <TooltipProvider>
                  {/* Guest counter pill - positioned first */}
                  <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors h-9 px-3 bg-purple-600 text-white pointer-events-none">
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
                              variant="gradient" 
                              size="sm"
                              disabled={!selectedEventId}
                            >
                              <ArrowUpDown className="w-4 h-4 mr-2" />
                              Sort By
                              <ChevronDown className="w-4 h-4 ml-1" />
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
                              variant="gradient" 
                              size="sm"
                              disabled={!selectedEventId}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Import / Export CSV
                              <ChevronDown className="w-4 h-4 ml-1" />
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
                    size="sm" 
                    onClick={handleAddGuest}
                    className={`${
                      firstGuestAdded || totalGuestCount > 0
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : partnerNamesSaved
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-shake'
                        : 'bg-gradient-primary text-primary-foreground hover:shadow-purple-glow hover:scale-105 transform transition-all duration-300'
                    }`}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Add First Guest
                  </Button>
                ) : (
                  <Button 
                    variant="gradient" 
                    size="sm" 
                    onClick={handleAddGuest}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Add Guest
                  </Button>
                )}
              </div>
            </div>
            
            {/* Row 2: Title line */}
            <div className="flex items-center space-x-2">
              <span className="text-lg font-medium text-foreground">Guest List for</span>
              <span className="text-lg font-bold text-primary">{selectedEvent.name}</span>
            </div>
          </div>
        </div>

        {/* Who Is Filters */}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-card-border hover:bg-muted/50">
                <TableHead className="min-w-[120px]">First Name</TableHead>
                <TableHead className="min-w-[120px]">Last Name</TableHead>
                <TableHead className="min-w-[100px]">Table</TableHead>
                <TableHead className="min-w-[100px]">Seat No.</TableHead>
                <TableHead className="min-w-[120px]">RSVP</TableHead>
                <TableHead className="min-w-[140px]">Who Is</TableHead>
                <TableHead className="min-w-[140px]">Dietary</TableHead>
                <TableHead className="min-w-[120px]">Mobile</TableHead>
                <TableHead className="min-w-[180px]">Email</TableHead>
                <TableHead className="min-w-[80px]">Notes</TableHead>
                <TableHead className="w-32">Actions</TableHead>
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
                    <TableCell className="font-medium">{guest.first_name}</TableCell>
                    <TableCell className="font-medium">{guest.last_name}</TableCell>
                    <TableCell>{getTableName(guest) || '–'}</TableCell>
                    <TableCell>{guest.seat_no || '–'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {guest.rsvp}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <WhoIsBadge
                        display={guest.who_is_display || ''}
                        partner={guest.who_is_partner || ''}
                        role={guest.who_is_role || ''}
                        partnerName={guest.who_is_partner === 'partner_one' ? selectedEvent?.partner1_name : selectedEvent?.partner2_name}
                        onClick={() => handleEditWhoIs(guest)}
                        isEmpty={!guest.who_is_display}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {guest.dietary}
                      </Badge>
                    </TableCell>
                    <TableCell>{guest.mobile || '-'}</TableCell>
                    <TableCell>{renderPill(!!guest.email && guest.email.trim() !== '')}</TableCell>
                    <TableCell>{renderPill(!!guest.notes && guest.notes.trim() !== '')}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditGuest(guest)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteGuest(guest.id)}
                        >
                          <Trash2 className="w-4 h-4" />
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
        onSuccess={handleGuestSuccess}
        guest={editingGuest}
        isEdit={!!editingGuest}
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
