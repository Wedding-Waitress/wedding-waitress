import React, { useState, useEffect, useMemo } from 'react';
import { Card } from "@/components/ui/enhanced-card";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "@/hooks/use-toast";
import { useEvents } from '@/hooks/useEvents';
import { useGuests } from '@/hooks/useGuests';
import { AddGuestModal } from './AddGuestModal';
import { supabase } from "@/integrations/supabase/client";

type SortOption = 
  | 'first_name_asc' | 'first_name_desc'
  | 'last_name_asc' | 'last_name_desc' 
  | 'table_no_asc' | 'table_no_desc'
  | 'seat_no_asc' | 'seat_no_desc'
  | 'rsvp_attending_first' | 'rsvp_not_attending_first';

const SORT_OPTIONS = [
  { value: 'first_name_asc', label: 'First Name (A–Z)' },
  { value: 'first_name_desc', label: 'First Name (Z–A)' },
  { value: 'last_name_asc', label: 'Last Name (A–Z)' },
  { value: 'last_name_desc', label: 'Last Name (Z–A)' },
  { value: 'table_no_asc', label: 'Table No. (1→9)' },
  { value: 'table_no_desc', label: 'Table No. (9→1)' },
  { value: 'seat_no_asc', label: 'Seat No. (1→9)' },
  { value: 'rsvp_attending_first', label: 'RSVP (Attending → Pending → Not Attending)' },
  { value: 'rsvp_not_attending_first', label: 'RSVP (Not Attending → Pending → Attending)' },
] as const;

const CSV_HEADERS = [
  'first_name', 'last_name', 'table_no', 'seat_no',
  'rsvp', 'dietary', 'mobile', 'email', 'notes'
];

const DIETARY_OPTIONS = [
  'NA', 'Vegan', 'Vegetarian', 'Gluten Free', 'Dairy Free', 
  'Nut Free', 'Seafood Free', 'Kosher', 'Halal'
];

const RSVP_OPTIONS = ['Pending', 'Attending', 'Not Attending'];

export const GuestListTable: React.FC = () => {
  const { events, loading } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const { guests, loading: guestsLoading, fetchGuests, deleteGuest } = useGuests(selectedEventId);
  const [editingGuest, setEditingGuest] = useState<any>(null);
  const [sortBy, setSortBy] = useState<SortOption>('first_name_asc');

  // Load selected event from localStorage on mount
  useEffect(() => {
    const savedEventId = localStorage.getItem('selectedEventId');
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

  // Save selected event to localStorage when changed
  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
    localStorage.setItem('selectedEventId', eventId);
    
    // Load sort preference for new event
    const savedSort = localStorage.getItem(`guestSort_${eventId}`);
    if (savedSort && SORT_OPTIONS.some(opt => opt.value === savedSort)) {
      setSortBy(savedSort as SortOption);
    } else {
      setSortBy('first_name_asc');
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
        case 'table_no_asc':
          return (a.table_no || 999) - (b.table_no || 999);
        case 'table_no_desc':
          return (b.table_no || 0) - (a.table_no || 0);
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
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [guests, sortBy]);

  // CSV Functions
  const downloadTemplate = () => {
    const csvContent = [
      CSV_HEADERS.join(','),
      'John,Doe,1,1,Attending,NA,1234567890,john@example.com,Sample note',
      'Jane,Smith,2,3,Pending,Vegan,,jane@example.com,'
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'guest-list-template.csv';
    link.click();
  };

  const exportGuestList = () => {
    if (!selectedEvent || !sortedGuests.length) return;
    
    const csvRows = [
      CSV_HEADERS.join(','),
      ...sortedGuests.map(guest => [
        guest.first_name || '',
        guest.last_name || '',
        guest.table_no || '',
        guest.seat_no || '',
        guest.rsvp || 'Pending',
        guest.dietary || 'NA',
        guest.mobile || '',
        guest.email || '',
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
            if (!rowData.table_no?.trim()) {
              errors.push(`Row ${index + 2}: Table number is required`);
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
            
            // Transform data
            rowData.table_no = rowData.table_no ? parseInt(rowData.table_no) : null;
            rowData.seat_no = rowData.seat_no ? parseInt(rowData.seat_no) : null;
            rowData.event_id = selectedEventId;
            
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
              // Bulk insert guests
              const { data: user } = await supabase.auth.getUser();
              if (!user.user) {
                toast({ 
                  title: "Import failed", 
                  description: "You must be logged in to import guests",
                  variant: "destructive"
                });
                return;
              }

              const { error } = await supabase
                .from('guests')
                .insert(validRows.map(row => ({
                  ...row,
                  user_id: user.user.id
                })));
                
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
              fetchGuests();
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
    setEditingGuest(null);
    setShowAddModal(true);
  };

  const handleEditGuest = (guest: any) => {
    setEditingGuest(guest);
    setShowAddModal(true);
  };

  const selectedEvent = events.find(event => event.id === selectedEventId);
  const guestCount = sortedGuests.length;

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

  // No event selected - show large centered empty state
  if (!selectedEventId) {
    return (
      <div className="p-16 text-center">
        <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Guest List Management</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Select an event to view and manage its guest list.
        </p>
        <Button variant="gradient" size="sm" onClick={handleAddGuest}>
          <Users className="w-4 h-4 mr-2" />
          Add Guests
        </Button>
      </div>
    );
  }

  // Event selected - show table card
  return (
    <>
      <Card variant="elevated" className="overflow-hidden">
        <div className="p-6 border-b border-card-border bg-gradient-subtle">
          <div className="space-y-4">
            {/* Row 1: Controls with repositioned elements */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-foreground">
                  Choose an Event:
                </label>
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
                {/* Guest counter pill - moved to left side */}
                <Badge variant="secondary" className="glass">
                  {guestCount} Guest{guestCount !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              {/* Control buttons - right side */}
              <div className="flex items-center space-x-2">
                <TooltipProvider>
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
                {guestCount === 0 ? (
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

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-card-border hover:bg-muted/50">
                <TableHead className="min-w-[120px]">First Name</TableHead>
                <TableHead className="min-w-[120px]">Last Name</TableHead>
                <TableHead className="min-w-[100px]">Table No.</TableHead>
                <TableHead className="min-w-[100px]">Seat No.</TableHead>
                <TableHead className="min-w-[120px]">RSVP</TableHead>
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
                  <TableCell colSpan={10} className="text-center py-8">
                    Loading guests...
                  </TableCell>
                </TableRow>
              ) : guestCount === 0 ? (
                <TableRow className="border-card-border">
                  <TableCell colSpan={10} className="text-center py-8">
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
                    <TableCell>{guest.table_no || '-'}</TableCell>
                    <TableCell>{guest.seat_no || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {guest.rsvp}
                      </Badge>
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
                          onClick={() => deleteGuest(guest.id)}
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
        onSuccess={fetchGuests}
        guest={editingGuest}
        isEdit={!!editingGuest}
      />
    </>
  );
};