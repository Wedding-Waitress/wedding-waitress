import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';
import { AITextChat } from './AITextChat';

interface AIFloatingChatButtonProps {
  eventSlug: string;
  eventName: string;
}

export const AIFloatingChatButton: React.FC<AIFloatingChatButtonProps> = ({
  eventSlug,
  eventName
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white z-50 animate-pulse hover:animate-none"
          size="icon"
        >
          <Bot className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            💬 Event Assistant
            <span className="text-sm font-normal text-muted-foreground">
              {eventName}
            </span>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <AITextChat eventId={eventSlug} userType="guest" />
        </div>
      </SheetContent>
    </Sheet>
  );
};
