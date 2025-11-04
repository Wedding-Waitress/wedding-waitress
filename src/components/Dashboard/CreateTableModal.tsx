import React, { useState, useEffect } from 'react';
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

interface CreateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; limit_seats: number; notes?: string; table_no?: number | null }) => Promise<boolean>;
  editingTable?: TableWithGuestCount | null;
  existingTables?: TableWithGuestCount[];
}

export const CreateTableModal: React.FC<CreateTableModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTable,
  existingTables = []
}) => {
  const [name, setName] = useState('');
  const [limitSeats, setLimitSeats] = useState<number>(8);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ name?: string; limitSeats?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid' | 'duplicate'>('idle');
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (editingTable) {
        setName(editingTable.name);
        setLimitSeats(editingTable.limit_seats);
        setNotes(editingTable.notes || '');
      } else {
        setName('');
        setLimitSeats(8);
        setNotes('');
      }
      setErrors({});
      setValidationState('idle');
    }
  }, [isOpen, editingTable]);

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
    
    if (!limitSeats || limitSeats < 1 || limitSeats > 30) {
      newErrors.limitSeats = 'Table limit must be between 1 and 30';
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setShowWarningDialog(true);
      return;
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
        table_no: tableNo
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col px-10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-medium text-[#7248e6]">
            {editingTable ? 'Edit Table' : 'Create Table'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4 overflow-y-auto flex-1">
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
              onBlur={validateForm}
              placeholder="e.g., 1, Bridal, VIP A"
              disabled={isSubmitting}
              className={`rounded-full border-2 focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none ${
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
              <p className="text-sm text-green-600">✔ Table number is available.</p>
            )}
            {errors.name && validationState === 'idle' && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="limit">Table Limit *</Label>
            <Input
              id="limit"
              type="number"
              min="1"
              max="30"
              value={limitSeats}
              onChange={(e) => setLimitSeats(parseInt(e.target.value) || 0)}
              disabled={isSubmitting}
              className="rounded-full border-2 border-[#7248e6] focus-visible:border-[#7248e6] focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none"
            />
            {errors.limitSeats && (
              <p className="text-sm text-destructive">{errors.limitSeats}</p>
            )}
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
            className="rounded-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleSave}
            disabled={isSubmitting || Object.keys(errors).length > 0 || validationState === 'duplicate'}
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
              This table number already exists. Please choose another.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowWarningDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};