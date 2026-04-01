"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Brain, Search, ArrowRight } from "lucide-react";
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
    const newThoughts: ThoughtEntry[] = [];
    let agent = "AI";

    for (const event of events) {
      if (event.type === "agent_thought") {
        newThoughts.push({
          agentName: event.agentName,
          thought: event.thought,
          timestamp: event.timestamp,
        });
        agent = event.agentName;
      } else if (event.type === "agent_handoff") {
        agent = event.toAgent;
        newThoughts.push({
          agentName: "Orchestrator",
          thought: `Handing off to ${event.toAgent}: ${event.task}`,
          timestamp: event.timestamp,
        });
      } else if (event.type === "tool_call") {
        newThoughts.push({
          agentName: agent,
          thought: `Using ${event.toolName}...`,
          timestamp: event.timestamp,
        });
      } else if (event.type === "tool_result") {
        newThoughts.push({
          agentName: agent,
          thought: event.summary,
          timestamp: event.timestamp,
        });
      }
    }

    setCurrentAgent(agent);
    setThoughts(newThoughts);
    setLatestThought(newThoughts[newThoughts.length - 1] ?? null);
  }, [events]);

  // Collapse on completion
  useEffect(() => {
    if (isComplete) {
      setIsExpanded(false);
    }
  }, [isComplete]);

  // Auto-scroll timeline
  useEffect(() => {
    if (isExpanded && timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [thoughts, isExpanded]);

  if (isComplete && thoughts.length === 0) return null;

  const getAgentIcon = (agentName: string) => {
    if (agentName.includes("Research")) return <Search className="h-3 w-3" />;
    if (agentName.includes("Planning")) return <Brain className="h-3 w-3" />;
    if (agentName.includes("Orchestrator")) return <ArrowRight className="h-3 w-3" />;
    return <Brain className="h-3 w-3" />;
  };

  const getAgentColor = (agentName: string): string => {
    if (agentName.includes("Research")) return "bg-blue-100 text-blue-800";
    if (agentName.includes("Planning")) return "bg-purple-100 text-purple-800";
    if (agentName.includes("Review")) return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardContent className="pt-4 pb-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {!isComplete && (
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
            <span className="text-sm font-medium text-foreground">
              {isComplete ? "AI Planning Complete" : "AI is thinking..."}
            </span>
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
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show timeline ({thoughts.length})
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
                  {t.agentName.replace("Agent", "")}
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
