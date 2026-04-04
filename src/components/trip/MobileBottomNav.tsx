"use client";

import { Calendar, MessageCircle, Vote, DollarSign, Bookmark, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "itinerary" | "chat" | "polls" | "expenses" | "bookings" | "members";

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: "itinerary", label: "Itinerary", icon: Calendar },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "polls", label: "Polls", icon: Vote },
  { id: "expenses", label: "Expenses", icon: DollarSign },
  { id: "bookings", label: "Bookings", icon: Bookmark },
  { id: "members", label: "Members", icon: Users },
];

interface MobileBottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900/97 backdrop-blur-md border-t border-gray-800 safe-area-inset-bottom">
      <div className="flex items-stretch h-[60px]">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 transition-colors min-h-[44px]",
                isActive ? "text-indigo-400" : "text-gray-500 active:text-gray-300"
              )}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
              )}
              <Icon className={cn("h-5 w-5 shrink-0 transition-transform", isActive && "scale-110")} />
              <span className={cn(
                "text-[11px] leading-none font-medium truncate transition-colors",
                isActive ? "text-indigo-400" : "text-gray-500"
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export type { TabId };
