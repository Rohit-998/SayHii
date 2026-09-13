"use client";

import { useEffect, useRef } from "react";
import { MotionConfig } from "framer-motion";
import gsap from "gsap";
import Lenis from "lenis";

// Deterministic positions keep server and client markup identical.
const rainDrops = Array.from({ length: 72 }, (_, index) => {
  const position = ((index * 37) % 73) / 73;
  const depth = index % 3;
  return {
    left: `calc(${position * 100}% + ${position * 16}vh)`,
    width: depth === 2 ? 1.5 : 1,
    height: 16 + depth * 10,
    opacity: .13 + depth * .07,
    animationDuration: `${1.3 - depth * .24 + (index % 7) * .045}s`,
    animationDelay: `${-index * .173}s`,
  };
});

export function MotionShell({ children }: { children: React.ReactNode }) {
  const background = useRef<HTMLDivElement>(null);
  const rain = useRef<HTMLDivElement>(null);
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
    const updateVisibility = () => rain.current?.toggleAttribute("data-paused", document.hidden);
    update();
    updateVisibility();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      lenis?.destroy();
      animation?.kill();
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);
  return <MotionConfig reducedMotion="user">
    <div ref={background} className="landscape" aria-hidden="true" />
    <div className="landscape-shade" aria-hidden="true" />
    <div ref={rain} className="rain" aria-hidden="true">
      {rainDrops.map((style, index) => <span className="rain-drop" style={style} key={index} />)}
    </div>
    {children}
  </MotionConfig>;
}
