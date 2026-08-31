"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/time";

interface HomeHeroProps {
  hidden?: boolean;
  use24Hour?: boolean;
  showSeconds?: boolean;
  name?: string;
  greetingStyle?: "dynamic" | "generic" | "hidden";
}

function getClockState(use24Hour: boolean, showSeconds: boolean) {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const time = formatClock(now, use24Hour, showSeconds);

  return {
    time,
    greeting: hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening",
    dynamicLine:
      day === 1
        ? "Let’s set the tone for the week."
        : hour < 12
          ? "A clear start for one meaningful thing."
          : hour < 18
            ? "Keep the gentle momentum going."
            : "Close the day with calm progress.",
  };
}

export function HomeHero({
  hidden = false,
  use24Hour = false,
  showSeconds = false,
  name = "",
  greetingStyle = "dynamic",
}: HomeHeroProps) {
  const [clock, setClock] = useState({ time: "--:--", greeting: "Welcome", dynamicLine: "Your focus room is ready." });

  useEffect(() => {
    const updateClock = () => setClock(getClockState(use24Hour, showSeconds));
    updateClock();
    const interval = window.setInterval(updateClock, showSeconds ? 1_000 : 30_000);
    return () => window.clearInterval(interval);
  }, [showSeconds, use24Hour]);

  if (hidden) return null;

  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      {greetingStyle !== "hidden" && (
        <h2 id="home-hero-title" className="home-hero__greeting">
          <span>{clock.greeting}{name ? `, ${name}` : ""}!</span>
          {greetingStyle === "dynamic" && <span>{clock.dynamicLine}</span>}
        </h2>
      )}
      <time className="home-hero__clock numeric-time" aria-label={`Current time ${clock.time}`}>
        {clock.time}
      </time>
    </section>
  );
}
