import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import {
  ExternalLink,
  Clock,
  MapPin,
  Hotel,
  Plane,
  Car,
  Ticket,
  Pencil,
  Download,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { AddBookingDialog } from "@/components/trip/detail/Bookings/AddBookingDialog";
import { useAuth } from "@/hooks/useAuth";

import { BookingType } from "@/hooks/useBookings";
import { Plus } from "lucide-react";
import {
  useBookings,
  type Booking,
  type BookingDetails,
} from "@/hooks/useBookings";

// Map itinerary item types to booking types ('flight' | 'hotel' | 'car' | 'activity' | 'other')
const ITEM_TYPE_TO_BOOKING_TYPE: Record<string, BookingType> = {
  activity: "activity",
  food: "activity",
  lodging: "hotel",
  hotel: "hotel",
  transport: "flight",
  flight: "flight",
  train: "activity",
  bus: "activity",
  ferry: "activity",
  tour: "activity",
  event: "activity",
  other: "other",
  car: "car",
  car_rental: "car",
  note: "other",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Tables<"itinerary_items"> | null;
  onEdit?: (item: Tables<"itinerary_items">) => void;
  onDelete?: (item: Tables<"itinerary_items">) => void;
}

export const ItineraryItemDetailsDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  item,
  onEdit,
  onDelete,
}) => {
  const { user } = useAuth();
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const { data: bookings = [] } = useBookings(item?.trip_id || "");

  if (!item) return null;

  // Determine booking type based on item type
  const bookingType = ITEM_TYPE_TO_BOOKING_TYPE[item.type] || "other";

  // Prepare initial values for the booking form
  const getBookingInitialValues = () => {
    const details: Record<string, unknown> = {
      notes: item.notes || "",
      location: item.location_name || "",
    };

    // Only add external_link if it exists
    if (item.external_link) {
      details.external_link = item.external_link;
    }

    return {
      type: bookingType,
      provider: item.title || "",
      start_time: item.start_time || "",
      end_time: item.end_time || "",
      confirmation_code: "",
      details,
    };
  };

  // Format date for booking
  const startDate = item.start_time ? new Date(item.start_time) : null;
  const endDate = item.end_time ? new Date(item.end_time) : null;

  const normalizedLink = (() => {
    if (!item.external_link) return undefined;
    const url = item.external_link.trim();
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  })();

  const openLink = () => {
    if (normalizedLink) {
      window.open(normalizedLink, "_blank", "noopener,noreferrer");
    }
  };

  const timeStr = (() => {
    const s = item.start_time ? new Date(item.start_time) : null;
    const e = item.end_time ? new Date(item.end_time) : null;
    const fmt = (d: Date) =>
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (s && e) return `${fmt(s)} - ${fmt(e)}`;
    if (s) return fmt(s);
    if (e) return fmt(e);
    return item.time_slot || undefined;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{item.title}</span>
          </DialogTitle>
          <DialogDescription>Day {item.day_number ?? "—"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {timeStr && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{timeStr}</span>
            </div>
          )}

          {item.location_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{item.location_name}</span>
            </div>
          )}

          {item.activity_description && (
            <div>
              <Label className="text-xs uppercase text-muted-foreground">
                Description
              </Label>
              <p className="text-sm mt-1 whitespace-pre-line">
                {item.activity_description}
              </p>
            </div>
          )}

          {item.food_suggestion && (
            <div>
              <Label className="text-xs uppercase text-muted-foreground">
                Food Suggestion
              </Label>
              <p className="text-sm mt-1">{item.food_suggestion}</p>
            </div>
          )}

          {/* Booking section below Food Suggestion (if linked) */}
          {item.booking_id && (
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase text-muted-foreground">
                  Booking
                </Label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const b = bookings.find((bk) => bk.id === item.booking_id);
                    if (b) {
                      setEditingBooking(b);
                      setShowAddBooking(true);
                    }
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              {(() => {
                const booking = bookings.find((b) => b.id === item.booking_id);
                if (!booking) {
                  return (
                    <p className="text-sm mt-1 text-muted-foreground">
                      Linked to a booking.
                    </p>
                  );
                }
                const details =
                  (booking.details as BookingDetails | null) || {};
                const url: string | undefined = details.url || undefined;
                const files: string[] = Array.isArray(details.files)
                  ? details.files
                  : [];
                return (
                  <div className="space-y-2 mt-1">
                    {url && (
                      <div>
                        <Button
                          variant="link"
                          size="sm"
                          className="px-0 text-primary"
                          onClick={() => window.open(url, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" /> View Booking
                          details
                        </Button>
                      </div>
                    )}
                    {files.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Documents</div>
                        <div className="space-y-1">
                          {files.map((f, i) => (
                            <Button
                              key={i}
                              variant="link"
                              size="sm"
                              className="px-0 text-primary justify-start"
                              onClick={() => window.open(f, "_blank")}
                            >
                              <Download className="h-3 w-3 mr-2" />
                              {(() => {
                                try {
                                  const u = new URL(f);
                                  return decodeURIComponent(
                                    u.pathname.split("/").pop() || `file-${i + 1}`
                                  );
                                } catch {
                                  return `file-${i + 1}`;
                                }
                              })()}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          {/* Not linked: CTA card to add booking */}
          {!item.booking_id && user?.id === item.created_by && (
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase text-muted-foreground">
                  Booking
                </Label>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Have you booked or reserved this? Add your reservation details,
                links, and documents here.{" "}
                <Button
                  variant="link"
                  size="sm"
                  className="px-0 text-primary align-baseline"
                  onClick={() => setShowAddBooking(true)}
                >
                  Add booking details
                </Button>
                .
              </p>
            </div>
          )}

          {/* Notes removed to avoid duplication with description */}
        </div>

        {/* Bottom actions row */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            {normalizedLink && (
              <Button
                variant="link"
                size="sm"
                onClick={openLink}
                className="px-0 text-primary"
              >
                <ExternalLink className="h-4 w-4 mr-1" /> More Info
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(item)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
      <AddBookingDialog
        open={showAddBooking}
        onOpenChange={(o) => {
          setShowAddBooking(o);
          if (!o) setEditingBooking(null);
        }}
        tripId={item.trip_id}
        initialValues={!editingBooking ? getBookingInitialValues() : undefined}
        initialItineraryItemId={item.id}
        booking={editingBooking || undefined}
      />
    </Dialog>
  );
};
