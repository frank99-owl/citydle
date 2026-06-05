# 金融街图志 (Financial Street Cartographer)

[English](README.md) | 中文版

> 一款复古风格的街道猜谜游戏，测试你对世界金融中心的地理知识。

**金融街图志**是一款全栈网页应用，玩家在复古纸质风格的交互地图上拼写街道名称。可选择 5 个预设金融中心，或在世界任意区域绘制自定义挑战。

---

## ✨ 功能特色

### 🎮 核心玩法
- **5 大金融中心**：纽约（华尔街）、伦敦（金融城）、东京（丸之内）、香港（中环）、新加坡（市中心）
- **自定义区域模式**：在地图上绘制任意区域创建挑战
- **地址搜索**：搜索任意城市或地址快速定位
- **多语言街道匹配**：支持英文、中文、日文输入（含模糊匹配）

### 🗺️ 地图体验
- **复古纸质美学**：深色羊皮纸主题 + 复古色调地图
- **60fps 流畅体验**：GPU 加速 CSS 滤镜，Canvas 矢量渲染
- **防作弊设计**：无标签地图瓦片，无法直接读取街道名
- **4 种地图源**：CartoDB 深色、CartoDB 浅色、OpenStreetMap、高德地图（中国优化）
- **GCJ-02 坐标纠偏**：中国地图自动坐标转换

### 🏆 成就系统（11 个成就）
| 系列 | 成就 | 说明 |
|------|------|------|
| **进度** | 探索者、领航员、制图大师 | 完成 10%、50%、80% |
| **城市大师** | 5 个城市专属成就 | 单城市 100% 通关 |
| **技能** | 连击大师、闪电手、精准射手 | 20+ 连击、30 秒 5 条、零错误 |
| **探索** | 探路者、城市猎人 | 10 次自定义区域、20 个城市搜索 |

### 📊 统计与挑战
- **个人统计面板**：游戏次数、猜对街道数、最爱城市、游戏时长
- **每日挑战**：基于日期种子的固定区域，连续挑战天数追踪
- **游戏历史**：完整记录所有游戏的得分和完成率
- **收藏夹**：保存并重玩喜欢的地图区域

### 💡 难度模式
| 模式 | 提示 | 地图高亮 | 说明 |
|------|------|----------|------|
| **简单** | 首字母 + 模式 | ✅ 琥珀色脉冲 | 适合学习 |
| **中等** | 首字母 + 模式 | ❌ | 中等挑战 |
| **困难** | 无 | ❌ | 纯记忆 |

### 📤 社交功能
- **分享卡片**：Canvas 生成复古风格成就卡片
- **分享方式**：保存图片、复制链接、Twitter、微信
- **排行榜**：SQLite 支持的全局排名，按城市/时间筛选
- **玩家档案**：持久化的昵称和统计数据

### 🌐 国际化
- **完整双语界面**：中文、英文
- **本地化街道名**：预设数据包含原生名称 + 翻译
- **智能提示**：模式生成适配 CJK 和拉丁字符

---

## 🏗️ 项目架构

```
src/
├── app/
│   ├── page.tsx                    # 根 SPA 壳（~175 行）
│   ├── layout.tsx                  # 全局布局与字体
│   ├── globals.css                 # 主题变量与动画
│   └── api/                        # 无服务器 API 路由
│       ├── streets/route.ts        # 街道数据（预设 + Overpass）
│       ├── search/route.ts         # Nominatim 地址代理
│       ├── favorites/route.ts      # 收藏地图 CRUD
│       ├── history/route.ts        # 游戏历史与得分
│       ├── leaderboard/route.ts    # 全局排行榜
│       └── daily/route.ts          # 每日挑战生成
├── context/
│   └── GameContext.tsx              # 游戏状态提供者（所有 hooks + 逻辑）
├── types/
│   └── index.ts                    # 集中 TypeScript 类型
├── hooks/
│   ├── useLeafletMap.ts            # 地图生命周期与图层管理
│   ├── useMapProvider.ts           # 地图源切换与坐标转换
│   ├── useStreets.ts               # 街道数据获取与缓存
│   ├── useGameLogic.ts             # 核心游戏机制
│   ├── useAchievements.ts          # 成就追踪与弹窗
│   ├── useStats.ts                 # 个人统计
│   ├── useTutorial.ts              # 新手引导流程
│   ├── useShare.ts                 # 分享卡片生成
│   └── useLocalStorage.ts          # 持久化存储（跨标签页同步）
├── components/
│   ├── lobby/                      # 大厅视图组件
│   │   ├── LobbyOverlay.tsx        # 大厅主容器
│   │   ├── LobbyView.tsx           # 教程按钮与错误横幅
│   │   ├── PresetCards.tsx         # 城市选择网格
│   │   ├── MapSettings.tsx         # 地图源与难度设置
│   │   ├── HistoryTable.tsx        # 游戏历史显示
│   │   ├── FavoritesList.tsx       # 收藏地图列表
│   │   ├── DailyChallengeCard.tsx  # 每日挑战卡片
│   │   └── AchievementPanel.tsx    # 成就展示
│   ├── game/                       # 游戏中组件
│   │   ├── GameSidebar.tsx         # 游戏侧边栏容器
│   │   ├── GameStats.tsx           # 得分与进度显示
│   │   ├── GuessInput.tsx          # 街道名称输入
│   │   ├── HintConsole.tsx         # 提示按钮与线索
│   │   ├── StreakDisplay.tsx       # 连击计数器
│   │   ├── StreetList.tsx          # 街道列表（带筛选）
│   │   └── GameActions.tsx         # 收藏/放弃/返回按钮
│   ├── settlement/
│   │   └── SettlementView.tsx      # 游戏结算与分享
│   ├── achievement/
│   │   ├── AchievementPopup.tsx    # 成就解锁通知
│   │   └── AchievementPanel.tsx    # 成就展示
│   ├── share/
│   │   ├── ShareCard.tsx           # Canvas 分享卡片生成器
│   │   └── ShareModal.tsx          # 分享选项弹窗
│   ├── leaderboard/
│   │   └── Leaderboard.tsx         # 全局排行榜表格
│   ├── stats/
│   │   └── StatsPanel.tsx          # 个人统计面板
│   ├── tutorial/
│   │   └── TutorialOverlay.tsx     # 新手引导教程
│   └── shared/
│       ├── LanguageToggle.tsx      # 语言切换
│       └── LoadingSpinner.tsx      # 加载指示器
├── lib/
│   ├── constants.ts                # 预设、成就、类型
│   ├── i18n.ts                     # 翻译文本（中/英）
│   ├── coord.ts                    # WGS-84/GCJ-02 坐标转换
│   ├── db.ts                       # SQLite 单例
│   ├── daily.ts                    # 每日挑战生成
│   ├── matching.ts                 # 核心算法（Levenshtein、匹配、提示）
│   ├── rate-limit.ts               # 滑动窗口限流器
│   └── hmac.ts                     # HMAC-SHA256 排行榜签名
└── data/
    └── presets/                     # 预编译街道数据
        ├── new-york.json            # 141 条街道
        ├── london.json              # 360 条街道
        ├── tokyo.json               # 55 条街道
        ├── hong-kong.json           # 155 条街道
        └── singapore.json           # 174 条街道
```

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | Next.js 14 (App Router) |
| **语言** | TypeScript |
| **样式** | Tailwind CSS + CSS 变量 |
| **地图** | Leaflet.js + Geoman |
| **瓦片** | CARTO Positron（无标签） |
| **地理编码** | OpenStreetMap Nominatim |
| **街道数据** | Overpass API（4 镜像并发竞速） |
| **数据库** | SQLite（Node.js 原生 `node:sqlite`） |
| **动画** | canvas-confetti |
| **字体** | Cinzel（标题）、IM Fell English（正文） |

---

## 🚀 快速开始

### 环境要求
- Node.js 22.x 或更高版本
- npm 10.x 或更高版本

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/financial-street-cartographer.git
cd financial-street-cartographer

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

### 生产构建

```bash
npm run build
npm start
```

### 环境变量

本地开发无需环境变量。应用使用：
- 本地 SQLite 数据库（自动创建在 `data/`）
- 公共 Overpass API 镜像
- 公共 Nominatim API

---

## 📦 部署

### Vercel（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/financial-street-cartographer)

**注意**：Vercel 无服务器环境下 SQLite 数据库会复制到 `/tmp`。冷启动时数据会重置。如需持久化存储，建议：
- Vercel Postgres
- Turso（SQLite 兼容）
- PlanetScale

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 自托管

```bash
npm run build
PORT=3000 npm start
```

---

## 🔌 API 参考

### `POST /api/streets`

获取边界框内的街道数据。

**请求体：**
```json
{
  "bounds": {
    "south": 40.6981,
    "west": -74.0201,
    "north": 40.7209,
    "east": -73.9977
  }
}
```

**响应：**
```json
{
  "streets": [
    {
      "name": "Wall Street",
      "geometry": [[40.7074, -74.0113], ...],
      "aliases": ["Wall Street", "华尔街"]
    }
  ],
  "count": 141,
  "source": "local_preset"
}
```

### `GET /api/search?q={查询}`

通过 Nominatim 搜索位置。

### `GET /api/leaderboard?city={城市}&period={daily|weekly|all}`

获取前 50 名成绩。

### `POST /api/leaderboard`

提交成绩（服务端验证所有字段）。

### `GET /api/daily`

获取今日挑战参数。

---

## 🧪 测试

```bash
# 运行单元测试（Vitest）
npm test

# 监听模式运行测试
npm run test:watch

# 构建验证（含 lint + 类型检查）
npm run build
```

---

## 📄 许可证

MIT

---

## 🙏 致谢

- [OpenStreetMap](https://www.openstreetmap.org/) 提供地图数据
- [CARTO](https://carto.com/) 提供瓦片样式
- [Leaflet.js](https://leafletjs.com/) 交互式地图
- [Overpass API](https://overpass-api.de/) 街道数据
- [canvas-confetti](https://github.com/catdad/canvas-confetti) 庆祝动画
