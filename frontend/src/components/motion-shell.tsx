"use client";

import { useEffect, useRef } from "react";
import { MotionConfig } from "framer-motion";
import gsap from "gsap";
import Lenis from "lenis";

export function MotionShell({ children }: { children: React.ReactNode }) {
  const background = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | undefined;
    let animation: gsap.core.Tween | undefined;
    const update = () => {
      lenis?.destroy();
      animation?.kill();
      if (media.matches) return;
      // Smooth only document scrolling. Message history retains native scroll anchoring.
      lenis = new Lenis({ autoRaf: true, duration: 1.05, prevent: node => node.hasAttribute("data-native-scroll") });
      animation = gsap.fromTo(background.current, { scale: 1.045 }, { scale: 1, duration: 3, ease: "power2.out" });
    };
    update();
    media.addEventListener("change", update);
    return () => { lenis?.destroy(); animation?.kill(); media.removeEventListener("change", update); };
  }, []);
  return <MotionConfig reducedMotion="user"><div ref={background} className="landscape" aria-hidden="true" /><div className="landscape-shade" aria-hidden="true" />{children}</MotionConfig>;
}
