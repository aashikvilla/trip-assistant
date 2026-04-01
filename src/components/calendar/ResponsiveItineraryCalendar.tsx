import React from 'react';
import { useMediaQuery } from '@/hooks/use-mobile';
import { ItineraryCalendar } from './ItineraryCalendar';
import { MobileCalendarView } from './MobileCalendarView';
import { ActivityDetailModal } from './ActivityDetailModal';
import { useSimpleItineraryCalendar } from '@/hooks/useSimpleItineraryCalendar';
interface ResponsiveItineraryCalendarProps {
  tripId: string;
  startDate: string;
  endDate: string;
  onAddActivity?: (dayNumber: number, timeSlot?: string) => void;
  className?: string;
}

export function ResponsiveItineraryCalendar({
  tripId,
  startDate,
  endDate,
  onAddActivity,
  className = ''
}: ResponsiveItineraryCalendarProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const {
    activities,
    selectedActivity,
    isActivityModalOpen,
    openActivityModal,
    closeActivityModal,
    updateActivity,
    deleteActivity,
    moveActivity,
    isUpdating,
    isDeleting
  } = useSimpleItineraryCalendar({ tripId });

  const handleAddActivityWrapper = (dayNumber: number, timeSlot?: string) => {
    onAddActivity?.(dayNumber, timeSlot);
  };

  return (
    <>
      {isMobile ? (
        <MobileCalendarView
          tripId={tripId}
          startDate={startDate}
          endDate={endDate}
          activities={activities}
          onActivityClick={handleActivityClick}
          onActivityMove={handleActivityMove}
          onAddActivity={handleAddActivityWrapper}
          className={className}
        />
      ) : (
        <ItineraryCalendar
          tripId={tripId}
          startDate={startDate}
          endDate={endDate}
          activities={activities}
          onActivityClick={handleActivityClick}
          onActivityMove={handleActivityMove}
          onActivityUpdate={handleActivityUpdate}
          className={className}
        />
      )}

      <ActivityDetailModal
        activity={selectedActivity}
        isOpen={isActivityModalOpen}
        onClose={closeActivityModal}
        onUpdate={handleActivityUpdate}
        onDelete={handleActivityDelete}
        readOnly={false}
      />
    </>
  );
}
