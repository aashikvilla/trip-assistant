"use client";

import { useEffect, useRef } from "react";

interface PullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
  containerRef?: React.RefObject<HTMLElement>;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  containerRef,
}: PullToRefreshOptions) {
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);

  useEffect(() => {
    const el = containerRef?.current ?? window;

    const getTarget = () => containerRef?.current ?? document.documentElement;

    const handleTouchStart = (e: Event) => {
      const touch = (e as TouchEvent).touches[0];
      const scrollTop = getTarget().scrollTop;
      if (scrollTop <= 0) {
        startY.current = touch.clientY;
      }
    };

    const handleTouchMove = (e: Event) => {
      if (startY.current === null) return;
      const touch = (e as TouchEvent).touches[0];
      const dy = touch.clientY - startY.current;
      if (dy > 0) pulling.current = dy > threshold;
    };

    const handleTouchEnd = () => {
      if (pulling.current) {
        pulling.current = false;
        onRefresh();
      }
      startY.current = null;
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onRefresh, threshold, containerRef]);
}
