"use client";

import { useRef } from "react";

interface SwipeableTabsProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export function SwipeableTabs({
  children,
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: SwipeableTabsProps) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (startX.current === null || startY.current === null) return;

    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    // Only trigger if horizontal swipe dominates
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    }

    startX.current = null;
    startY.current = null;
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className="touch-pan-y"
    >
      {children}
    </div>
  );
}
