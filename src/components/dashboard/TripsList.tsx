
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Calendar, Users, ArrowRight, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export const TripsList = () => {
  const { data: trips, isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          trip_members!inner(role, profile_id)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!trips?.length) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle className="mb-2">No trips yet</CardTitle>
          <CardDescription className="mb-4">
            Start planning your next adventure by creating your first trip
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {trips.map((trip) => (
        <Card key={trip.id} className="group hover:shadow-lg transition-shadow duration-200">
          {trip.cover_image_url && (
            <div className="h-48 bg-cover bg-center rounded-t-lg" 
                 style={{ backgroundImage: `url(${trip.cover_image_url})` }}>
            </div>
          )}
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="line-clamp-1">{trip.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {trip.destination_main || 'Multiple destinations'}
                </CardDescription>
              </div>
              <Badge variant="outline" className="ml-2">
                {trip.trip_members[0]?.role}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trip.start_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(trip.start_date), 'MMM d, yyyy')}
                  {trip.end_date && ` - ${format(new Date(trip.end_date), 'MMM d, yyyy')}`}
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {trip.trip_members.length} member{trip.trip_members.length !== 1 ? 's' : ''}
              </div>

              {trip.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {trip.description}
                </p>
              )}
              
              <div className="pt-2">
                <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Link to={`/trips/${trip.id}`}>
                    View Trip
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
