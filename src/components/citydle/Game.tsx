"use client";

// Citydle 每日一题主组件:全球同题 → 6 层真实线索 → 6 选 1 → 方块分享 + streak。
// 数据从 /cities/*.json 静态直出,无任何后端依赖;成绩只存本机 localStorage。
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Game.module.css";
import { dayNumber, msToNextPuzzle, pickAnswerId, pickCandidates } from "@/lib/citydle/daily";
import { buildClueLayers, type ClueLayers } from "@/lib/citydle/clues";
import { drawClue, MAX_CLUES } from "@/lib/citydle/render";
import { COUNTRY } from "@/lib/citydle/countries";
import { STRINGS, type Lang } from "@/lib/citydle/i18n";
import { loadDayRecord, loadLang, loadStats, saveLang, saveResult, type Stats } from "@/lib/citydle/storage";
import type { Bbox, CityIndexEntry } from "@/lib/citydle/types";

type Phase = "loading" | "error" | "playing" | "done";
const WRONG_MAX = 5;
/** 未猜中时记录的 level(> MAX_CLUES 表示失败) */
const LOST_LEVEL = MAX_CLUES + 1;

interface Puzzle {
  bbox: Bbox;
  layers: ClueLayers;
  answer: CityIndexEntry;
  candidates: CityIndexEntry[];
}

function liveBlocks(level: number): string {
  let s = "";
  for (let i = 1; i <= MAX_CLUES; i++) s += i < level ? "🟥" : "⬜";
  return s;
}
function resultBlocks(won: boolean, level: number): string {
  let s = "";
  for (let i = 1; i <= MAX_CLUES; i++) {
    if (!won) s += "🟥";
    else s += i < level ? "🟥" : i === level ? "🟩" : "⬜";
  }
  return s;
}
function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const sec = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export function Game() {
  const [lang, setLang] = useState<Lang>("zh");
  const [phase, setPhase] = useState<Phase>("loading");
  const [day, setDay] = useState(1);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [level, setLevel] = useState(1);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [won, setWon] = useState(false);
  const [finalLevel, setFinalLevel] = useState(LOST_LEVEL);
  const [stats, setStats] = useState<Stats | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const t = STRINGS[lang];

  // 初始化:语言 → 期数 → 拉索引+形态 → 定答案与候选 → 拉城市数据 → 恢复当日成绩
  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    setLang(loadLang());
    const d = dayNumber();
    setDay(d);
    (async () => {
      try {
        const [idxRes, morphRes] = await Promise.all([fetch("/cities/index.json"), fetch("/cities/morphology.json")]);
        if (!idxRes.ok || !morphRes.ok) throw new Error("index fetch failed");
        const index: CityIndexEntry[] = await idxRes.json();
        const morphology = await morphRes.json();
        const answerId = pickAnswerId(index.map((c) => c.id), d);
        const candidates = pickCandidates(index, morphology, answerId, d);
        const cityRes = await fetch(`/cities/${answerId}.json`);
        if (!cityRes.ok) throw new Error("city fetch failed");
        const city = await cityRes.json();
        if (cancelled) return;
        setPuzzle({
          bbox: city.bbox,
          layers: buildClueLayers(city),
          answer: candidates.find((c) => c.id === answerId)!,
          candidates,
        });
        const rec = loadDayRecord(d);
        if (rec) {
          setWon(rec.won);
          setFinalLevel(rec.level);
          setLevel(Math.min(rec.level, MAX_CLUES));
          setStats(loadStats());
          setPhase("done");
        } else {
          setLevel(1);
          setEliminated([]);
          setPhase("playing");
        }
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // 画布:线索层级变化或窗口尺寸变化时重绘;结束后完整揭示(第 6 层)
  const draw = useCallback(() => {
    if (!puzzle || !canvasRef.current) return;
    const country = COUNTRY[puzzle.answer.id];
    const countryHint = country
      ? t.countryHint(lang === "zh" ? `${country.cn} ${country.en}` : country.en, puzzle.answer.en[0])
      : "";
    const drawLevel = phase === "done" ? MAX_CLUES : level;
    drawClue(canvasRef.current, puzzle.bbox, puzzle.layers, drawLevel, { countryHint });
  }, [puzzle, level, phase, lang, t]);

  useEffect(() => {
    draw();
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(draw, 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [draw]);

  // 结束后:倒计时下一题
  useEffect(() => {
    if (phase !== "done") return;
    const tick = () => setCountdown(fmtCountdown(msToNextPuzzle()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const finish = useCallback(
    (didWin: boolean, lvl: number) => {
      setWon(didWin);
      setFinalLevel(lvl);
      setStats(saveResult(day, didWin, lvl, puzzle?.answer.id || ""));
      setPhase("done");
      if (didWin) {
        import("canvas-confetti").then((m) =>
          m.default({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ["#e6c178", "#b8862f", "#f4dca0"] }),
        );
      }
    },
    [day, puzzle],
  );

  const pick = useCallback(
    (id: string) => {
      if (phase !== "playing" || !puzzle || eliminated.includes(id)) return;
      if (id === puzzle.answer.id) {
        finish(true, level);
        return;
      }
      const nextElim = [...eliminated, id];
      setEliminated(nextElim);
      if (nextElim.length >= WRONG_MAX || level >= MAX_CLUES) {
        finish(false, LOST_LEVEL);
        return;
      }
      setLevel(level + 1);
    },
    [phase, puzzle, eliminated, level, finish],
  );

  const skip = useCallback(() => {
    if (phase !== "playing") return;
    if (level >= MAX_CLUES) {
      finish(false, LOST_LEVEL);
      return;
    }
    setLevel(level + 1);
  }, [phase, level, finish]);

  const share = useCallback(() => {
    const score = won ? `${finalLevel}/${MAX_CLUES}` : `X/${MAX_CLUES}`;
    const text = `${t.shareName} #${day}  ${score}\n${resultBlocks(won, finalLevel)}\n${location.origin}`;
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(ta);
      }
      done();
    }
  }, [won, finalLevel, day, t]);

  const toggleLang = useCallback(() => {
    const next: Lang = lang === "zh" ? "en" : "zh";
    setLang(next);
    saveLang(next);
  }, [lang]);

  const shownLevel = Math.min(level, MAX_CLUES);
  const country = puzzle ? COUNTRY[puzzle.answer.id] : null;

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <span className={styles.brand}>{t.brand}</span>
        <span className={styles.puzzleNo}>{t.puzzleNo(day)}</span>
        <span className={styles.step}>{phase === "playing" ? t.step(shownLevel, MAX_CLUES) : ""}</span>
        <button className={styles.langBtn} onClick={toggleLang} aria-label="Switch language">
          {t.langToggle}
        </button>
      </header>

      <div className={styles.board}>
        <canvas ref={canvasRef} />
        {phase === "loading" && <div className={styles.center}>{t.loading}</div>}
        {phase === "error" && (
          <div className={styles.center}>
            <span>{t.loadError}</span>
            <button className={styles.primaryBtn} onClick={() => setReloadKey((k) => k + 1)}>
              {t.retry}
            </button>
          </div>
        )}
        {phase === "done" && puzzle && (
          <div className={styles.overlay} role="dialog" aria-modal="true">
            <div className={styles.ovTitle}>{won ? t.won(finalLevel, MAX_CLUES) : t.lost}</div>
            <div className={styles.ovAnswer}>
              {t.answer}
              {puzzle.answer.cn} {puzzle.answer.en}
              {country ? ` · ${lang === "zh" ? country.cn : ""} ${country.en}`.trimEnd() : ""}
            </div>
            <div className={styles.ovBlocks}>{resultBlocks(won, finalLevel)}</div>
            {stats && (
              <div className={styles.ovStats}>
                <div>
                  <b>{stats.games}</b>
                  <span>{t.played}</span>
                </div>
                <div>
                  <b>{stats.games ? Math.round((stats.wins / stats.games) * 100) : 0}%</b>
                  <span>{t.winRate}</span>
                </div>
                <div>
                  <b>{stats.streak}</b>
                  <span>{t.streak}</span>
                </div>
                <div>
                  <b>{stats.maxStreak}</b>
                  <span>{t.maxStreak}</span>
                </div>
              </div>
            )}
            <div className={styles.ovRow}>
              <button className={styles.primaryBtn} onClick={share}>
                {copied ? t.copied : t.copy}
              </button>
              <span className={styles.countdown}>
                {t.next} <b>{countdown}</b>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.clue}>{phase === "playing" ? t.clues[shownLevel - 1] : ""}</div>
      <div className={styles.blocks}>
        {phase === "done" ? resultBlocks(won, finalLevel) : liveBlocks(shownLevel)}
      </div>

      <div className={styles.choices}>
        {(puzzle?.candidates || []).map((c) => {
          const isWrong = eliminated.includes(c.id);
          return (
            <button
              key={c.id}
              className={`${styles.choiceBtn} ${isWrong ? styles.wrong : ""}`}
              disabled={phase !== "playing" || isWrong}
              onClick={() => pick(c.id)}
            >
              {c.cn} {c.en}
            </button>
          );
        })}
      </div>

      <div className={styles.skip}>
        {phase === "playing" && (
          <a onClick={skip} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && skip()}>
            {t.skip}
          </a>
        )}
      </div>
    </main>
  );
}
