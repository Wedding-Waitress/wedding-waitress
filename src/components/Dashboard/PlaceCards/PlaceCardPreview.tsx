import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { Guest } from '@/hooks/useGuests';
import { Eye } from 'lucide-react';

interface PlaceCardPreviewProps {
  settings: PlaceCardSettings | null;
  guests: Guest[];
  event: any;
}

interface PlaceCardData {
  guest: Guest;
  message: string;
  tableInfo: string;
}

export const PlaceCardPreview: React.FC<PlaceCardPreviewProps> = ({
  settings,
  guests,
  event
}) => {
  const currentSettings = settings || {
    event_id: '',
    user_id: '',
    font_family: 'Inter',
    font_color: '#000000',
    background_color: '#ffffff',
    background_image_url: null,
    background_image_type: 'none' as const,
    mass_message: '',
    individual_messages: {},
  };

  const generatePlaceCardData = (): PlaceCardData[] => {
    return guests.map(guest => {
      const tableInfo = guest.table_no && guest.seat_no 
        ? `Table ${guest.table_no}, Seat ${guest.seat_no}`
        : 'Unassigned';
      
      const individualMessage = currentSettings.individual_messages[guest.id];
      const message = individualMessage || currentSettings.mass_message || '';

      return {
        guest,
        message,
        tableInfo
      };
    });
  };

  const placeCards = generatePlaceCardData();

  // Group cards into pages (4 cards per page)
  const cardsPerPage = 4;
  const pages = [];
  for (let i = 0; i < placeCards.length; i += cardsPerPage) {
    pages.push(placeCards.slice(i, i + cardsPerPage));
  }

  const renderPlaceCard = (cardData: PlaceCardData, index: number) => {
    const { guest, message, tableInfo } = cardData;
    
    return (
      <div
        key={guest.id}
        className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
        style={{
          width: '45%',
          aspectRatio: '1.4/1',
          backgroundColor: currentSettings.background_color,
          fontFamily: currentSettings.font_family,
          color: currentSettings.font_color,
        }}
      >
        {/* Background Image */}
        {currentSettings.background_image_url && currentSettings.background_image_type === 'full' && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage: `url(${currentSettings.background_image_url})`,
            }}
          />
        )}

        {/* Card Content */}
        <div className="relative h-full p-4 flex flex-col justify-center text-center">
          {/* Decorative Image */}
          {currentSettings.background_image_url && currentSettings.background_image_type === 'decorative' && (
            <div className="absolute top-2 right-2 w-8 h-8">
              <img
                src={currentSettings.background_image_url}
                alt="Decoration"
                className="w-full h-full object-cover rounded"
              />
            </div>
          )}

          {/* Guest Name (Large) */}
          <div className="text-lg font-bold mb-2 leading-tight">
            {guest.first_name} {guest.last_name}
          </div>

          {/* Table/Seat Info (Smaller) */}
          <div className="text-sm mb-3 opacity-80">
            {tableInfo}
          </div>

          {/* Message */}
          {message && (
            <div className="text-xs leading-relaxed border-t pt-2 mt-auto opacity-70">
              {message}
            </div>
          )}
        </div>

        {/* Fold Line Indicator */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gray-400 opacity-50" />
      </div>
    );
  };

  if (!guests.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No assigned guests found.</p>
            <p className="text-sm">Assign guests to tables to see place cards preview.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Preview - A4 Layout
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {placeCards.length} cards • {pages.length} page{pages.length !== 1 ? 's' : ''}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {pages.map((page, pageIndex) => (
            <div key={pageIndex} className="border rounded-lg p-4 bg-white">
              <div className="text-xs text-center text-muted-foreground mb-3">
                Page {pageIndex + 1} of {pages.length} • A4 Format
              </div>
              
              {/* A4 Page Container with 4-card diagonal layout */}
              <div
                className="mx-auto bg-white border shadow-sm"
                style={{
                  width: '210px', // A4 proportions scaled down
                  height: '297px',
                  position: 'relative',
                }}
              >
                {/* 4-card diagonal grid layout */}
                <div className="absolute inset-4 grid grid-cols-2 gap-2">
                  {page.map((cardData, cardIndex) => (
                    <div
                      key={cardData.guest.id}
                      className="relative border border-gray-200 rounded overflow-hidden"
                      style={{
                        backgroundColor: currentSettings.background_color,
                        fontFamily: currentSettings.font_family,
                        color: currentSettings.font_color,
                        transform: cardIndex % 2 === 0 ? 'rotate(-2deg)' : 'rotate(2deg)',
                      }}
                    >
                      {/* Background Image */}
                      {currentSettings.background_image_url && currentSettings.background_image_type === 'full' && (
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-20"
                          style={{
                            backgroundImage: `url(${currentSettings.background_image_url})`,
                          }}
                        />
                      )}

                      {/* Card Content */}
                      <div className="relative h-full p-2 flex flex-col justify-center text-center">
                        {/* Decorative Image */}
                        {currentSettings.background_image_url && currentSettings.background_image_type === 'decorative' && (
                          <div className="absolute top-1 right-1 w-3 h-3">
                            <img
                              src={currentSettings.background_image_url}
                              alt="Decoration"
                              className="w-full h-full object-cover rounded"
                            />
                          </div>
                        )}

                        {/* Guest Name */}
                        <div className="text-xs font-bold mb-1 leading-tight">
                          {cardData.guest.first_name} {cardData.guest.last_name}
                        </div>

                        {/* Table Info */}
                        <div className="text-xs opacity-80 mb-1">
                          {cardData.tableInfo}
                        </div>

                        {/* Message */}
                        {cardData.message && (
                          <div className="text-xs leading-tight opacity-70 mt-auto">
                            {cardData.message.length > 30 
                              ? cardData.message.substring(0, 30) + '...'
                              : cardData.message
                            }
                          </div>
                        )}
                      </div>

                      {/* Fold line */}
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-px bg-gray-400 opacity-30" />
                    </div>
                  ))}
                </div>

                {/* Cutting guides */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner marks */}
                  <div className="absolute top-0 left-0 w-2 h-px bg-gray-400 opacity-50" />
                  <div className="absolute top-0 left-0 w-px h-2 bg-gray-400 opacity-50" />
                  <div className="absolute top-0 right-0 w-2 h-px bg-gray-400 opacity-50" />
                  <div className="absolute top-0 right-0 w-px h-2 bg-gray-400 opacity-50" />
                  <div className="absolute bottom-0 left-0 w-2 h-px bg-gray-400 opacity-50" />
                  <div className="absolute bottom-0 left-0 w-px h-2 bg-gray-400 opacity-50" />
                  <div className="absolute bottom-0 right-0 w-2 h-px bg-gray-400 opacity-50" />
                  <div className="absolute bottom-0 right-0 w-px h-2 bg-gray-400 opacity-50" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};