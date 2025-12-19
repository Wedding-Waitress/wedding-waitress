/**
 * ⚠️ PRODUCTION-READY — LOCKED FOR PRODUCTION ⚠️
 * 
 * This Table Card with Drag-Drop feature is COMPLETE and APPROVED for production use.
 * 
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break drag-and-drop functionality
 * - Changes could break capacity calculations
 * - Changes could break real-time guest counts
 * - Changes could break guest chip sorting
 * 
 * See: MY_EVENTS_TABLES_GUESTLIST_SPECS.md for full specifications
 * 
 * Last locked: 2025-11-12
 */

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Edit, Trash2 } from "lucide-react";
import { TableWithGuestCount } from '@/hooks/useTables';
import { Guest } from '@/hooks/useGuests';
import { TableGuestList } from './Tables/TableGuestList';

interface TableCardProps {
  table: TableWithGuestCount;
  onEdit: (table: TableWithGuestCount) => void;
  onDelete: (tableId: string) => Promise<boolean>;
  guests: Guest[];
  eventId: string;
  isOverTable?: string | null; // ID of table being hovered over during drag
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  onEdit,
  onDelete,
  guests: allGuests,
  eventId,
  isOverTable
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filter guests for this table from the real-time guest list
  const guests = allGuests.filter(guest => guest.table_id === table.id);

  // Sort guests: numbered seats first (numerically), then non-numbered (by display_order/creation order)
  const sortedGuests = [...guests].sort((a, b) => {
    const aHasSeat = a.seat_no !== null && a.seat_no !== undefined;
    const bHasSeat = b.seat_no !== null && b.seat_no !== undefined;
    
    // If one has seat number and other doesn't, prioritize the one with seat number
    if (aHasSeat && !bHasSeat) return -1;
    if (!aHasSeat && bHasSeat) return 1;
    
    // Both have seat numbers - sort numerically by seat number
    if (aHasSeat && bHasSeat) {
      return (a.seat_no || 0) - (b.seat_no || 0);
    }
    
    // Both have no seat numbers - sort by display_order (if set) or creation time
    if (!aHasSeat && !bHasSeat) {
      // If both have display_order, use that
      if (a.display_order !== null && b.display_order !== null) {
        return a.display_order - b.display_order;
      }
      // If one has display_order and other doesn't, prioritize the one with display_order
      if (a.display_order !== null && b.display_order === null) return -1;
      if (a.display_order === null && b.display_order !== null) return 1;
      
      // Neither has display_order, sort by creation time (original add order)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    
    return 0;
  });

  // Guard against divide-by-zero and calculate progress
  const safeLimit = Math.max(table.limit_seats, 1);
  const progressPercentage = Math.min((table.guest_count / safeLimit) * 100, 100);
  const isFull = table.guest_count >= table.limit_seats;

  // Calculate capacity color based on percentage
  const getCapacityColor = () => {
    if (table.guest_count === 0) return 'bg-gray-400';
    if (progressPercentage >= 75) return 'bg-purple-500';
    if (progressPercentage >= 51) return 'bg-blue-500';
    if (progressPercentage >= 26) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  // Calculate capacity status text
  const getCapacityStatus = () => {
    if (table.guest_count === 0) return 'Empty';
    if (progressPercentage >= 75) return 'Almost Full';
    if (progressPercentage >= 51) return 'Good Capacity';
    if (progressPercentage >= 26) return 'Half Full';
    return 'Needs More Guests';
  };

  // Calculate remaining seats
  const seatsRemaining = Math.max(0, table.limit_seats - table.guest_count);


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

  // Check if this table is currently being hovered during a drag operation
  const isOver = isOverTable === table.id;

  return (
    <>
      <Card 
        className={`ww-box transition-all duration-300 flex flex-col min-h-fit ${
          isFull 
            ? 'border-4 border-green-500' 
            : 'border-2 border-primary'
        } ${
          isOver ? 'border-4 border-blue-500 bg-blue-50 dark:bg-blue-950' : ''
        }`}
      >
        <CardContent className="p-4 flex flex-col min-h-fit">
          {/* Table Name */}
          <div className="text-xl font-bold text-foreground mb-3 text-center">
            {table.name}
          </div>

          {/* Enhanced Capacity Bar States */}
          <div className="mb-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    {table.guest_count < table.limit_seats ? (
                      <>
                        {/* Capacity info row with percentage badge */}
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-semibold text-foreground">
                            {table.guest_count}/{table.limit_seats}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${
                            progressPercentage >= 75 ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                            progressPercentage >= 51 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                            progressPercentage >= 26 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                            table.guest_count === 0 ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                            'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                          }`}>
                            {Math.round(progressPercentage)}%
                          </span>
                        </div>
                        
                        {/* Animated color-coded progress bar */}
                        <div className="relative h-3 bg-secondary rounded-full overflow-hidden shadow-sm">
                          <div 
                            className={`h-full transition-all duration-500 ease-out ${getCapacityColor()} rounded-full relative`}
                            style={{ width: `${progressPercentage}%` }}
                            role="progressbar"
                            aria-valuenow={table.guest_count}
                            aria-valuemin={0}
                            aria-valuemax={table.limit_seats}
                            aria-label={`${table.guest_count} of ${table.limit_seats} seats filled`}
                          >
                            {/* Subtle shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20" />
                          </div>
                        </div>
                        
                        {/* Status label with remaining seats */}
                        <div className="text-xs text-muted-foreground mt-1.5 text-center font-medium">
                          {getCapacityStatus()} • {seatsRemaining} {seatsRemaining === 1 ? 'seat' : 'seats'} remaining
                        </div>
                      </>
                    ) : table.guest_count === table.limit_seats ? (
                      /* Full table - enhanced green banner */
                      <div 
                        className="h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md"
                        aria-label={`Table Full — ${table.guest_count} guests`}
                      >
                        <span className="text-white font-bold text-sm text-center flex items-center gap-2">
                          <span className="text-base">✓</span>
                          Full Table — {table.guest_count}
                        </span>
                      </div>
                    ) : (
                      /* Over capacity - enhanced red warning */
                      <div 
                        className="h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-md"
                        aria-label={`Over capacity by ${table.guest_count - table.limit_seats} guests`}
                      >
                        <span className="text-white font-bold text-sm text-center flex items-center gap-2">
                          <span className="text-base">⚠</span>
                          Over by +{table.guest_count - table.limit_seats}
                        </span>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                
                {/* Enhanced tooltip with detailed breakdown */}
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-sm">Table Capacity Details</p>
                    <div className="pt-1.5 space-y-1 border-t border-border/50 mt-1">
                      <div className="flex justify-between">
                        <span>Current Guests:</span>
                        <strong>{table.guest_count}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Table Limit:</span>
                        <strong>{table.limit_seats}</strong>
                      </div>
                      {table.guest_count < table.limit_seats && (
                        <div className="flex justify-between text-green-600 dark:text-green-400">
                          <span>Available:</span>
                          <strong>{seatsRemaining} {seatsRemaining === 1 ? 'seat' : 'seats'}</strong>
                        </div>
                      )}
                      {table.guest_count === table.limit_seats && (
                        <p className="text-green-600 dark:text-green-400 text-center font-medium pt-1">
                          ✓ Perfect capacity!
                        </p>
                      )}
                      {table.guest_count > table.limit_seats && (
                        <div className="flex justify-between text-red-600 dark:text-red-400">
                          <span>Over by:</span>
                          <strong>{table.guest_count - table.limit_seats}</strong>
                        </div>
                      )}
                      <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/50 mt-1">
                        <span>Fill Rate:</span>
                        <strong>{Math.round(progressPercentage)}%</strong>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Notes */}
          {table.notes && (
            <div className="mb-3">
              <div className="text-xs text-muted-foreground line-clamp-1">
                {table.notes}
              </div>
            </div>
          )}

          {/* Guest Chips - Using Sortable Components */}
          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-2">Guests:</div>
            <TableGuestList 
              tableId={table.id} 
              guests={sortedGuests} 
              isOver={isOver}
            />
          </div>

        {/* Actions - Fixed at bottom */}
        <div className="flex justify-end space-x-2 mt-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(table)}
                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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