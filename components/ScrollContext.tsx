"use client";
import { useState, useEffect, createContext, useContext } from "react";
import Lenis from "lenis";

const SmoothScrollContext = createContext<Lenis | null>(null);

export const useSmoothScroll = () => useContext(SmoothScrollContext);

export default function ScrollContext({ children }: { children: React.ReactNode }) {
  const [lenisRef, setLenisRef] = useState<Lenis | null>(null);

  useEffect(() => {
    const scroller = new Lenis({
      lerp: 0.09,
      wheelMultiplier: 0.9,
      smoothWheel: true,
      // Let nested scroll containers (drawers, modals, tables, charts lists) scroll natively
      prevent: (node) =>
        node.closest(
          '[data-lenis-prevent], [role="dialog"], [data-vaul-drawer], .overflow-auto, .overflow-y-auto, .overflow-scroll, .custom-scrollbar'
        ) !== null,
    });
    let rafId: number | null = null;

    function raf(time: number) {
      scroller.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);
    setLenisRef(scroller);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      scroller.destroy();
    };
  }, []);

  return <SmoothScrollContext.Provider value={lenisRef}>{children}</SmoothScrollContext.Provider>;
}
