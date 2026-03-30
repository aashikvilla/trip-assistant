import { supabase } from "@/integrations/supabase/client";
import { 
  EnhancedItineraryItem, 
  BulkItineraryCreate, 
  TripStatistics, 
  ActivityFilter,
  HotelRecommendation,
  LocalTravelInfo,
  ActivityType
} from "@/types/trip";

export class EnhancedItineraryService {
  private supabase = supabase;

  /**
   * Bulk insert itinerary items with optional clearing of existing items
   */
  async bulkCreateItineraryItems(data: BulkItineraryCreate): Promise<number> {
    try {
      const { data: result, error } = await this.supabase
        .rpc('bulk_insert_itinerary_items', {
          p_trip_id: data.trip_id,
          p_items: JSON.stringify(data.items),
          p_clear_existing: data.clear_existing || false
        });

      if (error) {
        console.error('Error bulk creating itinerary items:', error);
        throw error;
      }

      return result || 0;
    } catch (error) {
      console.error('Failed to bulk create itinerary items:', error);
      throw error;
    }
  }

  /**
   * Get enhanced itinerary items with filtering
   */
  async getEnhancedItineraryItems(
    tripId: string, 
    filter?: ActivityFilter
  ): Promise<EnhancedItineraryItem[]> {
    try {
      let query = this.supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day_number', { ascending: true })
        .order('time_slot', { ascending: true });

      // Apply filters
      if (filter) {
        if (filter.activityTypes && filter.activityTypes.length > 0) {
          query = query.in('activity_type', filter.activityTypes);
        }
        
        if (filter.isAiGenerated !== undefined) {
          query = query.eq('is_ai_generated', filter.isAiGenerated);
        }
        
        if (filter.hasBookingRequired !== undefined) {
          query = query.eq('booking_required', filter.hasBookingRequired);
        }
        
        if (filter.weatherDependent !== undefined) {
          query = query.eq('weather_dependent', filter.weatherDependent);
        }
        
        if (filter.dayNumbers && filter.dayNumbers.length > 0) {
          query = query.in('day_number', filter.dayNumbers);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching enhanced itinerary items:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch enhanced itinerary items:', error);
      throw error;
    }
  }

  /**
   * Update a single itinerary item
   */
  async updateItineraryItem(
    itemId: string, 
    updates: Partial<EnhancedItineraryItem>
  ): Promise<EnhancedItineraryItem> {
    try {
      const { data, error } = await this.supabase
        .from('itinerary_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) {
        console.error('Error updating itinerary item:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to update itinerary item:', error);
      throw error;
    }
  }

  /**
   * Delete an itinerary item
   */
  async deleteItineraryItem(itemId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('itinerary_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('Error deleting itinerary item:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete itinerary item:', error);
      throw error;
    }
  }

  /**
   * Reorder activities within a day
   */
  async reorderActivitiesInDay(
    tripId: string, 
    dayNumber: number, 
    itemIds: string[]
  ): Promise<void> {
    try {
      // Update time slots based on order
      const timeSlots = this.generateTimeSlots(itemIds.length);
      
      const updates = itemIds.map((itemId, index) => ({
        id: itemId,
        time_slot: timeSlots[index],
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        await this.supabase
          .from('itinerary_items')
          .update({
            time_slot: update.time_slot,
            updated_at: update.updated_at
          })
          .eq('id', update.id)
          .eq('trip_id', tripId)
          .eq('day_number', dayNumber);
      }
    } catch (error) {
      console.error('Failed to reorder activities:', error);
      throw error;
    }
  }

  /**
   * Get trip statistics
   */
  async getTripStatistics(tripId: string): Promise<TripStatistics> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_trip_statistics', { trip_uuid: tripId });

      if (error) {
        console.error('Error fetching trip statistics:', error);
        throw error;
      }

      return data || {
        totalDays: 0,
        totalActivities: 0,
        aiGeneratedActivities: 0,
        manualActivities: 0,
        activitiesByType: {} as Record<ActivityType, number>,
        averageActivitiesPerDay: 0
      };
    } catch (error) {
      console.error('Failed to fetch trip statistics:', error);
      throw error;
    }
  }

  /**
   * Save hotel recommendations for a trip
   */
  async saveHotelRecommendations(
    tripId: string, 
    recommendations: HotelRecommendation[]
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('trips')
        .update({
          hotel_recommendations: JSON.stringify(recommendations),
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId);

      if (error) {
        console.error('Error saving hotel recommendations:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to save hotel recommendations:', error);
      throw error;
    }
  }

  /**
   * Save local travel information for a trip
   */
  async saveLocalTravelInfo(
    tripId: string, 
    travelInfo: LocalTravelInfo
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('trips')
        .update({
          local_travel_info: JSON.stringify(travelInfo),
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId);

      if (error) {
        console.error('Error saving local travel info:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to save local travel info:', error);
      throw error;
    }
  }

  /**
   * Get hotel recommendations for a trip
   */
  async getHotelRecommendations(tripId: string): Promise<HotelRecommendation[]> {
    try {
      const { data, error } = await this.supabase
        .from('trips')
        .select('hotel_recommendations')
        .eq('id', tripId)
        .single();

      if (error) {
        console.error('Error fetching hotel recommendations:', error);
        throw error;
      }

      return data?.hotel_recommendations || [];
    } catch (error) {
      console.error('Failed to fetch hotel recommendations:', error);
      throw error;
    }
  }

  /**
   * Get local travel information for a trip
   */
  async getLocalTravelInfo(tripId: string): Promise<LocalTravelInfo | null> {
    try {
      const { data, error } = await this.supabase
        .from('trips')
        .select('local_travel_info')
        .eq('id', tripId)
        .single();

      if (error) {
        console.error('Error fetching local travel info:', error);
        throw error;
      }

      return data?.local_travel_info || null;
    } catch (error) {
      console.error('Failed to fetch local travel info:', error);
      throw error;
    }
  }

  /**
   * Create a new activity manually
   */
  async createActivity(
    tripId: string,
    dayNumber: number,
    activity: Omit<EnhancedItineraryItem, 'id' | 'trip_id' | 'created_at' | 'updated_at'>
  ): Promise<EnhancedItineraryItem> {
    try {
      const { data, error } = await this.supabase
        .from('itinerary_items')
        .insert({
          trip_id: tripId,
          day_number: dayNumber,
          ...activity,
          is_ai_generated: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating activity:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to create activity:', error);
      throw error;
    }
  }

  /**
   * Move activity to different day
   */
  async moveActivityToDay(
    itemId: string,
    newDayNumber: number,
    newTimeSlot?: string
  ): Promise<void> {
    try {
      const updates: any = {
        day_number: newDayNumber,
        updated_at: new Date().toISOString()
      };

      if (newTimeSlot) {
        updates.time_slot = newTimeSlot;
      }

      const { error } = await this.supabase
        .from('itinerary_items')
        .update(updates)
        .eq('id', itemId);

      if (error) {
        console.error('Error moving activity to day:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to move activity to day:', error);
      throw error;
    }
  }

  /**
   * Generate time slots for activities
   */
  private generateTimeSlots(count: number): string[] {
    const slots: string[] = [];
    let currentHour = 9; // Start at 9 AM
    
    for (let i = 0; i < count; i++) {
      const startTime = `${currentHour.toString().padStart(2, '0')}:00`;
      const endHour = currentHour + 2; // 2-hour slots
      const endTime = `${endHour.toString().padStart(2, '0')}:00`;
      
      slots.push(`${startTime} - ${endTime}`);
      currentHour += 2;
      
      // Reset to next day if we go past 10 PM
      if (currentHour > 22) {
        currentHour = 9;
      }
    }
    
    return slots;
  }

  /**
   * Validate activity data before saving
   */
  validateActivity(activity: Partial<EnhancedItineraryItem>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!activity.activity_name || activity.activity_name.trim().length === 0) {
      errors.push('Activity name is required');
    }

    if (!activity.day_number || activity.day_number < 1) {
      errors.push('Valid day number is required');
    }

    if (activity.duration_minutes && activity.duration_minutes < 0) {
      errors.push('Duration must be positive');
    }

    if (activity.external_link && !this.isValidUrl(activity.external_link)) {
      errors.push('External link must be a valid URL');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a string is a valid URL
   */
  private isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
}

// Export singleton instance
export const enhancedItineraryService = new EnhancedItineraryService();
