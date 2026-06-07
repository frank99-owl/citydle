"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Language, Achievement } from "@/types";
import { TRANSLATIONS } from "@/lib/i18n";
import { useShare } from "@/hooks/useShare";
import { generateShareImage, ShareCardData } from "./ShareCard";

interface ShareModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  completionRate: number;
  maxStreak: number;
  guessedCount: number;
  totalStreets: number;
  timeSeconds: number;
  badge: Achievement | null;
}

export function ShareModal({
  lang,
  isOpen,
  onClose,
  cityName,
  completionRate,
  maxStreak,
  guessedCount,
  totalStreets,
  timeSeconds,
  badge,
}: ShareModalProps) {
  const t = TRANSLATIONS[lang];
  const { downloadImage, copyShareLink, shareToTwitter, nativeShare } =
    useShare();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const shareData: ShareCardData = useMemo(
    () => ({
      cityName,
      completionRate,
      maxStreak,
      guessedCount,
      totalStreets,
      timeSeconds,
      badge,
      lang,
    }),
    [
      cityName,
      completionRate,
      maxStreak,
      guessedCount,
      totalStreets,
      timeSeconds,
      badge,
      lang,
    ],
  );

  // Generate preview on open
  useEffect(() => {
    if (!isOpen) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setShareBlob(null);
      setCopied(false);
      return;
    }

    let cancelled = false;
    setGenerating(true);

    generateShareImage(shareData)
      .then((blob) => {
        if (cancelled) return;
        setShareBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setGenerating(false);
      })
      .catch(() => {
        if (!cancelled) setGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, shareData]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleDownload = useCallback(() => {
    if (shareBlob) {
      downloadImage(
        shareBlob,
        `street-cartographer-${cityName.replace(/\s+/g, "-").toLowerCase()}.png`,
      );
    }
  }, [shareBlob, downloadImage, cityName]);

  const handleCopyLink = useCallback(async () => {
    const citySlug = cityName.replace(/\s+/g, "-").toLowerCase();
    const success = await copyShareLink({
      city: citySlug,
      score: guessedCount,
      total: totalStreets,
      rate: Math.round(completionRate * 100),
      streak: maxStreak,
    });
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [
    copyShareLink,
    cityName,
    guessedCount,
    totalStreets,
    completionRate,
    maxStreak,
  ]);

  const handleTwitter = useCallback(() => {
    const pct = (completionRate * 100).toFixed(1);
    const text =
      lang === "zh"
        ? `我在 Financial Street Cartographer 中探索了 ${cityName}，完成度 ${pct}%，最高连击 ${maxStreak}！🗺️`
        : `I explored ${cityName} in Financial Street Cartographer with ${pct}% completion and ${maxStreak} streak! 🗺️`;
    shareToTwitter(text);
  }, [cityName, completionRate, maxStreak, lang, shareToTwitter]);

  const handleNativeShare = useCallback(async () => {
    if (shareBlob) {
      const pct = (completionRate * 100).toFixed(1);
      const text =
        lang === "zh"
          ? `${cityName} - ${pct}% 完成度 | Financial Street Cartographer`
          : `${cityName} - ${pct}% completion | Financial Street Cartographer`;
      await nativeShare(shareBlob, text);
    }
  }, [shareBlob, cityName, completionRate, lang, nativeShare]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(26,22,16,0.85)",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="vintage-panel"
        style={{
          width: "90%",
          maxWidth: "420px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "1.5rem",
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            background: "none",
            border: "none",
            color: "#4e3629",
            fontSize: "1.2rem",
            cursor: "pointer",
            padding: "0.25rem",
            opacity: 0.6,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.6";
          }}
        >
          &times;
        </button>

        {/* Title */}
        <h3
          className="vintage-title"
          style={{
            fontSize: "1.1rem",
            color: "#8a3324",
            textAlign: "center",
            marginBottom: "1rem",
            paddingRight: "1.5rem",
          }}
        >
          {isZh(lang) ? "分享你的成就" : "Share Your Achievement"}
        </h3>

        {/* Preview */}
        <div
          style={{
            border: "2px solid rgba(66,48,35,0.3)",
            borderRadius: "4px",
            overflow: "hidden",
            marginBottom: "1rem",
            minHeight: "180px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(244,235,208,0.5)",
          }}
        >
          {generating ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#4e3629",
                fontStyle: "italic",
              }}
            >
              {isZh(lang) ? "生成分享卡片中..." : "Generating share card..."}
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Share Card Preview"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          ) : (
            <div style={{ padding: "2rem", color: "rgba(78,54,41,0.4)" }}>
              {isZh(lang) ? "预览生成失败" : "Preview generation failed"}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <button
            onClick={handleDownload}
            disabled={!shareBlob}
            className="vintage-btn"
            style={{ width: "100%", padding: "0.6rem", fontSize: "0.85rem" }}
          >
            {isZh(lang) ? "💾 保存图片" : "💾 Save Image"}
          </button>

          <button
            onClick={handleCopyLink}
            className="vintage-btn"
            style={{
              width: "100%",
              padding: "0.6rem",
              fontSize: "0.85rem",
              background: copied ? "#3a5f43" : undefined,
            }}
          >
            {copied
              ? isZh(lang)
                ? "✓ 已复制"
                : "✓ Copied"
              : isZh(lang)
                ? "🔗 复制链接"
                : "🔗 Copy Link"}
          </button>

          <button
            onClick={handleTwitter}
            className="vintage-btn"
            style={{ width: "100%", padding: "0.6rem", fontSize: "0.85rem" }}
          >
            {isZh(lang) ? "🐦 分享到 Twitter" : "🐦 Share on Twitter"}
          </button>

          {/* WeChat: just save image (Chinese users) */}
          {isZh(lang) && (
            <button
              onClick={handleDownload}
              disabled={!shareBlob}
              className="vintage-btn"
              style={{ width: "100%", padding: "0.6rem", fontSize: "0.85rem" }}
            >
              💬 微信（保存图片后分享）
            </button>
          )}

          {/* Native share on mobile */}
          {typeof navigator !== "undefined" &&
            typeof navigator.share === "function" && (
              <button
                onClick={handleNativeShare}
                disabled={!shareBlob}
                className="vintage-btn"
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  fontSize: "0.85rem",
                }}
              >
                {isZh(lang) ? "📤 更多分享" : "📤 More Share Options"}
              </button>
            )}
        </div>
      </div>
    </div>
  );
}

function isZh(lang: Language): boolean {
  return lang === "zh";
}
