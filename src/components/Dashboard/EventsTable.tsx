import React from 'react';
import { Card } from "@/components/ui/enhanced-card";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Edit2, 
  Trash2, 
  Settings, 
  Check,
  Circle,
  Calendar,
  MapPin,
  Users
} from "lucide-react";

interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
  plan: string;
  guestLimit: number;
  isSelected?: boolean;
}

interface EventsTableProps {
  events?: Event[];
  onEventSelect?: (eventId: string) => void;
  onEventEdit?: (eventId: string) => void;
  onEventDelete?: (eventId: string) => void;
}

export const EventsTable: React.FC<EventsTableProps> = ({
  events = [
    {
      id: "1",
      name: "Harry & Nelly",
      date: "3/14/2026",
      venue: "Highlander",
      plan: "free",
      guestLimit: 120,
      isSelected: false
    },
    {
      id: "2",
      name: "Sarah & Ken's Wedding",
      date: "10/5/2025",
      venue: "The Grande Reception Epping",
      plan: "free",
      guestLimit: 150,
      isSelected: false
    },
    {
      id: "3",
      name: "Reema & Hossam's Engagement",
      date: "11/23/2025",
      venue: "Crown Casino",
      plan: "free",
      guestLimit: 80,
      isSelected: true
    },
    {
      id: "4",
      name: "Jessica & Andrew",
      date: "4/26/2026",
      venue: "Marnong Estate",
      plan: "free",
      guestLimit: 150,
      isSelected: false
    }
  ],
  onEventSelect,
  onEventEdit,
  onEventDelete
}) => {
  return (
    <Card variant="elevated" className="overflow-hidden">
      <div className="p-6 border-b border-card-border bg-gradient-subtle">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">My Events</h3>
            <p className="text-sm text-muted-foreground">
              Create and manage your wedding events
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="glass">
              No of Event {events.length}
            </Badge>
            <Button variant="gradient" size="sm">
              + Create Event
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-card-border hover:bg-muted/50">
              <TableHead className="w-12">Select</TableHead>
              <TableHead className="min-w-[200px]">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-primary" />
                  Event Name
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-primary" />
                  Date
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-primary" />
                  Venue
                </div>
              </TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-primary" />
                  Guest Limit
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow 
                key={event.id} 
                className={`
                  border-card-border hover:bg-muted/30 transition-colors cursor-pointer
                  ${event.isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''}
                `}
                onClick={() => onEventSelect?.(event.id)}
              >
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`
                      w-6 h-6 rounded-full
                      ${event.isSelected 
                        ? 'bg-primary text-primary-foreground' 
                        : 'border border-card-border hover:bg-accent'
                      }
                    `}
                  >
                    {event.isSelected ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Circle className="w-3 h-3" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    {event.isSelected && (
                      <div className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></div>
                    )}
                    {event.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {event.date}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {event.venue}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="secondary" 
                    className="glass text-xs font-medium"
                  >
                    {event.plan}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {event.guestLimit}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventEdit?.(event.id);
                      }}
                      className="w-8 h-8 text-muted-foreground hover:text-primary"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventDelete?.(event.id);
                      }}
                      className="w-8 h-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="w-8 h-8 text-muted-foreground hover:text-primary"
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};