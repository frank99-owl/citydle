// 盲测页逻辑。与 DATA、游戏源码(STRINGS / buildClueLayers / drawClue / mulberry32 / seededShuffle)
// 和 playtest.mjs(assignPuzzles / encodeResult / LOST_LEVEL)一起内联在同一个作用域里,由 make-playtest.mjs 拼装。
// 规则与 Game.tsx 一致:6 条线索,选错划掉并消耗一条线索,错满 5 个或线索用完即失败。

const WRONG_MAX = 5;
const STORE_KEY = "citydle-playtest:" + DATA.set;

const T = {
  zh: {
    brand: "城脉",
    tag: "盲测",
    introTitle: "帮忙试玩城脉",
    introLead: "城脉是一个看真实路网认城市的小游戏。我们在测题目难度:想知道一般人看到第几条线索能认出来。",
    rulesTitle: "怎么玩",
    notesTitle: "开始前",
    notes: (n) => [
      `一共 ${n + 1} 题,大约 10 分钟。第 1 题是热身,不计入结果。`,
      "凭直觉作答就好,请不要查地图或上网搜索。",
      "玩完会得到一段成绩码,复制后发给邀请你的人。",
    ],
    nameLabel: "你的称呼(选填,方便对上是谁)",
    namePlaceholder: "比如:小王",
    start: "开始",
    resume: "继续上次的进度",
    warm: "热身题",
    progress: (i, n) => `第 ${i} / ${n} 题`,
    wonAt: (lv) => `第 ${lv} 条线索认出来了`,
    lost: "没认出来",
    answer: (name) => `答案是 ${name}`,
    next: "下一题",
    finish: "看结果",
    doneTitle: "测完了,谢谢!",
    doneLead: "请把下面这段成绩码完整复制,发给邀请你的人。里面只有你每题的选择和用时。",
    codeLabel: "成绩码",
    copy: "复制成绩码",
    copied: "已复制",
    copyFallback: "已全选,请手动复制",
    doneNote: "成绩码也存在这个浏览器里,关掉页面再打开还能看到。",
    warmShort: "热身",
  },
  en: {
    brand: "Citydle",
    tag: "Playtest",
    introTitle: "Help us test Citydle",
    introLead: "Citydle is a game where you name a city from its real street map. We are testing how hard the puzzles are: at which clue do people recognise the city?",
    rulesTitle: "How to play",
    notesTitle: "Before you start",
    notes: (n) => [
      `${n + 1} puzzles, about 10 minutes. The first one is a warm-up and is not counted.`,
      "Go with your gut. Please don't look at maps or search online.",
      "At the end you get a result code. Copy it and send it to whoever invited you.",
    ],
    nameLabel: "Your name (optional, so we know whose result it is)",
    namePlaceholder: "e.g. Alex",
    start: "Start",
    resume: "Continue where you left off",
    warm: "Warm-up",
    progress: (i, n) => `Puzzle ${i} of ${n}`,
    wonAt: (lv) => `Recognised at clue ${lv}`,
    lost: "Not recognised",
    answer: (name) => `The answer was ${name}`,
    next: "Next puzzle",
    finish: "See results",
    doneTitle: "All done, thank you!",
    doneLead: "Copy the whole result code below and send it to whoever invited you. It only holds your picks and timings for each puzzle.",
    codeLabel: "Result code",
    copy: "Copy result code",
    copied: "Copied",
    copyFallback: "Selected. Copy it by hand.",
    doneNote: "The code is also kept in this browser, so you can close the page and come back to it.",
    warmShort: "Warm-up",
  },
};

const $ = (id) => document.getElementById(id);
const N = DATA.puzzles.length;
const layersCache = {};
const layersOf = (id) => (layersCache[id] ||= buildClueLayers(DATA.geometry[id]));

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    return s && s.set === DATA.set ? s : null;
  } catch {
    return null;
  }
}
function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // 无痕窗口等场景存不了,只是刷新后不能续玩
  }
}

function randomId() {
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

function fresh() {
  const tester = randomId();
  const order = [
    { id: DATA.warmup.id, arm: "phi", warmup: true },
    ...assignPuzzles(tester, N, mulberry32, seededShuffle).map(({ index, arm }) => ({ id: DATA.puzzles[index].id, arm })),
  ];
  const lang = (navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en";
  return { set: DATA.set, tester, name: "", lang, started: false, order, step: 0, plays: [], cur: null };
}

let state = load() || fresh();
const t = () => T[state.lang];
const s = () => STRINGS[state.lang];

function puzzleOf(slot) {
  if (slot.warmup) return DATA.warmup;
  return DATA.puzzles.find((p) => p.id === slot.id);
}
const cityName = (id) => (state.lang === "zh" ? DATA.names[id].cn : DATA.names[id].en);

function startPuzzle() {
  state.cur = { level: 1, eliminated: [], picks: [], skips: [], t0: Date.now(), done: false, won: false };
  save();
}

// ---- 渲染 ----

function applyStatic() {
  document.documentElement.lang = state.lang === "zh" ? "zh" : "en";
  for (const el of document.querySelectorAll("[data-t]")) el.textContent = t()[el.dataset.t];
  $("lang").textContent = s().langToggle;
  $("rules").replaceChildren(...s().obLines.map(li));
  $("notes").replaceChildren(...t().notes(N).map(li));
  $("name").placeholder = t().namePlaceholder;
  $("start").textContent = state.started ? t().resume : t().start;
}
function li(text) {
  const el = document.createElement("li");
  el.textContent = text;
  return el;
}

function blocks(level, done, won) {
  const out = [];
  for (let i = 1; i <= MAX_CLUES; i++) {
    const el = document.createElement("span");
    if (done) el.className = !won || i < level ? "used" : i === level ? "hit" : "";
    else el.className = i < level ? "used" : i === level ? "now" : "";
    out.push(el);
  }
  return out;
}

function drawBoard() {
  const slot = state.order[state.step];
  const cur = state.cur;
  const country = DATA.names[slot.id].country;
  const hint = s().countryHint(state.lang === "zh" ? country.cn : country.en, DATA.names[slot.id].en[0]);
  drawClue($("board"), DATA.geometry[slot.id].bbox, layersOf(slot.id), cur.done ? MAX_CLUES : cur.level, { countryHint: hint });
}

function renderPlay() {
  const slot = state.order[state.step];
  const cur = state.cur;
  const puzzle = puzzleOf(slot);
  $("progress").textContent = slot.warmup ? t().warm : t().progress(state.step, N);
  $("clue").textContent = cur.done ? "" : `${s().step(cur.level, MAX_CLUES)} · ${s().clues[cur.level - 1]}`;
  $("clue").hidden = cur.done;
  $("blocks").replaceChildren(...blocks(cur.done && cur.won ? state.plays.at(-1).level : cur.level, cur.done, cur.won));

  $("cands").replaceChildren(
    ...puzzle.arms[slot.arm].candidates.map((id) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cand";
      b.textContent = cityName(id);
      const out = cur.eliminated.includes(id);
      if (out) b.classList.add("out");
      if (cur.done && id === slot.id) b.classList.add("answer");
      b.disabled = out || cur.done;
      b.addEventListener("click", () => pick(id));
      return b;
    }),
  );
  $("skip").hidden = cur.done;
  $("skip").textContent = s().skip;
  $("verdict").hidden = !cur.done;
  if (cur.done) {
    const play = state.plays.at(-1);
    $("verdictLine").textContent = play.won ? t().wonAt(play.level) : t().lost;
    $("verdictAnswer").textContent = t().answer(cityName(slot.id));
    $("next").textContent = state.step + 1 < state.order.length ? t().next : t().finish;
  }
  drawBoard();
}

function result() {
  const r = { tester: state.tester, set: state.set, lang: state.lang, plays: state.plays };
  if (state.name) r.name = state.name;
  return r;
}

function renderDone() {
  $("progress").textContent = "";
  $("code").value = encodeResult(result());
  $("summary").replaceChildren(
    ...state.plays.map((p, i) => {
      const row = document.createElement("li");
      const n = document.createElement("span");
      n.className = "n";
      n.textContent = p.warmup ? "·" : String(i);
      const name = document.createElement("span");
      name.textContent = p.warmup ? `${cityName(p.id)} (${t().warmShort})` : cityName(p.id);
      const b = document.createElement("span");
      b.className = "blocks";
      b.replaceChildren(...blocks(p.level, true, p.won));
      row.append(n, name, b);
      return row;
    }),
  );
}

function render() {
  applyStatic();
  const phase = !state.started ? "intro" : state.step >= state.order.length ? "done" : "play";
  $("intro").hidden = phase !== "intro";
  $("play").hidden = phase !== "play";
  $("done").hidden = phase !== "done";
  if (phase === "intro") $("progress").textContent = "";
  if (phase === "play") renderPlay();
  if (phase === "done") renderDone();
}

// ---- 操作 ----

function finish(won) {
  const slot = state.order[state.step];
  const cur = state.cur;
  const play = {
    id: slot.id,
    arm: slot.arm,
    won,
    level: won ? cur.level : LOST_LEVEL,
    picks: cur.picks,
    skips: cur.skips,
    ms: Date.now() - cur.t0,
  };
  if (slot.warmup) play.warmup = true;
  if (cur.resumed) play.resumed = true;
  state.plays.push(play);
  cur.done = true;
  cur.won = won;
  save();
  render();
}

function pick(id) {
  const slot = state.order[state.step];
  const cur = state.cur;
  if (!cur || cur.done || cur.eliminated.includes(id)) return;
  cur.picks.push({ id, level: cur.level, t: Date.now() - cur.t0 });
  if (id === slot.id) return finish(true);
  cur.eliminated.push(id);
  if (cur.eliminated.length >= WRONG_MAX || cur.level >= MAX_CLUES) return finish(false);
  cur.level++;
  save();
  render();
}

function skip() {
  const cur = state.cur;
  if (!cur || cur.done) return;
  cur.skips.push({ level: cur.level, t: Date.now() - cur.t0 });
  if (cur.level >= MAX_CLUES) return finish(false);
  cur.level++;
  save();
  render();
}

function next() {
  state.step++;
  if (state.step < state.order.length) startPuzzle();
  else state.cur = null;
  save();
  render();
  window.scrollTo(0, 0);
}

$("startForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!state.started) {
    state.name = $("name").value.trim().slice(0, 40);
    state.started = true;
    startPuzzle();
  }
  save();
  render();
});
$("skip").addEventListener("click", skip);
$("next").addEventListener("click", next);
$("lang").addEventListener("click", () => {
  state.lang = state.lang === "zh" ? "en" : "zh";
  save();
  render();
});
$("copy").addEventListener("click", () => {
  const code = $("code").value;
  const fallback = () => {
    $("code").focus();
    $("code").select();
    $("copyStatus").textContent = t().copyFallback;
  };
  try {
    navigator.clipboard.writeText(code).then(() => ($("copyStatus").textContent = t().copied), fallback);
  } catch {
    fallback();
  }
});

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!$("play").hidden) drawBoard();
  }, 120);
});

// 刷新后接着上次那题:已看到的线索不收回,用时标记为中断过
if (state.cur && !state.cur.done) state.cur.resumed = true;
$("name").value = state.name;
render();
