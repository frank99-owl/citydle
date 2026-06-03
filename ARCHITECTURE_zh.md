# 系统架构文档

[English](ARCHITECTURE.md) | 中文版

本文档描述 **金融街图志** 的技术架构、数据流和设计决策。

---

## 目录

1. [系统概览](#1-系统概览)
2. [前端架构](#2-前端架构)
3. [后端架构](#3-后端架构)
4. [数据流](#4-数据流)
5. [数据库设计](#5-数据库设计)
6. [地图与渲染](#6-地图与渲染)
7. [多语言系统](#7-多语言系统)
8. [成就系统](#8-成就系统)
9. [安全与防作弊](#9-安全与防作弊)
10. [性能优化](#10-性能优化)

---

## 1. 系统概览

### 架构模式

应用采用 **Next.js 14 全栈单体架构**：

- **前端**：React 18 SPA + 自定义 Hooks 模式
- **后端**：Next.js API Routes（无服务器函数）
- **数据库**：SQLite（Node.js 原生 `node:sqlite`）
- **外部 API**：Overpass API、Nominatim API

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端浏览器                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    React SPA (page.tsx)                      ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐  ││
│  │  │  大厅   │ │  游戏   │ │  结算   │ │ 成就/分享/排行   │  ││
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────────┬────────┘  ││
│  │       │           │           │                │            ││
│  │  ┌────┴───────────┴───────────┴────────────────┴────────┐  ││
│  │  │                    自定义 Hooks                        │  ││
│  │  │  useLeafletMap | useGameLogic | useAchievements | ... │  ││
│  │  └───────────────────────┬───────────────────────────────┘  ││
│  │                          │                                   ││
│  │  ┌───────────────────────┴───────────────────────────────┐  ││
│  │  │                    Leaflet.js 地图                      │  ││
│  │  │           (Canvas 渲染, Geoman 绘图)                    │  ││
│  │  └───────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js API 路由                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ /streets │ │ /search  │ │ /history │ │/favorites│          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       │            │            │            │                  │
│  ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐          │
│  │/leaderbrd│ │  /daily  │ │          │ │          │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Overpass │ │ Nominatim│ │  SQLite  │ │  SQLite  │
│   API    │ │   API    │ │ (缓存)   │ │ (持久化) │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### 关键设计决策

| 决策 | 理由 |
|------|------|
| SPA 在根路径 `/` | 零延迟游戏加载，预初始化地图 |
| SQLite 替代 PostgreSQL | 零配置、嵌入式，适合单服务器 |
| Canvas 替代 SVG 渲染 | 数千条折线保持 60fps |
| 自定义 Hooks 替代 Redux | 更简单的状态管理，逻辑共置 |
| 静态预设 JSON | 热门城市即时加载 |

---

## 2. 前端架构

### 模块结构

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 根 SPA 编排器
│   ├── layout.tsx                # 全局布局与字体
│   ├── globals.css               # 主题与动画
│   └── api/                      # 无服务器函数
├── types/                        # TypeScript 定义
│   └── index.ts                  # 集中类型
├── hooks/                        # 自定义 React Hooks
│   ├── useLeafletMap.ts          # 地图生命周期与图层
│   ├── useMapProvider.ts         # 地图源与坐标转换
│   ├── useStreets.ts             # 街道数据获取
│   ├── useGameLogic.ts           # 核心游戏机制
│   ├── useAchievements.ts        # 成就追踪
│   ├── useStats.ts               # 个人统计
│   ├── useTutorial.ts            # 新手引导
│   ├── useShare.ts               # 分享卡片生成
│   └── useLocalStorage.ts        # 持久化存储
├── components/                   # React 组件
│   ├── lobby/                    # 大厅视图
│   ├── game/                     # 游戏中视图
│   ├── settlement/               # 结果视图
│   ├── achievement/              # 成就系统
│   ├── share/                    # 社交分享
│   ├── leaderboard/              # 全局排行
│   ├── stats/                    # 个人统计
│   ├── tutorial/                 # 新手引导
│   └── shared/                   # 可复用 UI
├── lib/                          # 工具函数
│   ├── constants.ts              # 预设与配置
│   ├── i18n.ts                   # 翻译文本
│   ├── coord.ts                  # 坐标数学
│   ├── db.ts                     # SQLite 单例
│   └── daily.ts                  # 每日挑战
└── data/                         # 静态数据
    └── presets/                   # 街道几何数据
```

### Hook 架构

每个 Hook 封装特定领域的逻辑：

| Hook | 状态 | 操作 | 依赖 |
|------|------|------|------|
| `useLeafletMap` | `mapRef`, `mapLoaded` | 初始化、销毁、图层操作、绘图 | Leaflet, Geoman |
| `useMapProvider` | `mapProvider` | 切换地图源、坐标转换 | `coord.ts` |
| `useStreets` | `streets`, `loading` | 获取、取消、缓存 | `/api/streets` |
| `useGameLogic` | `guess`, `streak`, `score` | 匹配、提示、结算 | `i18n.ts` |
| `useAchievements` | `unlocked`, `popup` | 检查、解锁、显示 | `localStorage` |
| `useStats` | `stats` | 更新、每日挑战 | `localStorage`, `/api/daily` |
| `useTutorial` | `step`, `isActive` | 开始、下一步、跳过 | `localStorage` |
| `useShare` | - | 生成图片、分享 | Canvas API |
| `useLocalStorage` | `value` | 读取、写入、同步 | `localStorage`, `storage` 事件 |

### 组件层级

```
<page.tsx>
│
├── <GameMap />                          # 背景地图
│
├── <LobbyOverlay />                     # 大厅（CSS 过渡）
│   ├── <DailyChallengeCard />           # 每日挑战卡片
│   ├── <PresetCards />                  # 城市选择
│   ├── <MapSettings />                  # 地图源与难度
│   └── <Tabs>
│       ├── <HistoryTable />             # 游戏历史
│       ├── <FavoritesList />            # 收藏地图
│       ├── <AchievementPanel />         # 成就展示
│       ├── <StatsPanel />               # 个人统计
│       └── <Leaderboard />              # 全局排行
│
├── <GameSidebar />                      # 游戏侧边栏（滑入）
│   ├── <GameStats />                    # 得分显示
│   ├── <HintConsole />                  # 提示按钮
│   ├── <StreakDisplay />                # 连击计数器
│   ├── <GuessInput />                   # 输入表单
│   ├── <StreetList />                   # 街道列表
│   └── <GameActions />                  # 操作按钮
│
├── <SettlementView />                   # 结果（侧边栏内）
│
├── <AchievementPopup />                 # 解锁通知
│
├── <ShareModal />                       # 分享选项
│
└── <TutorialOverlay />                  # 新手引导
```

### 状态管理

无外部状态管理库。状态通过以下方式管理：

1. **本地状态** (`useState`)：组件特定的 UI 状态
2. **自定义 Hooks**：领域特定的状态和逻辑
3. **Props**：父组件到子组件的通信
4. **Callbacks**：子组件到父组件的通信
5. **localStorage**：持久化的用户偏好和数据
6. **URL 参数**：可分享的游戏状态

---

## 3. 后端架构

### API 路由

| 路由 | 方法 | 用途 | 数据源 |
|------|------|------|--------|
| `/api/streets` | POST | 获取街道数据 | 预设、SQLite 缓存、Overpass |
| `/api/search` | GET | 位置搜索 | Nominatim API |
| `/api/favorites` | GET/POST/DELETE | 收藏地图 CRUD | SQLite |
| `/api/history` | GET/POST | 游戏历史 | SQLite |
| `/api/leaderboard` | GET/POST | 全局排行 | SQLite |
| `/api/daily` | GET | 每日挑战 | 基于日期的哈希 |

### 数据库层

```typescript
// lib/db.ts - 单例模式
let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync | null {
  if (!dbInstance) {
    // 延迟初始化
    // Vercel: 复制到 /tmp
    // 本地: 使用 data/ 目录
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    // 创建表...
  }
  return dbInstance;
}
```

**Vercel 解决方案**：在无服务器环境中，数据库从只读项目空间复制到可写的 `/tmp`。冷启动时数据重置。

---

## 4. 数据流

### 游戏初始化流程

```
用户点击预设 →
  1. page.tsx: setBounds(preset.bounds)
  2. useLeafletMap: fitBounds(bounds)
  3. useStreets: fetchStreets(bounds)
     ├── POST /api/streets { bounds }
     │   ├── 检查预设匹配 → 返回本地 JSON (<10ms)
     │   ├── 检查 SQLite 缓存 → 返回缓存数据
     │   └── 竞速 4 个 Overpass 镜像 → 处理并缓存
     └── 返回 streets[]
  4. useLeafletMap: drawStreets(streets)
  5. UI 过渡：大厅淡出，侧边栏滑入
```

### 猜测匹配流程

```
用户提交猜测 →
  1. useGameLogic: checkGuess(guess, streets, bounds, lang)
     ├── 标准化输入（小写、去空格、去标点）
     ├── 对每个未猜中的街道：
     │   ├── 检查名称匹配
     │   └── 检查 aliases[] 匹配
     ├── 如果没有精确匹配：
     │   ├── 计算 Levenshtein 相似度
     │   └── 如果 >60% → 返回提示
     └── 返回 { found, matchedName, hint?, direction? }
  2. 如果找到：
     ├── useLeafletMap: revealStreet(name) → 绿色折线
     ├── 更新连击计数器
     ├── 触发彩纸（按连击缩放）
     └── 检查成就
  3. 如果未找到：
     ├── 显示错误动画（1 秒）
     ├── 显示提示（如果有）
     └── 重置连击
```

### 成就检查流程

```
游戏结束 →
  1. useAchievements: checkAchievements(gameResult)
     ├── 从 localStorage 加载 unlocked[]
     ├── 对每个成就：
     │   ├── 进度：completionRate >= threshold
     │   ├── 城市大师：city === id && rate >= 1.0
     │   ├── 技能：连击/时间/错误检查
     │   └── 探索：自定义使用/城市搜索计数
     ├── 筛选新解锁
     ├── 保存到 localStorage
     └── 返回 newlyUnlocked[]
  2. 对每个新解锁：
     ├── 显示 AchievementPopup（队列）
     ├── 金属光泽动画
     └── 2.5 秒后自动消失
```

---

## 5. 数据库设计

### 表结构

```sql
-- 用户账户（默认：id=1, username='Player'）
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 收藏的地图区域
CREATE TABLE favorite_maps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  city_name TEXT,
  bounds TEXT NOT NULL,  -- JSON: { south, west, north, east }
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 游戏历史
CREATE TABLE game_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1,
  map_name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_streets INTEGER NOT NULL DEFAULT 0,
  completion_rate REAL NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 街道数据缓存（自定义区域）
CREATE TABLE street_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bounds_key TEXT UNIQUE NOT NULL,  -- "south_west_north_east"
  streets_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 全局排行榜
CREATE TABLE leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL DEFAULT 'Anonymous',
  city TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_streets INTEGER NOT NULL,
  completion_rate REAL NOT NULL,
  max_streak INTEGER NOT NULL,
  time_seconds INTEGER NOT NULL,
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 索引

```sql
CREATE INDEX idx_history_user ON game_history(user_id);
CREATE INDEX idx_history_played ON game_history(played_at);
CREATE INDEX idx_leaderboard_city ON leaderboard(city);
CREATE INDEX idx_leaderboard_rate ON leaderboard(completion_rate DESC);
CREATE INDEX idx_cache_key ON street_cache(bounds_key);
```

---

## 6. 地图与渲染

### 瓦片供应商

| 供应商 | URL | 标签 | 坐标系统 |
|--------|-----|------|----------|
| CartoDB Dark | `basemaps.cartocdn.com/dark_nolabels` | 无 | WGS-84 |
| CartoDB Light | `basemaps.cartocdn.com/light_nolabels` | 无 | WGS-84 |
| OpenStreetMap | `tile.openstreetmap.org` | 有 | WGS-84 |
| 高德地图 | `webrd0{s}.is.autonavi.com` | 有 | GCJ-02 |

### GCJ-02 坐标纠偏

中国地图供应商使用 GCJ-02 坐标系统（相对于 WGS-84 有偏移）。应用处理方式：

```typescript
// src/lib/coord.ts
export function wgs84togcj02(lng: number, lat: number): [number, number]
export function gcj02towgs84(lng: number, lat: number): [number, number]
```

当高德地图激活时：
- 街道几何：WGS-84 → GCJ-02
- 边界框：WGS-84 → GCJ-02
- 用户绘图：GCJ-02 → WGS-84（用于存储）

### 渲染管线

```
街道数据[] →
  1. 转换坐标（WGS-84 → GCJ-02，如果是高德）
  2. 为每条街道创建 Leaflet polyline
  3. 设置初始透明度：0（不可见）
  4. 添加到 canvas 图层（preferCanvas: true）
  5. 猜中时：更新透明度为 0.8，颜色为绿色
```

### 性能设置

```typescript
L.map(container, {
  preferCanvas: true,        // Canvas 替代 SVG
  zoomControl: false,        // 自定义位置
  attributionControl: true,
});

L.tileLayer(url, {
  keepBuffer: 6,             // 内存中保留额外瓦片
  updateWhenIdle: true,      // 拖拽停止后下载
  updateWhenZooming: false,  // 缩放时不下载
  maxZoom: 20,
});
```

---

## 7. 多语言系统

### 翻译架构

```typescript
// src/lib/i18n.ts
export const TRANSLATIONS = {
  zh: { /* 150+ 个键 */ },
  en: { /* 150+ 个键 */ },
};
```

### 街道名称匹配

```typescript
// src/hooks/useGameLogic.ts
function matchesAlias(guess: string, street: Street): boolean {
  const normalized = normalizeString(guess);
  
  // 检查主名称
  if (normalizeString(street.name) === normalized) return true;
  
  // 检查别名
  if (street.aliases?.some(a => normalizeString(a) === normalized)) return true;
  
  return false;
}

function normalizeString(s: string): string {
  return s.toLowerCase()
    .trim()
    .replace(/[\s\-_.]/g, '')  // 去除分隔符
    .replace(/[^\w一-鿿぀-ゟ゠-ヿ]/g, ''); // 保留 CJK
}
```

### 提示模式生成

```typescript
function generateHintPattern(name: string, lang: Language): string {
  // CJK：首字 + 下划线
  // 拉丁：首字母 + 每个单词的下划线
  if (/[一-鿿぀-ゟ]/.test(name)) {
    return name[0] + '_'.repeat(name.length - 1);
  }
  return name.split(' ').map(w => w[0] + '_'.repeat(w.length - 1)).join(' ');
}
```

---

## 8. 成就系统

### 成就类别

| 类别 | 数量 | 条件 |
|------|------|------|
| 进度 | 3 | 完成率阈值 |
| 城市大师 | 5 | 单城市 100% |
| 技能 | 3 | 连击、速度、完美 |
| 探索 | 2 | 自定义区域、城市搜索 |

### 存储

```typescript
// localStorage 键
'cartographer_achievements'  // 已解锁成就 ID 的 string[]
'cartographer_stats'         // { customUses, citySearches, speedGuesses }
```

### 解锁流程

```
游戏结束 →
  checkAchievements(gameResult) →
    newlyUnlocked[] →
      队列弹窗 →
        逐个显示 →
          2.5 秒后自动消失
```

---

## 9. 安全与防作弊

### 地图防作弊
- 无标签瓦片（CartoDB dark/light_nolabels）
- 街道名称在猜中前永不显示

### 排行榜验证
```typescript
// 服务端验证
if (completionRate < 0 || completionRate > 1) return 400;
if (score < 0 || score > totalStreets) return 400;
if (maxStreak < 0 || maxStreak > totalStreets) return 400;
if (timeSeconds < 0 || timeSeconds > 86400) return 400;
if (playerName.length > 20) playerName = playerName.slice(0, 20);
```

### 每日挑战完整性
- 基于日期种子的确定性哈希
- 同一天所有用户相同挑战
- 服务端生成（不信任客户端）

### 已知限制
- 排行榜提交无 HMAC 签名
- API 端点无速率限制
- 无用户认证（匿名游戏）

---

## 10. 性能优化

### 前端

| 优化 | 实现 |
|------|------|
| React.memo | 所有纯展示组件 |
| Canvas 渲染 | Leaflet 设置 `preferCanvas: true` |
| 增量更新 | 只重绘变化的街道 |
| 延迟加载 | Leaflet、Geoman 动态导入 |
| CSS 动画 | GPU 加速 transform |
| 防抖搜索 | 位置搜索 300ms 延迟 |

### 后端

| 优化 | 实现 |
|------|------|
| 预设匹配 | 本地 JSON (<10ms) |
| SQLite 缓存 | 避免重复 Overpass 查询 |
| 并发竞速 | 4 个镜像，最快者胜出 |
| 延迟 DB 初始化 | 避免构建时锁 |
| WAL 模式 | 并发读写 |

### 包大小

```
路由 (app)                    大小      首次加载 JS
┌ ○ /                         39 kB     126 kB
├ ○ /_not-found               875 B     88.2 kB
└ ƒ /api/*                    ~0 B      ~0 B（仅服务端）
```

---

## 附录：文件参考

### 核心文件

| 文件 | 行数 | 用途 |
|------|------|------|
| `app/page.tsx` | ~600 | 根 SPA 编排器 |
| `hooks/useGameLogic.ts` | ~300 | 核心游戏机制 |
| `hooks/useLeafletMap.ts` | ~350 | 地图生命周期 |
| `lib/i18n.ts` | ~200 | 翻译文本 |
| `lib/constants.ts` | ~100 | 预设与配置 |

### 数据文件

| 文件 | 街道数 | 大小 |
|------|--------|------|
| `data/presets/new-york.json` | 141 | ~150KB |
| `data/presets/london.json` | 360 | ~300KB |
| `data/presets/tokyo.json` | 55 | ~50KB |
| `data/presets/hong-kong.json` | 155 | ~130KB |
| `data/presets/singapore.json` | 174 | ~150KB |
