import React, { useState, useEffect, useMemo } from 'react';
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
import { WhoIsFilters } from './WhoIsFilters';
import { WhoIsBadge } from './WhoIsBadge';
import { supabase } from "@/integrations/supabase/client";
import { WHO_IS_ROLE_LABELS, computeWhoIsDisplay } from "@/lib/whoIsUtils";

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

const CSV_HEADERS = [
  'first_name', 'last_name', 'table_name', 'seat_no',
  'rsvp', 'dietary', 'mobile', 'email', 'notes', 
  'who_is_partner', 'who_is_role', 'who_is_display'
];

const DIETARY_OPTIONS = [
  'NA', 'Vegan', 'Vegetarian', 'Gluten Free', 'Dairy Free', 
  'Nut Free', 'Seafood Free', 'Kosher', 'Halal'
];

const RSVP_OPTIONS = ['Pending', 'Attending', 'Not Attending'];

export const GuestListTable: React.FC = () => {
  const { events, loading, updateEvent } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const { guests, loading: guestsLoading, deleteGuest, refetchGuests } = useRealtimeGuests(selectedEventId);
  const { tables, fetchTables } = useTables(selectedEventId);
  const [editingGuest, setEditingGuest] = useState<any>(null);
  const [sortBy, setSortBy] = useState<SortOption>('first_name_asc');
  const [showNamesValidation, setShowNamesValidation] = useState(false);
  const [whoIsFilters, setWhoIsFilters] = useState<{ partners: string[]; roles: string[] }>({
    partners: [],
    roles: []
  });

  // Load selected event from localStorage on mount - use same key as Table Setup
  useEffect(() => {
    const savedEventId = localStorage.getItem('active_event_id');
    if (savedEventId && events.some(event => event.id === savedEventId)) {
      setSelectedEventId(savedEventId);
      
      // Load saved sort preference for this event
      const savedSort = localStorage.getItem(`guestSort_${savedEventId}`);
      if (savedSort && SORT_OPTIONS.some(opt => opt.value === savedSort)) {
        setSortBy(savedSort as SortOption);
      }
    }
  }, [events]);

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
  };

  // Handle guest deletion with table count refresh
  const handleDeleteGuest = async (guestId: string) => {
    await deleteGuest(guestId);
    await fetchTables(); // Refresh table counts after deletion
  };

  // Save selected event to localStorage when changed - use same key as Table Setup
  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
    localStorage.setItem('active_event_id', eventId);
    
    // Load sort preference for new event
    const savedSort = localStorage.getItem(`guestSort_${eventId}`);
    if (savedSort && SORT_OPTIONS.some(opt => opt.value === savedSort)) {
      setSortBy(savedSort as SortOption);
    } else {
      setSortBy('first_name_asc');
    }

    // Reset filters when changing events
    setWhoIsFilters({ partners: [], roles: [] });
    
    // Reset modal states when changing events 
    setShowAddModal(false);
    setEditingGuest(null);
    
    // Reset validation state
    setShowNamesValidation(false);
  };

  // Get selected event
  const selectedEvent = events.find(event => event.id === selectedEventId);

  // Helper function to get table name for a guest
  const getTableName = (guest: any) => {
    if (!guest.table_id) return null;
    const table = tables.find(t => t.id === guest.table_id);
    return table?.name || null;
  };

  // Handler for partner name changes with auto-save
  const handlePartnerNameChange = async (field: 'partner1_name' | 'partner2_name', value: string) => {
    if (!selectedEvent) return;

    try {
      const { error } = await supabase
        .from('events')
        .update({ [field]: value })
        .eq('id', selectedEvent.id);

      if (error) {
        console.error('Error updating partner name:', error);
        toast({
          title: "Error",
          description: "Failed to update partner name",
          variant: "destructive",
        });
        return;
      }

      // Update the selected event in the events hook
      await updateEvent(selectedEvent.id, { [field]: value });
      
      // Check if both names are now filled to clear validation
      const bothNamesFilled = (field === 'partner1_name' ? value : selectedEvent.partner1_name)?.trim() && 
                             (field === 'partner2_name' ? value : selectedEvent.partner2_name)?.trim();
      if (bothNamesFilled && showNamesValidation) {
        setShowNamesValidation(false);
      }
    } catch (error) {
      console.error('Error updating partner name:', error);
      toast({
        title: "Error",
        description: "Failed to update partner name",
        variant: "destructive",
      });
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

  // Filter guests based on Who Is filters
  const filteredGuests = useMemo(() => {
    if (whoIsFilters.partners.length === 0 && whoIsFilters.roles.length === 0) {
      return sortedGuests;
    }
    
    return sortedGuests.filter(guest => {
      const matchesPartner = whoIsFilters.partners.length === 0 || 
        whoIsFilters.partners.includes(guest.who_is_partner || '');
      
      const matchesRole = whoIsFilters.roles.length === 0 || 
        whoIsFilters.roles.includes(guest.who_is_role || '');
      
      return matchesPartner && matchesRole;
    });
  }, [sortedGuests, whoIsFilters]);

  // CSV Functions
  const downloadTemplate = () => {
    const csvContent = [
      CSV_HEADERS.join(','),
      'John,Doe,Table 1,1,Attending,NA,1234567890,john@example.com,Sample note,partner_one,father,John — Father',
      'Jane,Smith,Table 2,3,Pending,Vegan,,jane@example.com,,partner_two,bridal_party,Jane — Bridal Party'
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'guest-list-template.csv';
    link.click();
  };

  const exportGuestList = () => {
    if (!selectedEvent || !filteredGuests.length) return;
    
    const csvRows = [
      CSV_HEADERS.join(','),
      ...filteredGuests.map(guest => [
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
    
    toast({ title: `Exported ${filteredGuests.length} guests successfully` });
  };

  const handleImportCSV = () => {
    if (!selectedEvent) return;
    
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
          const expectedHeaders = CSV_HEADERS;
          
          // Check if headers match
          const headersMatch = expectedHeaders.every(h => headers.includes(h));
          if (!headersMatch) {
            toast({ 
              title: "Import failed", 
              description: `CSV headers don't match template. Expected: ${expectedHeaders.join(', ')}`,
              variant: "destructive"
            });
            return;
          }
          
          const dataRows = lines.slice(1);
          const currentGuestCount = guests.length;
          const guestLimit = selectedEvent.guest_limit || 50;
          
          if (currentGuestCount + dataRows.length > guestLimit) {
            toast({ 
              title: "Import failed", 
              description: `Adding ${dataRows.length} guests would exceed the limit of ${guestLimit}. Current: ${currentGuestCount}`,
              variant: "destructive"
            });
            return;
          }
          
          // Parse and validate rows
          const validRows: any[] = [];
          const duplicateRows: any[] = [];
          const errors: string[] = [];
          
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
            if (values.length < headers.length) return;
            
            const rowData: any = {};
            headers.forEach((header, i) => {
              rowData[header] = values[i] || '';
            });
            
            // Validate required fields
            if (!rowData.first_name?.trim()) {
              errors.push(`Row ${index + 2}: First name is required`);
              return;
            }
            if (!rowData.last_name?.trim()) {
              errors.push(`Row ${index + 2}: Last name is required`);
              return;
            }
            if (!rowData.table_name?.trim()) {
              errors.push(`Row ${index + 2}: Table name is required`);
              return;
            }
            
            // Check for duplicates
            const nameKey = `${rowData.first_name.toLowerCase().trim()}_${rowData.last_name.toLowerCase().trim()}`;
            if (existingNames.has(nameKey) || csvNames.has(nameKey)) {
              duplicateRows.push({ ...rowData, rowIndex: index + 2 });
              return;
            }
            csvNames.add(nameKey);
            
            // Validate RSVP
            if (rowData.rsvp && !RSVP_OPTIONS.includes(rowData.rsvp)) {
              errors.push(`Row ${index + 2}: Invalid RSVP status`);
              return;
            }
            
            // Validate dietary
            if (rowData.dietary && !DIETARY_OPTIONS.includes(rowData.dietary)) {
              errors.push(`Row ${index + 2}: Invalid dietary restriction`);
              return;
            }
            
            // Transform data - find table_id from table_name
            const foundTable = tables.find(t => t.name.toLowerCase() === rowData.table_name.toLowerCase());
            if (!foundTable) {
              errors.push(`Row ${index + 2}: Table "${rowData.table_name}" not found`);
              return;
            }
            
            rowData.table_id = foundTable.id;
            rowData.seat_no = rowData.seat_no ? parseInt(rowData.seat_no) : null;
            rowData.event_id = selectedEventId;
            delete rowData.table_name; // Remove table_name as we're using table_id
            
            validRows.push(rowData);
          });
          
          if (errors.length > 0) {
            toast({ 
              title: "Import validation failed", 
              description: errors.slice(0, 3).join('; ') + (errors.length > 3 ? '...' : ''),
              variant: "destructive"
            });
            return;
          }
          
          // Show preview and confirm import
          const preview = validRows.slice(0, 5);
          let confirmMsg = `Import ${validRows.length} guests?`;
          if (duplicateRows.length > 0) {
            confirmMsg += `\n\nNote: ${duplicateRows.length} duplicate guests will be skipped.`;
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
              
              let successMsg = `Imported ${validRows.length} guests successfully`;
              if (duplicateRows.length > 0) {
                successMsg += `. Skipped ${duplicateRows.length} duplicates`;
              }
              toast({ title: successMsg });
              refetchGuests();
            } catch (error) {
              toast({ 
                title: "Import failed", 
                description: "Error importing guests. Please try again.",
                variant: "destructive"
              });
            }
          }
        } catch (error) {
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
    
    // Gating rule: Only block for first guest (guest_count == 0) and missing partner names
    if (guestCount === 0 && (partner1Missing || partner2Missing)) {
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

  const guestCount = filteredGuests.length;
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
                <h3 className={`text-lg font-medium text-foreground ${
                  showNamesValidation ? 'animate-pulse-soft' : ''
                }`}>
                  If you're having a wedding or an engagement add the couple's first names below. If you're having any other type of event, write the organiser's first name only.
                </h3>
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
                    value={selectedEvent?.partner1_name || ''}
                    onChange={(e) => handlePartnerNameChange('partner1_name', e.target.value)}
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
                    value={selectedEvent?.partner2_name || ''}
                    onChange={(e) => handlePartnerNameChange('partner2_name', e.target.value)}
                    className="mt-1"
                  />
                </div>
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
                  <Button variant="gradient" size="sm" onClick={handleAddGuest}>
                    <Users className="w-4 h-4 mr-2" />
                    Add First Guest
                  </Button>
                ) : (
                  <Button variant="gradient" size="sm" onClick={handleAddGuest}>
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
        {totalGuestCount > 0 && (selectedEvent?.partner1_name || selectedEvent?.partner2_name) && (
          <div className="px-6">
            <WhoIsFilters
              filters={whoIsFilters}
              onFiltersChange={setWhoIsFilters}
              partner1Name={selectedEvent?.partner1_name}
              partner2Name={selectedEvent?.partner2_name}
            />
          </div>
        )}

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
                filteredGuests.map((guest) => (
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
                    <TableCell>{guest.email || '-'}</TableCell>
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
    </>
  );
};
