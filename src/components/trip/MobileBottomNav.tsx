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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 safe-area-inset-bottom">
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 min-w-0 transition-colors",
              activeTab === id ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"
            )}
            aria-label={label}
            aria-current={activeTab === id ? "page" : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-[10px] leading-none font-medium truncate">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export type { TabId };
