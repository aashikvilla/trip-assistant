"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Coffee, MapPin, Utensils, Loader2 } from "lucide-react";
import type { ParsedItineraryDay } from "@/services/ai/types";

interface PartialDayCardProps {
  day: ParsedItineraryDay;
  isStreaming?: boolean;
}

export const PartialDayCard: React.FC<PartialDayCardProps> = ({ day, isStreaming }) => {
  return (
    <Card className="border-primary/20 bg-background/80 animate-in fade-in-50 duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Day {day.day}</CardTitle>
          <div className="flex items-center gap-1">
            {isStreaming && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            <Badge variant="secondary" className="text-xs">
              {isStreaming ? "Planning..." : "Ready"}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground font-medium">{day.title}</p>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        {day.morning && (day.morning.activities?.length || day.morning.breakfast) && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Coffee className="h-3 w-3 text-amber-600" />
              <span className="text-xs font-medium">Morning</span>
            </div>
            <div className="ml-4 space-y-0.5">
              {day.morning.activities?.map((a, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <MapPin className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                  {a}
                </p>
              ))}
              {day.morning.breakfast && (
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Utensils className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                  {day.morning.breakfast}
                </p>
              )}
            </div>
          </div>
        )}

        {day.afternoon && (day.afternoon.activities?.length || day.afternoon.lunch) && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <MapPin className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium">Afternoon</span>
            </div>
            <div className="ml-4 space-y-0.5">
              {day.afternoon.activities?.map((a, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <MapPin className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                  {a}
                </p>
              ))}
              {day.afternoon.lunch && (
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Utensils className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                  {day.afternoon.lunch}
                </p>
              )}
            </div>
          </div>
        )}

        {day.evening && (day.evening.activities?.length || day.evening.dinner) && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Utensils className="h-3 w-3 text-purple-600" />
              <span className="text-xs font-medium">Evening</span>
            </div>
            <div className="ml-4 space-y-0.5">
              {day.evening.activities?.map((a, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <MapPin className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                  {a}
                </p>
              ))}
              {day.evening.dinner && (
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Utensils className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                  {day.evening.dinner}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
