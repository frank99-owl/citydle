"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect to the home page with all existing search parameters
    router.replace(`/?${searchParams.toString()}`);
  }, [router, searchParams]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        alignItems: "center",
        justifyContent: "center",
        background: "#2c2519",
        color: "#f4ebd0",
        fontFamily: "var(--font-cinzel), serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid rgba(197,160,89,0.3)",
            borderTop: "3px solid #c5a059",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 1rem",
          }}
        />
        <p style={{ fontStyle: "italic", fontSize: "0.9rem" }}>
          Loading map data...
        </p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={null}>
      <RedirectContent />
    </Suspense>
  );
}
