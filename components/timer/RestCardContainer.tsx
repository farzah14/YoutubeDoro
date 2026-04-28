"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Segmented } from "../ui/Segmented";
import { PlainRestCard } from "./PlainRestCard";
import { YouTubeRestCard } from "./YouTubeRestCard";

interface RestCardContainerProps {
  topicToday: string;
  totalTodaySec: number;
  onRestDone: (sec: number) => void;
  onRestStop: (sec: number) => void;
  onYTDone: (sec: number) => void;
  onYTStop: (sec: number) => void;
}

export function RestCardContainer({
  topicToday,
  totalTodaySec,
  onRestDone,
  onRestStop,
  onYTDone,
  onYTStop,
}: RestCardContainerProps) {
  const [mode, setMode] = useState<"plain" | "youtube">("plain");

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle>Rest</CardTitle>
          <Segmented
            value={mode}
            onChange={(v) => setMode(v as "plain" | "youtube")}
            options={[
              { label: "Standard", value: "plain" },
              { label: "YouTube", value: "youtube" },
            ]}
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {mode === "plain" ? (
          <PlainRestCard 
            totalTodaySec={totalTodaySec} 
            onDone={onRestDone} 
            onStop={onRestStop} 
          />
        ) : (
          <YouTubeRestCard 
            totalTodaySec={totalTodaySec} 
            onDone={onYTDone} 
            onStop={onYTStop} 
          />
        )}
      </CardContent>
    </Card>
  );
}
