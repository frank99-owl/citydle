"use client";

import { Language, Achievement } from "@/types";
import { TRANSLATIONS } from "@/lib/i18n";

export interface ShareCardData {
  cityName: string;
  completionRate: number;
  maxStreak: number;
  guessedCount: number;
  totalStreets: number;
  timeSeconds: number;
  badge: Achievement | null;
  lang: Language;
}

/**
 * Draw a vintage-style share card onto an offscreen canvas and return as Blob.
 */
export async function generateShareImage(data: ShareCardData): Promise<Blob> {
  const W = 600;
  const H = 400;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const t = TRANSLATIONS[data.lang];
  const isZh = data.lang === "zh";

  // --- Background ---
  // Parchment base
  ctx.fillStyle = "#f4ebd0";
  ctx.fillRect(0, 0, W, H);

  // Subtle paper grain texture
  const grain = ctx.createLinearGradient(0, 0, W, H);
  grain.addColorStop(0, "rgba(230,223,199,0.6)");
  grain.addColorStop(0.5, "rgba(216,206,176,0.4)");
  grain.addColorStop(1, "rgba(230,223,199,0.6)");
  ctx.fillStyle = grain;
  ctx.fillRect(0, 0, W, H);

  // --- Border decoration ---
  ctx.strokeStyle = "#423023";
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, W - 24, H - 24);

  // Inner border (thinner)
  ctx.strokeStyle = "rgba(197,160,89,0.6)";
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 18, W - 36, H - 36);

  // Corner ornaments
  const cornerSize = 20;
  const corners: [number, number][] = [
    [22, 22],
    [W - 22 - cornerSize, 22],
    [22, H - 22 - cornerSize],
    [W - 22 - cornerSize, H - 22 - cornerSize],
  ];
  ctx.fillStyle = "#c5a059";
  corners.forEach(([x, y], i) => {
    ctx.beginPath();
    if (i === 0) {
      ctx.arc(x, y, cornerSize / 3, 0, Math.PI * 1.5);
    } else if (i === 1) {
      ctx.arc(x + cornerSize, y, cornerSize / 3, Math.PI * 0.5, Math.PI * 2);
    } else if (i === 2) {
      ctx.arc(x, y + cornerSize, cornerSize / 3, Math.PI * 1.5, Math.PI * 3.5);
    } else {
      ctx.arc(
        x + cornerSize,
        y + cornerSize,
        cornerSize / 3,
        Math.PI,
        Math.PI * 3,
      );
    }
    ctx.fill();
  });

  // --- Title ---
  ctx.fillStyle = "#8a3324";
  ctx.font = "bold 22px Cinzel, Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(t.shareCardTitle, W / 2, 58);

  // City name
  ctx.fillStyle = "#2c2519";
  ctx.font = 'italic 16px "IM Fell English", Georgia, serif';
  const cityLabel = data.cityName;
  ctx.fillText(cityLabel, W / 2, 82);

  // --- Divider ---
  ctx.strokeStyle = "#c5a059";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 96);
  ctx.lineTo(W - 60, 96);
  ctx.stroke();

  // Decorative diamond in divider center
  ctx.fillStyle = "#c5a059";
  ctx.save();
  ctx.translate(W / 2, 96);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-4, -4, 8, 8);
  ctx.restore();

  // --- Stats grid ---
  const statsY = 120;
  const colW = (W - 80) / 3;

  const stats = [
    {
      label: t.exploreLabel,
      value: `${(data.completionRate * 100).toFixed(1)}%`,
      sublabel: `${data.guessedCount}/${data.totalStreets}`,
    },
    {
      label: t.maxStreakLabel,
      value: `${data.maxStreak}`,
      sublabel: t.shareStreakSublabel,
    },
    {
      label: t.shareTimeLabel,
      value: formatTime(data.timeSeconds),
      sublabel: t.shareTimeSublabel,
    },
  ];

  stats.forEach((stat, i) => {
    const cx = 40 + colW * i + colW / 2;

    // Value (large)
    ctx.fillStyle = "#c5a059";
    ctx.font = "bold 28px Cinzel, Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(stat.value, cx, statsY + 30);

    // Label
    ctx.fillStyle = "#4e3629";
    ctx.font = "11px Cinzel, Georgia, serif";
    ctx.fillText(stat.label, cx, statsY + 50);

    // Sub label
    ctx.fillStyle = "rgba(78,54,41,0.5)";
    ctx.font = 'italic 10px "IM Fell English", Georgia, serif';
    ctx.fillText(stat.sublabel, cx, statsY + 64);
  });

  // Vertical dividers between stats
  ctx.strokeStyle = "rgba(66,48,35,0.15)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    const x = 40 + colW * i;
    ctx.beginPath();
    ctx.moveTo(x, statsY - 5);
    ctx.lineTo(x, statsY + 70);
    ctx.stroke();
  }

  // --- Badge section ---
  const badgeY = 210;
  if (data.badge) {
    // Badge icon (drawn as a shield shape)
    const badgeCx = W / 2;
    const badgeCy = badgeY + 30;

    // Shield background
    const tierColor =
      data.badge.tier === "gold"
        ? "#c5a059"
        : data.badge.tier === "silver"
          ? "#b0b0b0"
          : "#a0724e";

    ctx.fillStyle = tierColor;
    ctx.beginPath();
    ctx.moveTo(badgeCx, badgeCy - 22);
    ctx.lineTo(badgeCx + 18, badgeCy - 14);
    ctx.lineTo(badgeCx + 18, badgeCy + 4);
    ctx.quadraticCurveTo(badgeCx + 18, badgeCy + 18, badgeCx, badgeCy + 26);
    ctx.quadraticCurveTo(badgeCx - 18, badgeCy + 18, badgeCx - 18, badgeCy + 4);
    ctx.lineTo(badgeCx - 18, badgeCy - 14);
    ctx.closePath();
    ctx.fill();

    // Shield inner
    ctx.fillStyle = "#f4ebd0";
    ctx.beginPath();
    ctx.moveTo(badgeCx, badgeCy - 16);
    ctx.lineTo(badgeCx + 12, badgeCy - 10);
    ctx.lineTo(badgeCx + 12, badgeCy + 2);
    ctx.quadraticCurveTo(badgeCx + 12, badgeCy + 12, badgeCx, badgeCy + 18);
    ctx.quadraticCurveTo(badgeCx - 12, badgeCy + 12, badgeCx - 12, badgeCy + 2);
    ctx.lineTo(badgeCx - 12, badgeCy - 10);
    ctx.closePath();
    ctx.fill();

    // Badge text
    ctx.fillStyle = tierColor;
    ctx.font = "bold 10px Cinzel, serif";
    ctx.textAlign = "center";
    ctx.fillText(
      data.badge.tier === "gold"
        ? "★"
        : data.badge.tier === "silver"
          ? "☆"
          : "•",
      badgeCx,
      badgeCy + 6,
    );

    // Badge name
    ctx.fillStyle = "#8a3324";
    ctx.font = "bold 14px Cinzel, Georgia, serif";
    ctx.fillText(
      isZh ? data.badge.nameCn : data.badge.name,
      badgeCx,
      badgeCy + 48,
    );

    // Badge description
    ctx.fillStyle = "rgba(78,54,41,0.6)";
    ctx.font = 'italic 10px "IM Fell English", Georgia, serif';
    ctx.fillText(data.badge.description, badgeCx, badgeCy + 64);
  } else {
    ctx.fillStyle = "rgba(78,54,41,0.4)";
    ctx.font = 'italic 12px "IM Fell English", Georgia, serif';
    ctx.textAlign = "center";
    ctx.fillText(t.badgeNotEarned, W / 2, badgeY + 35);
  }

  // --- Bottom watermark ---
  ctx.fillStyle = "rgba(66,48,35,0.25)";
  ctx.font = "10px Cinzel, Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(t.shareCardTitle, W / 2, H - 30);

  // Date
  ctx.fillStyle = "rgba(66,48,35,0.2)";
  ctx.font = 'italic 9px "IM Fell English", Georgia, serif';
  const dateStr = new Date().toLocaleDateString(isZh ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  ctx.fillText(dateStr, W / 2, H - 16);

  // --- Export ---
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to generate share image"));
    }, "image/png");
  });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
