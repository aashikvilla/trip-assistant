import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useItineraryItems } from '@/hooks/useItineraryItems';

interface ItineraryItemSelectorProps {
  tripId: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  /** when true, hide items that are already linked to a different booking */
  excludeLinked?: boolean;
}

export const ItineraryItemSelector: React.FC<ItineraryItemSelectorProps> = ({
  tripId,
  value,
  onChange,
  disabled = false,
  className = '',
  excludeLinked = true,
}) => {
  const { data: items = [], isLoading } = useItineraryItems(tripId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const formatDate = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleDateString();
    } catch {
      return '';
    }
  };

  // Radix Select requires SelectItem value not to be an empty string.
  // Use a sentinel for "None" and map it to an empty string externally.
  const NONE_VALUE = '__none__';

  const filtered = excludeLinked
    ? items.filter((it) => !it.booking_id || it.id === value)
    : items;

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">Link to Itinerary Item</label>
      <Select 
        value={value || NONE_VALUE}
        onValueChange={(v) => onChange(v === NONE_VALUE ? '' : v)}
        disabled={disabled || filtered.length === 0}
      >
        <SelectTrigger>
          <SelectValue placeholder={filtered.length === 0 ? 'No itinerary items available' : 'Select an itinerary item'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>
            None
          </SelectItem>
          {filtered.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.title}
              {(() => {
                const date = formatDate(item.start_time as string | null);
                return date ? ` (${date})` : '';
              })()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ItineraryItemSelector;
