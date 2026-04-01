"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, X } from "lucide-react";

interface TripRecommendationPromptProps {
  tripId: string;
  destination: string;
  open: boolean;
  onClose: () => void;
}

interface Recommendation {
  text: string;
}

export const TripRecommendationPrompt: React.FC<TripRecommendationPromptProps> = ({
  tripId,
  destination,
  open,
  onClose,
}) => {
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([{ text: "" }]);
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = () => {
    if (recommendations.length < 3) {
      setRecommendations((prev) => [...prev, { text: "" }]);
    }
  };

  const handleRemove = (index: number) => {
    setRecommendations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, text: string) => {
    setRecommendations((prev) => prev.map((r, i) => (i === index ? { text } : r)));
  };

  const handleSave = async () => {
    const validRecs = recommendations.filter((r) => r.text.trim().length > 0);
    if (validRecs.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      for (const rec of validRecs) {
        await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId, destination, text: rec.text.trim() }),
        });
      }

      toast({
        title: "Recommendations saved!",
        description: "Your travel tips will help future co-travelers.",
      });
      onClose();
    } catch {
      toast({
        title: "Failed to save recommendations",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Share Your Travel Tips
          </DialogTitle>
          <DialogDescription>
            Help your co-travelers plan better trips to{" "}
            <strong>{destination}</strong>. Share up to 3 recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {recommendations.map((rec, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1">
                <Textarea
                  placeholder={`Tip ${index + 1}: e.g., "Visit the old town at sunrise for stunning photos"`}
                  value={rec.text}
                  onChange={(e) => handleChange(index, e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                  maxLength={300}
                />
              </div>
              {recommendations.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 mt-1"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}

          {recommendations.length < 3 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleAdd}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add another tip
            </Button>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Skip
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save tips"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
