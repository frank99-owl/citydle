"use client";

import { memo } from "react";

interface GameMapProps {
  mapContainerId: string;
}

export const GameMap = memo(function GameMap({ mapContainerId }: GameMapProps) {
  return (
    <section
      aria-label="Game map"
      style={{ position: "absolute", inset: 0, zIndex: 0 }}
    >
      <div
        id={mapContainerId}
        role="application"
        aria-label="Interactive map for street guessing game"
        style={{ height: "100%", width: "100%" }}
      />
      {/* Vintage Paper Map Filter Overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "radial-gradient(circle, transparent 40%, rgba(44,37,25,0.2) 100%)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />
    </section>
  );
});
