import { useCallback } from "react";
import {
  generateShareImage,
  ShareCardData,
} from "@/components/share/ShareCard";
import { Language } from "@/types";

export function useShare() {
  /**
   * Generate a share image Blob from game result data.
   */
  const generateShareImageBlob = useCallback(
    async (data: ShareCardData): Promise<Blob> => {
      return generateShareImage(data);
    },
    [],
  );

  /**
   * Trigger browser download of a Blob as a PNG file.
   */
  const downloadImage = useCallback(
    (blob: Blob, filename: string = "street-cartographer-share.png") => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [],
  );

  /**
   * Copy the game share link to clipboard with game state query params.
   * Returns true on success, false on failure.
   */
  const copyShareLink = useCallback(
    async (params?: {
      city?: string;
      score?: number;
      total?: number;
      rate?: number;
      streak?: number;
    }): Promise<boolean> => {
      try {
        const url = new URL(window.location.origin);
        if (params) {
          if (params.city) url.searchParams.set("city", params.city);
          if (params.score !== undefined)
            url.searchParams.set("score", String(params.score));
          if (params.total !== undefined)
            url.searchParams.set("total", String(params.total));
          if (params.rate !== undefined)
            url.searchParams.set("rate", String(params.rate));
          if (params.streak !== undefined)
            url.searchParams.set("streak", String(params.streak));
        }
        await navigator.clipboard.writeText(url.toString());
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  /**
   * Open Twitter/X share intent with pre-filled text.
   */
  const shareToTwitter = useCallback((text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(
      `https://twitter.com/intent/tweet?text=${encoded}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, []);

  /**
   * Use the native Web Share API if available (mobile), otherwise fallback.
   */
  const nativeShare = useCallback(
    async (blob: Blob, text: string): Promise<boolean> => {
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], "street-cartographer.png", {
          type: "image/png",
        });
        const shareData: ShareData = { text };
        if (navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }
        try {
          await navigator.share(shareData);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    },
    [],
  );

  return {
    generateShareImage: generateShareImageBlob,
    downloadImage,
    copyShareLink,
    shareToTwitter,
    nativeShare,
  };
}
