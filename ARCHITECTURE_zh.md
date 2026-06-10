# 系统架构

中文版 | [English](ARCHITECTURE.md)

**Citydle** = 一个纯静态 Web 应用 + 一条离线数据管线。没有服务端代码、没有数据库、没有 API 路由——旧版架构文档(SQLite、6 个 API、Leaflet、限流反作弊)描述的是已删除的旧玩法,已作废。

---

## 1. 总览

```
┌────────────────── 构建期 / 离线 ──────────────────────────┐
│  fetch-cities.mjs      Overpass/OSM → public/cities/*.json│
│  validate-cities.mjs   机器校验门(段连续性、边界)        │
│  compute-morphology.mjs 网格度 + 水系分类                 │
│  make-prototype.mjs    独立可玩 demo                      │
└───────────────────────────────────────────────────────────┘
                              │  提交进 git
                              ▼
┌────────────────────── 运行期(CDN)─────────────────────────┐
│  Next.js 全静态应用                                        │
│   /              → Game.tsx(客户端组件)                  │
│   /cities/*.json → 静态城市数据(按天懒加载)              │
│  localStorage    → 当日成绩(防重玩)、统计、streak        │
└───────────────────────────────────────────────────────────┘
```

| 决策 | 理由 |
|------|------|
| 全静态、零后端 | 每日选题在客户端确定性计算;MVP 没有需要服务端持久化的东西 |
| 城市数据放 `public/cities/` | CDN 缓存,每天只拉当日一城(约 200–400KB) |
| Canvas 渲染、不用地图库 | 游戏展示的是精选几何,不是可交互地图;Leaflet 已移除 |
| 只用 localStorage | streak/统计是个人数据;MVP 无账号 |

## 2. 数据管线(仓库根目录 `*.mjs`)

`fetch-cities.mjs` —— 从 Overpass(4 镜像竞速 + 退避重试)拉取每城路网、水系、海岸线。关键不变量:

- **每根线都是真实的路**:每条 OSM way 保存为独立段,同名街道绝不首尾拼接(拼接会画出现实不存在的直线)。
- **保留道路等级**:highway → tier 1(干道)/ 2(次干)/ 3(毛细),线索按层渲染。
- **几何有界**:按 bbox 外扩 10% 裁切,出入框处取真实线段与边界的交点。
- **index.json 每次从磁盘全量重建**——补拉单城不会丢其它城市索引。

`validate-cities.mjs` —— 每次拉取后必跑的校验门:段连续性(间距阈值抓假连线)、边界、tier 合法性、计数、索引完整性。有错 exit 1。

`compute-morphology.mjs` —— 每城街道方向熵(Boeing 方法)→ `grid` 网格度 0–1,加水系分类(coast/river/inland)→ `public/cities/morphology.json`,驱动干扰项相似度。

已知局限:只拉 OSM way,multipolygon relation 形式的水体缺失(如悉尼港),待管线支持 relation。

## 3. 游戏运行时(`src/`)

```
src/lib/citydle/
├── types.ts      城市数据 / 索引 / 形态类型
├── daily.ts      UTC 期数;种子 PRNG(mulberry32);
│                 答案 = 按轮洗牌(30 天内不重题);
│                 候选 = 3 个形态最近 + 2 个种子随机
├── clues.ts      6 层真实线索;干道 <30km 时从低层级补足(只选取,不编造)
├── render.ts     Canvas 渲染;按精选 bbox 取景;羊皮纸+暖金
├── storage.ts    localStorage:当日成绩、统计、streak、语言
├── i18n.ts       约 20 条界面文案,中英
└── countries.ts  城市 → 国家(线索 6),事实性元数据

src/components/citydle/
├── Game.tsx         单屏游戏:拉索引+形态+城市数据,
│                    6 选 1 淘汰、方块分享、彩带、倒计时
└── Game.module.css  沧桑制图师美学
```

**确定性**:所有随机都以期数为种子——全球玩家同一天看到同一答案、同一组候选、同一顺序。纪元:`daily.ts` 的 `EPOCH_UTC`。

**规则**:6 层线索(骨架 → +水系 → +次干 → +全路网 → +街名 → +国家首字母)。选错会淘汰该候选**并**消耗一条线索;第 L 层猜中 = L/6;错 5 次或线索耗尽 = 失败(X/6)。

**防重玩**:当日成绩存 localStorage,刷新直接显示结算页。(服务端判题/真反作弊明确不在 MVP 范围——答案客户端可推导,和早期 Wordle 一样。)

## 4. 测试与 CI

- `vitest`:`src/lib/citydle/__tests__/` —— 期数计算、确定性、不重复轮、候选生成、骨架规则(18 个)。
- `npm run lint` + `npm run build` 必须通过;构建产物全静态(所有路由 ○)。
- 视觉抽查:`node inspect-cities.mjs` 渲染全城市总览;`node make-prototype.mjs` 生成独立 demo。

## 5. 部署

静态产物随处可部(Vercel 零配置)。无环境变量、无数据库、无冷启动状态丢失,唯一的运行组件是 CDN。
