import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Calendar, Link as LinkIcon, Plane, Hotel, Car, Ticket, FileText, ExternalLink, Edit, Trash2, Download, Eye, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Booking } from '@/hooks/useBookings';

const typeIcon: Record<string, React.ReactNode> = {
  flight: <Plane className="h-4 w-4" />,
  hotel: <Hotel className="h-4 w-4" />,
  car: <Car className="h-4 w-4" />,
  activity: <Ticket className="h-4 w-4" />,
  other: <FileText className="h-4 w-4" />,
};

type BookingDetails = {
  url?: string;
  notes?: string;
  files?: string[];
  location?: string;
};

interface BookingCardProps {
  booking: Booking;
  onEdit: (b: Booking) => void;
  onDelete: (b: Booking) => void;
  onView?: (b: Booking) => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({ booking, onEdit, onDelete, onView }) => {
  const d = (booking.details as BookingDetails | null | undefined) || {};
  const url = d.url;
  const files = d.files || [];
  
  // Fetch linked itinerary item if available
  const { data: itineraryItem } = useQuery({
    queryKey: ['itineraryItem', booking.itinerary_item_id],
    queryFn: async () => {
      if (!booking.itinerary_item_id) return null;
      const { data, error } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('id', booking.itinerary_item_id)
        .single();
      
      if (error) {
        console.error('Error fetching itinerary item:', error);
        return null;
      }
      return data;
    },
    enabled: !!booking.itinerary_item_id
  });

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: icon and main content */}
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-full bg-muted text-foreground">
              {typeIcon[booking.type]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium truncate">
                  {booking.provider || booking.type.toUpperCase()}
                </h4>
                {booking.confirmation_code && (
                  <Badge variant="secondary">{booking.confirmation_code}</Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                {booking.start_time && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(booking.start_time), 'PPp')}
                  </span>
                )}
                {booking.end_time && (
                  <span className="inline-flex items-center gap-1">
                    → {format(new Date(booking.end_time), 'PPp')}
                  </span>
                )}
                {url && (
                  <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                    <LinkIcon className="h-3 w-3" /> Open link <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Linked Itinerary Item */}
              {itineraryItem && (
                <div className="mt-2 p-3 bg-muted/30 rounded-md border">
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <span className="text-muted-foreground">Linked to:</span>
                    <span>{itineraryItem.title}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {itineraryItem.location_name && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {itineraryItem.location_name}
                      </span>
                    )}
                    {itineraryItem.start_time && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(itineraryItem.start_time), 'PPp')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Files */}
              {files.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {files.map((f, idx) => {
                    const label = (() => {
                      try {
                        const u = new URL(f);
                        return decodeURIComponent(u.pathname.split('/').pop() || `file-${idx+1}`);
                      } catch {
                        return `file-${idx+1}`;
                      }
                    })();
                    return (
                      <a
                        key={idx}
                        href={f}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-sm hover:bg-muted"
                      >
                        <Download className="h-3 w-3" /> {label}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onView && (
              <Button variant="ghost" size="sm" onClick={() => onView(booking)}>
                <Eye className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onEdit(booking)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(booking)} className="text-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
