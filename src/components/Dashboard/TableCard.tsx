import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/enhanced-card";
import { Button } from "@/components/ui/enhanced-button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
import { Edit, Trash2, GripVertical } from "lucide-react";
import { TableWithGuestCount } from '@/hooks/useTables';
import { Guest } from '@/hooks/useGuests';

interface TableCardProps {
  table: TableWithGuestCount;
  onEdit: (table: TableWithGuestCount) => void;
  onDelete: (tableId: string) => Promise<boolean>;
  guests: Guest[];
  eventId: string;
  onGuestMove: (guestId: string, sourceTableId: string | null, destTableId: string, guestName: string) => Promise<boolean>;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  onEdit,
  onDelete,
  guests: allGuests,
  eventId,
  onGuestMove
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Filter guests for this table from the real-time guest list
  const guests = allGuests.filter(guest => guest.table_id === table.id);

  // Guard against divide-by-zero and calculate progress
  const safeLimit = Math.max(table.limit_seats, 1);
  const progressPercentage = Math.min((table.guest_count / safeLimit) * 100, 100);
  const isFull = table.guest_count >= table.limit_seats;


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

  const handleDragStart = (e: React.DragEvent, guest: Guest) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      guestId: guest.id,
      guestName: `${guest.first_name} ${guest.last_name || ''}`.trim(),
      sourceTableId: guest.table_id,
      sourceTableName: table.name
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only remove drag over state if leaving the card entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { guestId, guestName, sourceTableId } = dragData;

      // Don't allow dropping on the same table
      if (sourceTableId === table.id) {
        return;
      }

      // Use the new real-time guest move function
      await onGuestMove(guestId, sourceTableId, table.id, guestName);
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  return (
    <>
      <Card 
        variant="default" 
        className={`transition-all duration-300 flex flex-col min-h-fit ${
          isFull 
            ? 'border-4 border-green-500' 
            : 'border-2 border-primary'
        } ${
          isDragOver ? 'border-4 border-blue-500 bg-blue-50 dark:bg-blue-950' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-4 flex flex-col min-h-fit">
          {/* Table Name */}
          <div className="text-xl font-bold text-foreground mb-3 text-center">
            {table.name}
          </div>

          {/* Capacity Bar States */}
          <div className="mb-3">
            {table.guest_count < table.limit_seats ? (
              <>
                <div className="text-sm text-foreground mb-2">
                  {table.guest_count}/{table.limit_seats}
                </div>
                <Progress 
                  value={progressPercentage} 
                  className="h-2 bg-secondary [&>div]:bg-purple-500"
                />
              </>
            ) : table.guest_count === table.limit_seats ? (
              <div className="h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">Table Full</span>
              </div>
            ) : (
              <div className="h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">Over Capacity</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {table.notes && (
            <div className="mb-3">
              <div className="text-xs text-muted-foreground line-clamp-1">
                {table.notes}
              </div>
            </div>
          )}

          {/* Guest Chips - Auto-expanding */}
          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-2">Guests:</div>
            <div className="space-y-1">
              {guests.length > 0 ? (
                guests.map((guest) => (
                  <Badge
                    key={guest.id}
                    variant="secondary"
                    className="w-full justify-between text-xs py-1 px-2 cursor-grab active:cursor-grabbing hover:bg-secondary/80 transition-colors"
                    draggable
                    onDragStart={(e) => handleDragStart(e, guest)}
                  >
                    <span className="truncate">
                      {guest.first_name} {guest.last_name || ''}
                    </span>
                    <GripVertical className="h-3 w-3 flex-shrink-0 ml-1 opacity-50" />
                  </Badge>
                ))
              ) : (
                <div className="text-muted-foreground italic text-xs p-2 border-2 border-dashed border-muted rounded-md text-center">
                  {isDragOver ? 'Drop guest here' : 'No guests assigned'}
                </div>
              )}
            </div>
          </div>

          {/* Actions - Fixed at bottom */}
          <div className="flex justify-end space-x-2 mt-4">
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