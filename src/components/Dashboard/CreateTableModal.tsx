/**
 * ⚠️ PRODUCTION-READY — LOCKED FOR PRODUCTION ⚠️
 * 
 * This Table Creation Modal feature is COMPLETE and APPROVED for production use.
 * 
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break table number validation
 * - Changes could break capacity calculations
 * - Changes could break duplicate detection
 * 
 * See: MY_EVENTS_TABLES_GUESTLIST_SPECS.md for full specifications
 * 
 * Last locked: 2025-11-12
 */

import React, { useState, useEffect } from 'react';
import { GuestLimitDialog } from './GuestLimitDialog';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { secureTableSchema, type SecureTableData } from "@/lib/security/validation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TableWithGuestCount } from '@/hooks/useTables';
import { useToast } from '@/hooks/use-toast';
import { Circle, Square } from 'lucide-react';

export type TableType = 'round' | 'square' | 'long';

interface CreateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; limit_seats: number; notes?: string; table_no?: number | null; table_type?: TableType }) => Promise<boolean>;
  editingTable?: TableWithGuestCount | null;
  existingTables?: TableWithGuestCount[];
  eventGuestLimit?: number;
  currentEventName?: string;
}

export const CreateTableModal: React.FC<CreateTableModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTable,
  existingTables = [],
  eventGuestLimit,
  currentEventName
}) => {
  const [name, setName] = useState('');
  const [limitSeats, setLimitSeats] = useState<number>(8);
  const [notes, setNotes] = useState('');
  const [tableType, setTableType] = useState<TableType>('round');
  const [errors, setErrors] = useState<{ name?: string; limitSeats?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid' | 'duplicate'>('idle');
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [showSeatLimitDialog, setShowSeatLimitDialog] = useState(false);
  const { toast } = useToast();

  // Get min/max limits based on table type
  const getTableLimits = (type: TableType) => {
    if (type === 'long') {
      return { min: 1, max: 50 };
    }
    return { min: 1, max: 20 };
  };

  const limits = getTableLimits(tableType);

  useEffect(() => {
    if (isOpen) {
      if (editingTable) {
        setName(editingTable.name);
        setLimitSeats(editingTable.limit_seats);
        setNotes(editingTable.notes || '');
        // Pre-populate table type from database, default to 'round' if null
        setTableType((editingTable as any).table_type || 'round');
      } else {
        setName('');
        setLimitSeats(8);
        setNotes('');
        setTableType('round');
      }
      setErrors({});
      setValidationState('idle');
    }
  }, [isOpen, editingTable]);

  // Auto-adjust seat limit when switching table types
  const handleTableTypeChange = (newType: TableType) => {
    const newLimits = getTableLimits(newType);
    setTableType(newType);
    
    // Auto-adjust limit if current value is outside new range
    if (limitSeats < newLimits.min) {
      setLimitSeats(newLimits.min);
    } else if (limitSeats > newLimits.max) {
      setLimitSeats(newLimits.max);
    }
    
    // Clear limit error since we auto-adjusted
    if (errors.limitSeats) {
      setErrors(prev => ({ ...prev, limitSeats: undefined }));
    }
  };

  const calculateCapacityInfo = () => {
    if (!eventGuestLimit) return null;

    // Calculate ACTUAL guest count across all tables (this is what matters)
    const actualGuestCount = existingTables.reduce((sum, table) => sum + (table.guest_count || 0), 0);
    
    // Calculate remaining guest slots
    const guestsRemaining = eventGuestLimit - actualGuestCount;
    const wouldExceed = actualGuestCount > eventGuestLimit;
    const exceedBy = wouldExceed ? actualGuestCount - eventGuestLimit : 0;

    return {
      actualGuestCount,
      guestsRemaining,
      wouldExceed,
      exceedBy,
      eventGuestLimit
    };
  };

  const validateTableName = (inputName: string) => {
    if (!inputName.trim()) {
      setValidationState('idle');
      return;
    }

    const trimmedName = inputName.trim();
    const isNumeric = /^\d+$/.test(trimmedName);
    
    // Check for exact name duplicates (for non-numeric names)
    const exactNameDuplicate = existingTables.find(table => 
      table.name.toLowerCase() === trimmedName.toLowerCase() && table.id !== editingTable?.id
    );
    
    // Check for numeric table number duplicates
    let numericDuplicate = false;
    if (isNumeric) {
      const tableNo = parseInt(trimmedName);
      numericDuplicate = existingTables.some(table => 
        table.table_no === tableNo && table.id !== editingTable?.id
      );
    }
    
    if (exactNameDuplicate || numericDuplicate) {
      setValidationState('duplicate');
    } else {
      setValidationState('valid');
    }
  };

  const validateForm = () => {
    const newErrors: { name?: string; limitSeats?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Table name is required';
    }
    
    // Dynamic validation based on table type
    if (tableType === 'long') {
      if (!limitSeats || limitSeats < 1 || limitSeats > 50) {
        newErrors.limitSeats = 'Long table limit must be between 1 and 50';
      }
    } else {
      if (!limitSeats || limitSeats < 1 || limitSeats > 20) {
        newErrors.limitSeats = 'Table limit must be between 1 and 20';
      }
    }

    // Check for duplicates
    const trimmedName = name.trim();
    if (trimmedName) {
      const isNumeric = /^\d+$/.test(trimmedName);
      
      const exactNameDuplicate = existingTables.find(table => 
        table.name.toLowerCase() === trimmedName.toLowerCase() && table.id !== editingTable?.id
      );
      
      let numericDuplicate = false;
      if (isNumeric) {
        const tableNo = parseInt(trimmedName);
        numericDuplicate = existingTables.some(table => 
          table.table_no === tableNo && table.id !== editingTable?.id
        );
      }
      
      if (exactNameDuplicate || numericDuplicate) {
        newErrors.name = 'This table number already exists. Please choose another.';
      }
    }

    // Only hard-block if table limit is set below actual guest count on this table
    if (editingTable && limitSeats < editingTable.guest_count) {
      newErrors.limitSeats = `Cannot set limit below current guest count (${editingTable.guest_count} guests seated)`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setShowWarningDialog(true);
      return;
    }

    // Check if adding this table's seats would exceed the guest limit
    if (eventGuestLimit) {
      const currentTotalSeats = existingTables
        .filter(t => t.id !== editingTable?.id) // Exclude current table if editing
        .reduce((sum, table) => sum + table.limit_seats, 0);
      const newTotalSeats = currentTotalSeats + limitSeats;
      
      if (newTotalSeats > eventGuestLimit) {
        setShowSeatLimitDialog(true);
        return;
      }
    }

    setIsSubmitting(true);
    
    const trimmedName = name.trim();
    const isNumeric = /^\d+$/.test(trimmedName);
    const tableNo = isNumeric ? parseInt(trimmedName) : null;
    
    try {
      const success = await onSave({
        name: trimmedName,
        limit_seats: limitSeats,
        notes: notes.trim() || undefined,
        table_no: tableNo,
        table_type: tableType
      });

      setIsSubmitting(false);
      if (success) {
        onClose();
      }
    } catch (error: any) {
      setIsSubmitting(false);
      
      // Handle unique constraint violation (23505)
      if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
        setErrors({ name: 'This table number already exists. Please choose another.' });
        setValidationState('duplicate');
      } else {
        throw error; // Re-throw other errors
      }
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Get helper text based on table type
  const getTableTypeHelperText = () => {
    switch (tableType) {
      case 'round':
        return 'Maximum round table limit is 1 to 20 guests';
      case 'square':
        return 'Maximum square table limit is 1 to 20 guests';
      case 'long':
        return 'Maximum long table limit is 1 to 50 guests';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col px-4 sm:px-10" fullScreenOnMobile>
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-medium text-primary">
            {editingTable ? 'Edit Table' : 'Create Table'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-6 py-4 overflow-y-auto flex-1 mobile-scroll-container">
          <div className="grid gap-2">
            <Label htmlFor="name">Table Name or No *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                // Clear error when user starts typing
                if (errors.name) {
                  setErrors(prev => ({ ...prev, name: undefined }));
                }
                // Real-time validation
                validateTableName(e.target.value);
              }}
              placeholder="e.g., 1, Bridal, VIP A"
              disabled={isSubmitting}
              className={`rounded-full border-[3px] focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none ${
                validationState === 'duplicate' 
                  ? 'border-red-600 focus-visible:border-red-600' 
                  : validationState === 'valid' 
                    ? 'border-green-500 focus-visible:border-green-500' 
                    : 'border-[#7248e6] focus-visible:border-[#7248e6]'
              }`}
            />
            {validationState === 'duplicate' && (
              <p className="text-sm text-destructive">This table number already exists. Please choose another.</p>
            )}
            {validationState === 'valid' && (
              <p className="text-sm text-green-500">✔ Table number is available.</p>
            )}
            {errors.name && validationState === 'idle' && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Table Type Selection */}
          <div className="grid gap-2">
            <Label>Table Shape & Max Capacity Allowed<span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => handleTableTypeChange('round')}
                disabled={isSubmitting}
                className={`flex flex-col items-center gap-1 sm:gap-1.5 p-2 sm:p-2.5 rounded-xl border-2 transition-all touch-target ${
                  tableType === 'round'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <Circle className={`w-4 h-4 sm:w-5 sm:h-5 ${tableType === 'round' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-xs sm:text-sm font-medium ${tableType === 'round' ? 'text-primary' : 'text-muted-foreground'}`}>
                  Round
                </span>
              </button>
              
              <button
                type="button"
                onClick={() => handleTableTypeChange('square')}
                disabled={isSubmitting}
                className={`flex flex-col items-center gap-1 sm:gap-1.5 p-2 sm:p-2.5 rounded-xl border-2 transition-all touch-target ${
                  tableType === 'square'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <Square className={`w-4 h-4 sm:w-5 sm:h-5 ${tableType === 'square' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-xs sm:text-sm font-medium ${tableType === 'square' ? 'text-primary' : 'text-muted-foreground'}`}>
                  Square
                </span>
              </button>
              
              <button
                type="button"
                onClick={() => handleTableTypeChange('long')}
                disabled={isSubmitting}
                className={`flex flex-col items-center gap-1 sm:gap-1.5 p-2 sm:p-2.5 rounded-xl border-2 transition-all touch-target ${
                  tableType === 'long'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <div className={`w-8 sm:w-10 h-3 sm:h-4 border-2 rounded-sm ${tableType === 'long' ? 'border-primary' : 'border-muted-foreground'}`} />
                <span className={`text-xs sm:text-sm font-medium ${tableType === 'long' ? 'text-primary' : 'text-muted-foreground'}`}>
                  Long
                </span>
              </button>
            </div>
            <p className="text-xs sm:text-sm text-destructive font-medium mt-1">
              {getTableTypeHelperText()}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="limit">Table Limit *</Label>
            <Input
              id="limit"
              type="number"
              min={limits.min}
              max={limits.max}
              value={limitSeats}
              onChange={(e) => {
                setLimitSeats(parseInt(e.target.value) || 0);
                // Clear error when user changes value
                if (errors.limitSeats) {
                  setErrors(prev => ({ ...prev, limitSeats: undefined }));
                }
              }}
              disabled={isSubmitting}
              className="rounded-full border-2 border-[#7248e6] focus-visible:border-[#7248e6] focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none"
            />
            {errors.limitSeats && (
              <p className="text-sm text-destructive">{errors.limitSeats}</p>
            )}
            
            {/* Real-time capacity warning - only show if ACTUAL guests exceed limit */}
            {eventGuestLimit && (() => {
              const capacityInfo = calculateCapacityInfo();
              if (!capacityInfo) return null;

              if (capacityInfo.wouldExceed) {
                return (
                  <div className="p-3 bg-red-50 border-2 border-red-500 rounded-lg">
                    <p className="text-sm font-semibold text-red-700">
                      ⚠️ Guest Limit Exceeded
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Event limit: {capacityInfo.eventGuestLimit} guests<br/>
                      <strong>Current guests: {capacityInfo.actualGuestCount} (exceeds by {capacityInfo.exceedBy})</strong>
                    </p>
                  </div>
                );
              } else if (capacityInfo.guestsRemaining > 0 && capacityInfo.guestsRemaining < 10) {
                return (
                  <div className="p-3 bg-yellow-50 border-2 border-yellow-500 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-700">
                      ⚡ {capacityInfo.guestsRemaining} guest slots remaining
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Event limit: {capacityInfo.eventGuestLimit} | Current guests: {capacityInfo.actualGuestCount}
                    </p>
                  </div>
                );
              }
              
              return null;
            })()}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this table..."
              rows={3}
              disabled={isSubmitting}
              className="rounded-3xl border-2 border-[#7248e6] focus-visible:border-[#7248e6] focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none"
            />
          </div>

          {editingTable && (
            <div className="grid gap-2">
              <Label>Guests on Table</Label>
              <div className="px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                {editingTable.guest_count} guests
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="destructive"
            size="xs"
            className="rounded-full bg-red-600 hover:bg-red-700 text-white"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            variant="default"
            size="xs"
            className="rounded-full bg-green-500 hover:bg-green-600 text-white"
            onClick={handleSave}
            disabled={isSubmitting || Object.values(errors).some(Boolean) || validationState === 'duplicate'}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invalid Table Information</AlertDialogTitle>
            <AlertDialogDescription>
              {errors.name || errors.limitSeats || "Please correct the form errors before saving."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowWarningDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Seat Limit Exceeded Dialog */}
      <GuestLimitDialog
        isOpen={showSeatLimitDialog}
        onClose={() => setShowSeatLimitDialog(false)}
        variant="exceeded"
        guestLimit={eventGuestLimit || 0}
      />
    </Dialog>
  );
};