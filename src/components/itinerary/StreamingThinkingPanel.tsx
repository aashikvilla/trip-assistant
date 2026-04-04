"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Brain, Search, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { StreamEvent } from "@/services/ai/types";

interface StreamingThinkingPanelProps {
  events: StreamEvent[];
  isComplete: boolean;
}

interface ThoughtEntry {
  agentName: string;
  thought: string;
  timestamp: string;
}

// ── Friendly message helpers ────────────────────────────────────────────────

function friendlyAgentName(raw: string): string {
  if (raw.includes("Research")) return "Research";
  if (raw.includes("Planning")) return "Planning";
  if (raw.includes("Review")) return "Review";
  if (raw.includes("Orchestrator")) return "Coordinator";
  return "AI";
}

function friendlyHandoff(toAgent: string): string {
  if (toAgent.includes("Research")) return "Researching your destinations...";
  if (toAgent.includes("Planning")) return "Building your day-by-day itinerary...";
  if (toAgent.includes("Review")) return "Reviewing itinerary against your preferences...";
  return "Preparing next step...";
}

function friendlyThought(thought: string): string {
  if (thought.includes("Loading trip context")) return "Loading your trip details...";
  if (thought.includes("Persisting itinerary")) return "Saving your itinerary...";
  if (thought.includes("Sending notifications")) return "Notifying your travel group...";
  if (thought.includes("Research complete")) return "Destination research complete ✓";
  if (thought.includes("Itinerary planning complete")) return "All days planned ✓";
  if (thought.includes("No web search data")) return "Using curated knowledge for planning...";
  if (thought.includes("Analyzing trip details")) return "Analysing your trip preferences...";
  const dayMatch = thought.match(/Planning Day (\d+)/);
  if (dayMatch) return `Planning Day ${dayMatch[1]}...`;
  const researchMatch = thought.match(/Researching (.+?) \(/);
  if (researchMatch) return `Researching ${researchMatch[1]}...`;
  return thought;
}

function friendlySearch(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("restaurant") || q.includes("dining") || q.includes("cuisine") || q.includes("food")) {
    return "Searching for restaurants and local cuisine...";
  }
  if (q.includes("attraction") || q.includes("sightseeing") || q.includes("must-see")) {
    return "Searching for top attractions and landmarks...";
  }
  if (q.includes("transport") || q.includes("getting around") || q.includes("customs")) {
    return "Researching local transport and travel tips...";
  }
  if (q.includes("activit") || q.includes("experience") || q.includes("things to do")) {
    return "Finding activities that match your interests...";
  }
  return "Searching for travel information...";
}

function friendlyToolResult(success: boolean, summary: string): string {
  if (!success) return "Search unavailable — using curated knowledge instead";
  // "Found 5 attractions results for "Paris"" → "Found information about Paris"
  const destMatch = summary.match(/for "([^"]+)"/);
  const dest = destMatch ? destMatch[1] : null;
  if (dest) return `Found useful information about ${dest} ✓`;
  return summary;
}

// ── Event → ThoughtEntry transformation ────────────────────────────────────

function processEvents(events: StreamEvent[]): { thoughts: ThoughtEntry[]; currentAgent: string } {
  const thoughts: ThoughtEntry[] = [];
  let currentAgent = "AI";

  for (const event of events) {
    if (event.type === "agent_handoff") {
      currentAgent = friendlyAgentName(event.toAgent);
      thoughts.push({
        agentName: "Coordinator",
        thought: friendlyHandoff(event.toAgent),
        timestamp: event.timestamp,
      });
    } else if (event.type === "agent_thought") {
      currentAgent = friendlyAgentName(event.agentName);
      const thought = friendlyThought(event.thought);
      thoughts.push({ agentName: currentAgent, thought, timestamp: event.timestamp });
    } else if (event.type === "tool_call" && event.toolName === "web_search") {
      const query = (event.input as { query?: string })?.query ?? "";
      thoughts.push({
        agentName: currentAgent,
        thought: friendlySearch(query),
        timestamp: event.timestamp,
      });
    } else if (event.type === "tool_result" && event.toolName === "web_search") {
      thoughts.push({
        agentName: currentAgent,
        thought: friendlyToolResult(event.success, event.summary),
        timestamp: event.timestamp,
      });
    }
  }

  return { thoughts, currentAgent };
}

// ── Component ───────────────────────────────────────────────────────────────

export const StreamingThinkingPanel: React.FC<StreamingThinkingPanelProps> = ({
  events,
  isComplete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [thoughts, setThoughts] = useState<ThoughtEntry[]>([]);
  const [latestThought, setLatestThought] = useState<ThoughtEntry | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string>("AI");
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { thoughts: newThoughts, currentAgent: agent } = processEvents(events);
    setCurrentAgent(agent);
    setThoughts(newThoughts);
    setLatestThought(newThoughts[newThoughts.length - 1] ?? null);
  }, [events]);

  // Collapse on completion
  useEffect(() => {
    if (isComplete) setIsExpanded(false);
  }, [isComplete]);

  // Auto-scroll timeline
  useEffect(() => {
    if (isExpanded && timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [thoughts, isExpanded]);

  if (isComplete && thoughts.length === 0) return null;

  const getAgentIcon = (agentName: string) => {
    if (agentName === "Research") return <Search className="h-3 w-3" />;
    if (agentName === "Planning") return <Brain className="h-3 w-3" />;
    if (agentName === "Coordinator") return <ArrowRight className="h-3 w-3" />;
    return <Sparkles className="h-3 w-3" />;
  };

  const getAgentColor = (agentName: string): string => {
    if (agentName === "Research") return "bg-blue-100 text-blue-800";
    if (agentName === "Planning") return "bg-purple-100 text-purple-800";
    if (agentName === "Review") return "bg-green-100 text-green-800";
    if (agentName === "Coordinator") return "bg-orange-100 text-orange-800";
    return "bg-gray-100 text-gray-800";
  };

  const stageLabel = isComplete
    ? "Planning complete"
    : currentAgent === "Research"
    ? "Researching destinations"
    : currentAgent === "Planning"
    ? "Building itinerary"
    : currentAgent === "Review"
    ? "Reviewing preferences"
    : "AI is planning your trip";

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardContent className="pt-4 pb-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {!isComplete && (
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
            <span className="text-sm font-medium text-foreground">{stageLabel}</span>
            {!isComplete && (
              <Badge variant="outline" className={`text-xs ${getAgentColor(currentAgent)}`}>
                {getAgentIcon(currentAgent)}
                <span className="ml-1">{currentAgent}</span>
              </Badge>
            )}
          </div>
          {thoughts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setIsExpanded((v) => !v)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Details ({thoughts.length})
                </>
              )}
            </Button>
          )}
        </div>

        {/* Latest thought */}
        {latestThought && !isComplete && (
          <p className="text-xs text-muted-foreground italic truncate">
            {latestThought.thought}
          </p>
        )}

        {/* Expandable timeline */}
        {isExpanded && thoughts.length > 0 && (
          <div
            ref={timelineRef}
            className="mt-3 space-y-1 max-h-48 overflow-y-auto pr-1"
          >
            {thoughts.map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Badge
                  variant="outline"
                  className={`shrink-0 text-[10px] px-1 py-0 ${getAgentColor(t.agentName)}`}
                >
                  {t.agentName}
                </Badge>
                <span className="text-muted-foreground leading-relaxed">{t.thought}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
