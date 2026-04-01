import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Calendar, Download, ExternalLink, Link as LinkIcon, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { Booking } from '@/hooks/useBookings';

type BookingDetails = {
  url?: string;
  notes?: string;
  files?: string[];
};

interface BookingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
}

export const BookingDetailsDialog: React.FC<BookingDetailsDialogProps> = ({ open, onOpenChange, booking }) => {
  if (!booking) return null;
  const d = (booking.details as BookingDetails | null | undefined) || {};
  const files = d.files || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{booking.type.toUpperCase()}</Badge>
            {booking.provider && <Badge variant="outline">{booking.provider}</Badge>}
            {booking.confirmation_code && <Badge variant="outline">{booking.confirmation_code}</Badge>}
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            {booking.start_time && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Start: {format(new Date(booking.start_time), 'PPp')}</span>
              </div>
            )}
            {booking.end_time && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>End: {format(new Date(booking.end_time), 'PPp')}</span>
              </div>
            )}
          </div>

          {d.url && (
            <div>
              <div className="text-sm font-medium mb-2">Link</div>
              <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-muted">
                <LinkIcon className="h-4 w-4" />
                <span>{d.url}</span>
                <ExternalLink className="h-4 w-4 ml-auto" />
              </a>
            </div>
          )}

          {files.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Attachments</div>
              <div className="flex flex-col gap-2">
                {files.map((f, idx) => {
                  let label = `file-${idx + 1}`;
                  try { const u = new URL(f); label = decodeURIComponent(u.pathname.split('/').pop() || label); } catch {}
                  return (
                    <a key={idx} href={f} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-muted">
                      <FileText className="h-4 w-4" />
                      <span className="truncate">{label}</span>
                      <Download className="h-4 w-4 ml-auto" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {d.notes && (
            <div>
              <div className="text-sm font-medium mb-1">Notes</div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{d.notes}</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
