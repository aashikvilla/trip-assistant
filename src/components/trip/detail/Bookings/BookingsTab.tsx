import React, { useState } from 'react';
import { TabContent } from '../Common/TabContent';
import { Button } from '@/components/ui/Button';
import { Plus, Calendar, X } from 'lucide-react';
import { useBookings, useDeleteBooking, type Booking } from '@/hooks/useBookings';
import { BookingCard } from './BookingCard';
import { AddBookingDialog } from './AddBookingDialog';
import { BookingDetailsDialog } from './BookingDetailsDialog';
import { toast } from 'sonner';

interface BookingsTabProps {
  tripId: string;
}

export const BookingsTab: React.FC<BookingsTabProps> = ({ tripId }) => {
  const { data: bookings = [], isLoading } = useBookings(tripId);
  const deleteBooking = useDeleteBooking();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [viewing, setViewing] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const onEdit = (b: Booking) => {
    setEditing(b);
    setShowDialog(true);
  };

  const onDelete = async (b: Booking) => {
    if (!confirm('Delete this booking?')) return;
    try {
      await deleteBooking.mutateAsync({ id: b.id, tripId });
      toast.success('Booking deleted');
    } catch {
      toast.error('Failed to delete booking');
    }
  };

  const onView = (b: Booking) => {
    setViewing(b);
    setShowDetails(true);
  };

  // Get unique booking types for filter
  const bookingTypes = React.useMemo(() => {
    const types = new Set(bookings.map(b => b.type));
    return Array.from(types).sort();
  }, [bookings]);

  // Filter bookings by selected type
  const filteredBookings = React.useMemo(() => {
    if (!selectedType) return bookings;
    return bookings.filter(booking => booking.type === selectedType);
  }, [bookings, selectedType]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Bookings</h2>
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Booking
          </Button>
        </div>
        
        {bookingTypes.length > 0 && (
          <div className="flex flex-nowrap gap-1 items-center bg-muted p-1 rounded-md w-full overflow-x-auto no-scrollbar">
            <Button
              type="button"
              variant={!selectedType ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3 flex-1 sm:flex-none sm:px-4"
              onClick={() => setSelectedType(null)}
            >
              All
            </Button>
            {bookingTypes.map((type) => (
              <Button
                key={type}
                type="button"
                variant={selectedType === type ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3 flex-1 sm:flex-none sm:px-4 capitalize"
                onClick={() => setSelectedType(type)}
              >
                {type}
              </Button>
            ))}
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading bookings…</div>
        ) : bookings.length === 0 ? (
          <div className="rounded-lg border p-6 bg-white text-center">
            <div className="flex justify-center mb-2"><Calendar className="h-6 w-6 text-muted-foreground" /></div>
            <h4 className="font-medium mb-1">No bookings yet</h4>
            <p className="text-sm text-muted-foreground">Add your flights, hotels, activities and more.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {bookings.length === 0 
                  ? 'No bookings yet. Add your first booking to get started.'
                  : `No ${selectedType} bookings found.`}
              </div>
            ) : (
              filteredBookings.map((b) => (
                <BookingCard key={b.id} booking={b} onEdit={onEdit} onDelete={onDelete} onView={onView} />
              ))
            )}
          </div>
        )}
      </div>

      <AddBookingDialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setEditing(null);
        }}
        tripId={tripId}
        booking={editing}
      />

      <BookingDetailsDialog
        open={showDetails}
        onOpenChange={(open) => {
          setShowDetails(open);
          if (!open) setViewing(null);
        }}
        booking={viewing}
      />
    </>
  );
};
