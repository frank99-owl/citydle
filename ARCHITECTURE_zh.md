# 系统架构文档 (ARCHITECTURE_zh.md)

[English Version](ARCHITECTURE.md)

本文档阐述了《金融街图志 (Financial Street Cartographer)》的系统设计、数据流向以及数据库表结构。

---

## 1. 整体架构设计

系统采用 Next.js 14 的全栈单体架构。为实现零延迟的游戏加载体验，整个应用在根路径 (`/`) 被设计为**单页应用 (SPA)**。前端将主大厅布局与进行中的游戏控制台整合在同一页面中，并在用户进入页面时，立即在后台预初始化全屏的 Leaflet 地图。原先的 `/game` 路由目前作为一个轻量级的客户端重定向包装器，将查询参数传递给根路由。

```
+-----------------------------------------------------------------------+
|                            前端浏览器 (SPA)                           |
|  - Leaflet.js (后台初始化, Canvas 渲染)                                |
|  - UI 视图: 大厅遮罩层与游戏侧边栏 (由 CSS 过渡动画驱动)               |
|  - URL 参数同步 (通过 window.history.replaceState 实现书签支持)        |
|  - 状态管理 (街区列表, 连击数, 猜测记录, 爆炸粒子)                      |
+-----------------------------------+-----------------------------------+
                                    |
                          HTTPS (API Routes)
                                    |
+-----------------------------------v-----------------------------------+
|                           Next.js API 服务                            |
|  - /api/streets (静态预设路由 & 带缓存的 Overpass 镜像源并发竞速)     |
|  - /api/search (用于自定义区域查询的 OSM Nominatim 代理)              |
|  - /api/favorites (SQLite 收藏夹 CRUD)                                |
|  - /api/history (SQLite 成绩历史与最高分记录)                         |
+-----------------------------------+-----------------------------------+
                                    |
          +--------------------------+--------------------------+
          | (地理请求)               | (搜索代理)               | (SQL 查询)
+--------v--------+        +--------v--------+        +--------v--------+
|  Overpass API   |        |  OSM Nominatim  |        | SQLite 数据库   |
| (并发竞速)      |        | (搜索服务器)     |        | (延迟 getDb())  |
+-----------------+        +-----------------+        +-----------------+
```

---

## 2. 前端模块架构（重构后）

前端已从单体巨型组件重构为模块化架构，职责分离清晰：

```
src/
├── app/
│   └── page.tsx                    # 根编排器（约 570 行）
│       - 组合 hooks 和组件
│       - 管理顶层状态转换
│       - 处理历史/收藏 API 调用
├── types/
│   └── index.ts                    # 集中 TypeScript 类型定义
├── hooks/                          # 自定义 React Hooks
│   ├── useLeafletMap.ts            # 地图生命周期、图层、绘图
│   ├── useMapProvider.ts           # 供应商状态、坐标转换
│   ├── useStreets.ts               # 街道数据获取与缓存
│   ├── useGameLogic.ts             # 猜测、连击、提示、结算
│   └── useLocalStorage.ts          # localStorage 持久化封装
├── components/
│   ├── map/GameMap.tsx              # Leaflet 容器 + 覆盖层
│   ├── lobby/                       # 大厅视图组件
│   │   ├── LobbyOverlay.tsx         # 大厅主容器
│   │   ├── PresetCards.tsx          # 城市选择卡片网格
│   │   ├── MapSettings.tsx          # 地图源与难度设置
│   │   ├── HistoryTable.tsx         # 游戏历史表格
│   │   └── FavoritesList.tsx        # 收藏地图列表
│   ├── game/                        # 游戏中组件
│   │   ├── GameSidebar.tsx          # 游戏侧边栏容器
│   │   ├── GameStats.tsx            # 得分与完成度显示
│   │   ├── GuessInput.tsx           # 街道名称输入表单
│   │   ├── HintConsole.tsx          # 提示按钮与线索显示
│   │   ├── StreakDisplay.tsx        # 连击计数器
│   │   ├── StreetList.tsx           # 已解锁街道列表
│   │   └── GameActions.tsx          # 收藏/放弃/返回按钮
│   ├── settlement/
│   │   └── SettlementView.tsx       # 游戏结算与成就展示
│   └── shared/
│       ├── LanguageToggle.tsx       # 语言切换按钮
│       └── LoadingSpinner.tsx       # 加载指示器
└── lib/                             # 工具函数（未改动）
    ├── constants.ts                 # 预设、成就、类型
    ├── i18n.ts                      # 翻译文本（中/英）
    ├── coord.ts                     # WGS-84/GCJ-02 坐标转换
    └── db.ts                        # SQLite 单例
```

### Hook 职责划分

| Hook | 职责 | 返回值 |
|------|------|--------|
| `useLeafletMap` | 地图初始化/销毁、图层管理、Geoman 绘图 | `mapRef`、绘图/图层操作方法 |
| `useMapProvider` | 供应商状态、瓦片配置、坐标转换 | `mapProvider`、`toMapLatLng`、`toGameLatLng` |
| `useStreets` | 街道 API 调用、请求取消、加载状态 | `streets`、`fetchStreets`、`loading` |
| `useGameLogic` | 猜测匹配、连击、提示、结算、成就 | 游戏状态 + 操作方法 |
| `useLocalStorage` | SSR 安全的 localStorage 读写 | `[value, setter]` |

### 组件层级结构

```
<page.tsx>
├── <GameMap />                     # 背景地图
├── <LobbyOverlay />                # 大厅（游戏中淡出）
│   ├── <PresetCards />
│   ├── <MapSettings />
│   ├── <HistoryTable />
│   └── <FavoritesList />
├── <GameSidebar />                 # 游戏侧边栏（滑入）
│   ├── <GameStats />
│   ├── <HintConsole />
│   ├── <StreakDisplay />
│   ├── <GuessInput />
│   ├── <StreetList />
│   └── <GameActions />
└── <SettlementView />              # 结果覆盖层
```

---

## 3. 核心数据流

### A. 街道谜题数据流 (游戏初始化)
1. **选择/绘制**：玩家选择预设的金融街区（例如华尔街）或在自定义模式下拉框确定坐标（`south, west, north, east`）。
2. **API 请求**：前端向 `/api/streets` 发送包含坐标范围的 `POST` 请求。
3. **预设匹配 (瞬时)**：
   * 后端将坐标范围与已知的预设进行比对。
   * 如果匹配成功，它会直接从 `/data/presets/[preset-id].json` 中读取预编译的街道名称和几何坐标，耗时小于 10ms。
4. **缓存检查**：
   * 如果是自定义拉框，后端将使用解析出的坐标字符串作为键值，查询本地 SQLite 中的 `street_cache` 表。
   * 如果缓存命中，则立即解析并返回街道几何数据，绕过外部网络请求。
5. **并发 Overpass 竞速 (缓存未命中)**：
   * 如果缓存未命中，后端构建一个优化过的正则查询语句：
     `way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street|pedestrian|road)(_link)?$"]["name"](bounds);`
   * 后端同时向 4 个公开的 Overpass API 镜像源发起请求（使用 `Promise.any`），一旦最快的镜像源响应，立即中止其他剩余请求。
   * 处理几何数据并将其保存到 SQLite `street_cache` 中以供下次使用，然后返回结果。
6. **前端渲染**：前端解析街道名称和坐标列表，并在 Leaflet 地图上绘制透明的矢量路径。

### B. 玩家答题与连击判定 (游戏进行中)
1. 玩家在输入框输入猜测的拼写。
2. 前端进行模糊清洗比对（不区分大小写、去除首尾空格）。
3. 若猜中：
   * 将对应的地图矢量线透明度设为 `0.8` 并变为深绿色，地图视角平移并居中该街道。
   * 连击数（Streak）加一，若连击数大于 1，触发 `canvas-confetti` 粒子动画。
   * 连击粒子数量与散射角度随 Streak 值线性递增：
     `particleCount = Math.min(30 + streak * 15, 180)`
4. 若猜错：
   * 连击数重置为 `0`。

### C. 自定义模式地点搜索
1. 在自定义模式中，用户在搜索框中输入城市或地址名称。
2. 前端对输入进行防抖处理并请求代理接口 `/api/search?q=...`。
3. 服务端将查询转发给 OSM Nominatim，获取匹配的地点及其边界框 (bounding box) 和详细信息。
4. 用户选择搜索结果后，地图将平滑平移至目标坐标边界。

### D. 导航生命周期（完整闭环）
整个 UI 形成了一个完整的导航闭环。每个状态都有一条明确的路径可以返回大厅：

```
                  ┌──────────────────────────────────┐
                  │             大厅                   │
                  │  (预设城市 / 收藏地图 / 自定义)    │
                  └──┬─────────┬──────────┬───────────┘
                     │         │          │
              预设   │  收藏   │   自定义 │
                     ▼         ▼          ▼
                  ┌─────────────────────────────────┐
                  │          加载街道中                │
                  │  （可见「返回主殿」按钮）          │
                  └──────────┬──────────────────────┬┘
                             │                      │
                      加载完成│               取消   │
                             ▼                      │
                  ┌──────────────────────┐          │
                  │      游戏进行中        │          │
                  │  [收藏] [放弃结算]    │          │
                  │  [返回主殿]           │──────────┤
                  └──────┬───────────────┘          │
                         │ 放弃 / 全部猜中           │
                         ▼                          │
                  ┌──────────────────────┐          │
                  │    结算 / 成绩展示     │          │
                  │  [返回主殿]           │──────────┤
                  └──────────────────────┘          │
                                                    │
                             ┌──────────────────────┘
                             ▼
                  ┌──────────────────────┐
                  │       大厅           │ （历史记录和收藏列表已刷新）
                  └──────────────────────┘
```

**安全机制：**
* **请求取消**：使用 `fetchIdRef` 计数器使玩家在加载过程中离开时的进行中 API 响应失效，防止陈旧状态更新。
* **退出确认**：在活跃的（未结算的）游戏中，点击「返回主殿」会触发 `window.confirm()` 确认对话框，防止意外丢失进度。
* **URL 清理**：`returnToLobby()` 清除 URL 搜索参数、重置所有游戏状态、移除地图图层，并刷新历史记录和收藏列表。

---

## 4. 数据库设计 (SQLite)

采用 Node.js 22.5+ 原生提供的 `node:sqlite` （`DatabaseSync`）同步接口。为了防止 Next.js 编译/构建阶段产生文件锁冲突，数据库使用 `getDb()` 单例模式进行延迟初始化。

**Vercel 无服务器部署兼容方案：**
由于 Vercel 的 Serverless 容器在运行时提供只读文件系统（除 `/tmp` 目录外），数据库无法直接在项目根目录下执行写入。在数据库 lazy 初始化时，若检测到处于 Vercel Serverless 环境，系统会自动检查 `/tmp/cartographer.db` 是否存在，若不存在则将项目包内 `process.cwd()/data/cartographer.db` 的模版数据库复制到 `/tmp/cartographer.db` 中并连接。若 SQLite 初始化由于 Node 版本差异或模块缺失导致失败，API 路由会捕获异常并降级，返回空列表或 HTTP 503，避免页面直接崩溃。

### 表结构：

#### 1. `users` (玩家表)
* `id` (INTEGER, 主键): 用户 ID。
* `username` (TEXT, 唯一): 玩家名称，默认插入 id 为 1 的 `Player`。
* `created_at` (DATETIME): 账号创建时间。

#### 2. `favorite_maps` (收藏地图表)
* `id` (INTEGER, 主键): 收藏 ID。
* `user_id` (INTEGER, 外键): 关联 `users.id`。
* `name` (TEXT): 玩家为收藏区域命名的名字。
* `city_name` (TEXT, 可空): 关联的城市。
* `bounds` (TEXT): 序列化存储 Bounding Box 的 JSON 串。

#### 3. `game_history` (得分记录表)
* `id` (INTEGER, 主键): 成绩记录 ID。
* `user_id` (INTEGER, 外键): 关联 `users.id`。
* `map_name` (TEXT): 游玩的区域名称。
* `score` (INTEGER): 本局猜中的街区数量。
* `total_streets` (INTEGER): 区域内街道总数。
* `completion_rate` (REAL): 探索率（score / total_streets）。
* `max_streak` (INTEGER): 单局最大连击数。
* `played_at` (DATETIME): 游戏时间。

#### 4. `street_cache` (街道缓存表)
* `id` (INTEGER, 主键): 缓存记录 ID。
* `bounds_key` (TEXT, 唯一): 格式化的边界框键，例如四舍五入到小数点后 4 位的 `south_west_north_east`。
* `streets_json` (TEXT): 序列化存储的街道名称与几何数据 JSON 数组。
* `created_at` (DATETIME): 缓存创建时间。

---

## 5. 地图与渲染优化

为了提供极致的 60fps 体验，地图渲染层进行了多项性能优化：

1. **GPU 硬件加速 CSS 滤镜**：
   * 自定义的复古 CSS 滤镜（调整褐色、对比度和亮度）直接应用于 `.leaflet-tile-pane` 容器，而不是每个单独的 `.leaflet-tile` 图片上。
   * 这使得浏览器在 GPU 上进行单次合成通道处理，避免了平移和缩放时昂贵的 CPU 重绘。

2. **基于 Canvas 的矢量渲染**：
   * Leaflet 配置了 `preferCanvas: true`。
   * 街道几何图形被绘制在单个 HTML5 Canvas 元素上，而不是生成数千个繁重的 SVG DOM 节点，这极大地减少了内存开销和布局重算。

3. **平滑的瓦片平移与缩放微调**：
   * **`keepBuffer: 6`**：在内存中保留更多屏幕外的瓦片，确保平移时立即渲染。
   * **`updateWhenIdle: true`**：延迟新瓦片的下载，直到平移停止，避免主线程网络拥塞。
   * **`updateWhenZooming: false`**：在缩放动画期间禁用瓦片更新，确保缩放动画流畅无阻。

4. **防作弊设计**：
   * 背景瓦片切换为 CARTO Positron 的 `light_nolabels` 图层。这彻底移除了底图瓦片上的街道和地标文字标签，确保玩家只能根据街道形状和布局进行辨认，无法通过底图作弊。

---

## 6. 地图源与坐标系统

* **支持的地图源 (Map Providers)**:
  - **CartoDB 深色底图 (`cartodb-dark`)**：沉浸式的复古纸质暗黑风格底图，移除了街道地标文字标签，用于防作弊。使用标准 WGS-84。
  - **CartoDB 浅色底图 (`cartodb`)**：复古纸质浅色风格底图，移除了街道地标文字标签，用于防作弊。使用标准 WGS-84。
  - **OpenStreetMap (`osm`)**：带有标准文字标签的 OpenStreetMap 瓦片。使用标准 WGS-84。
  - **高德地图 (`amap`)**：中国大陆高德地图瓦片。对于国内用户，国内服务器节点能够提供极快的加载与响应速度。
* **投影系统与 GCJ-02 坐标纠偏**:
  - 高德地图底图采用 GCJ-02（火星坐标系），其坐标与标准的 WGS-84 存在非线性偏移。
  - 为了保证街道绘制和挑战范围的精确重合，系统在 `src/lib/coord.ts` 中集成了 WGS-84 与 GCJ-02 的非线性互转算法（`wgs84togcj02` / `gcj02towgs84`）。
  - 当高德地图作为当前地图源时，系统会自动在渲染街道多段线（Polylines）、限定矩形（Bounds）、高亮闪烁指示线，以及玩家在自定义模式中拉框选择区域时，对坐标进行 GCJ-02 纠偏翻译。如果用户在中途切换地图源，系统会动态换算当前地图中心及所有覆盖图层并重绘。
  - 对于标准的 CartoDB 和 OSM 地图源，坐标则直接以原始的 WGS-84 格式渲染，免去纠偏流程。

---

## 7. 挑战难度与智能线索提示系统

* **简单模式 (Easy)**：提供街道首字母及拼写占位线索（例如 `W___ S_____`），并在地图上以黄色虚线高亮闪烁提示街道位置，自动平移居中。
* **中等模式 (Medium)**：仅在侧边栏显示单词首字母与长度占位符，不提供地图高亮或视口移动。
* **困难模式 (Hard)**：凭空回忆拼写，不提供任何提示。
* **已用提示结算统计**：结算面板会根据游玩难度动态展示本局的提示使用次数（仅在简单/中等模式下显示）。

---

## 8. 多语言街道别名匹配系统

为了支持使用不同语言的玩家在游玩本地化路名的区域（例如在东京 Preset 中匹配日语汉字/假名街道）时能够流畅猜测，系统设计了多语言别名匹配机制：

1. **Preset 数据集内置别名数组**：每条街道结构中新增 `aliases` 数组，预先存储该街道的常见外语翻译或罗马字转写（如 `["新宿通り", "Shinjuku-dori", "Shinjuku Street", "新宿路"]`）：
   ```json
   {
     "name": "新宿通り",
     "geometry": [...],
     "aliases": ["新宿通り", "Shinjuku-dori", "Shinjuku Street", "新宿路"]
   }
   ```
2. **模糊规范化匹配**：玩家提交猜测时，匹配器对输入和所有候选别名执行清洗规范化（全部转为小写、去除音标符号/空格/标点，并剥离常见的街道类型后缀如 `street`、`road`、`通り`、`通`、`路`）。若清洗后的输入与任一清洗后的别名完全一致，即判定正确。
3. **语言自适应线索提示**：在简单和中等难度下，系统将根据玩家当前选择的界面语言 (`lang = 'en' | 'zh'`)，动态呈现对应语言的拼写线索。


