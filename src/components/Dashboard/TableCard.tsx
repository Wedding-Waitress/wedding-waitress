import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/enhanced-card";
import { Button } from "@/components/ui/enhanced-button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Edit, Trash2 } from "lucide-react";
import { TableWithGuestCount } from '@/hooks/useTables';

interface Guest {
  first_name: string;
  last_name?: string;
}

interface TableCardProps {
  table: TableWithGuestCount;
  onEdit: (table: TableWithGuestCount) => void;
  onDelete: (tableId: string) => Promise<boolean>;
  getGuestsForTable: (tableId: string) => Promise<Guest[]>;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  onEdit,
  onDelete,
  getGuestsForTable
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);

  const progressPercentage = Math.min((table.guest_count / table.limit_seats) * 100, 100);
  const isFull = table.guest_count >= table.limit_seats;

  useEffect(() => {
    const fetchGuests = async () => {
      const guestList = await getGuestsForTable(table.id);
      setGuests(guestList);
    };
    fetchGuests();
  }, [table.id, table.guest_count, getGuestsForTable]);

  const handleDelete = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    
    setIsDeleting(true);
    const success = await onDelete(table.id);
    setIsDeleting(false);
    
    if (success) {
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
    }
  };

  const handleDeleteDialogClose = () => {
    if (!isDeleting) {
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
    }
  };

  return (
    <>
      <Card 
        variant="default" 
        className={`transition-all duration-300 aspect-square flex flex-col ${
          isFull 
            ? 'border-2 border-green-500' 
            : 'border-2 border-primary'
        }`}
      >
        <CardContent className="p-4 flex flex-col h-full">
          {/* Table Name */}
          <div className="text-xl font-bold text-foreground mb-3 text-center">
            {table.name}
          </div>

          {/* Table Limit and Progress */}
          <div className="mb-3">
            <div className="text-sm text-foreground mb-2">
              {table.guest_count}/{table.limit_seats}
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-2 bg-secondary"
            />
          </div>

          {/* Notes */}
          {table.notes && (
            <div className="mb-3">
              <div className="text-xs text-muted-foreground line-clamp-1">
                {table.notes}
              </div>
            </div>
          )}

          {/* Guest Names */}
          <div className="flex-1 mb-3 min-h-0">
            <div className="text-xs text-muted-foreground mb-1">Guests:</div>
            <div className="text-xs space-y-1 overflow-y-auto max-h-20">
              {guests.length > 0 ? (
                guests.map((guest, index) => (
                  <div key={index} className="text-foreground">
                    {guest.first_name} {guest.last_name || ''}
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground italic">No guests assigned</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 mt-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(table)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={handleDeleteDialogClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              You are deleting this table. Once it's gone you can't bring it back.
              <br />
              <br />
              Type <strong>DELETE</strong> to confirm:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            disabled={isDeleting}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteConfirmText !== 'DELETE' || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};