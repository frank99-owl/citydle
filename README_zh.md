# Citydle · 每日街图 — 读地图，认城市

[English](README.md) | 中文版

> 🚧 **重构中** — Citydle 正在从旧版「金融街图志（Financial Street Cartographer）」改建而来。新玩法的可玩原型在 `prototype/` 目录。

---

**Citydle**（每日街图）是一个每日地图推理小游戏。每天出一道题：给你一座真实城市的路网骨架——以羊皮纸风格的制图轮廓呈现——用 **6 条线索**，从 6 个候选城市里认出它是哪儿。用的线索越少，得分越高。

像 Wordle，但猜的是城市——而且你用来猜的，是这座城市的路网线条本身。

---

## 玩法

每道题把同一座城市的路网分 6 层递进揭示：

| 线索 | 显示内容 |
|------|---------|
| 第 1 条 | 主干道剪影 |
| 第 2 条 | + 主路网 / 海岸线 / 河流 |
| 第 3 条 | + 完整路网纹理（信息量最大、形状个性最强） |
| 第 4 条 | + 地标位置 |
| 第 5 条 | + 一条街道名 |
| 第 6 条 | + 国家 / 首字母（兜底，不直接给答案） |

**6 选 1**——从 6 个候选城市里选。难度来自「你用了几条线索」，而不是「前几条几乎是空白」。

每日同题，制造「今天你猜了吗」的同步感。分享 Wordle 风格方块（计划中）+ 连续天数 streak（计划中）。

---

## 美学世界观

**沧桑制图师**：羊皮纸质感、暖金线条地图。你在阅读一张张老地图残片，认出它画的是哪座城市。

这是与 GeoGuessr（用街景照片）的核心差异点。Citydle 用**地图线条本身**作为谜题——「读图认城」是独占定位。

---

## 数据原则

地图上每一根线，都是那座城市地面上**真实存在**的路或地理特征。没有任何虚构坐标。

- **路网** → Overpass API（OpenStreetMap）
- **海岸线 / 河流 / 水体** → OSM `natural=coastline`、`natural=water`、`waterway`
- **地标** → OSM POI（`tourism`、`amenity` 等）；数据拉不到就不放，**绝不编造**
- **每座城市数据带来源标记**（`source: overpass` + 拉取日期），可追溯
- **零手工捏造坐标**

---

## 城市库

| 状态 | 说明 |
|------|------|
| 当前原型 | 5 座城市（纽约、伦敦、东京、香港、新加坡） |
| MVP 目标 | ~30 座高辨识度世界城市——够每日出题 1–2 个月不重复 |
| 选城标准 | 有海岸线、有河流、路网形态独特（网格状、放射状、不规则老城）；排除「哪座城市都长一样」的纯住宅郊区 |
| 生成方式 | 批量 Overpass pipeline，人工挑城市 + 划定代表性区域，机器拉数据 |

城市库 5 → ~30 的扩充**进行中**。

---

## 当前状态 vs 计划

| 功能 | 状态 |
|------|------|
| 可玩单局原型（视觉验证） | ✅ 已完成——见 `prototype/` |
| 城市库扩充 5 → ~30 | 🔄 进行中 |
| 6 选 1 选择题模式 | 📋 计划中 |
| Wordle 式方块分享卡 | 📋 计划中 |
| 每日连续天数追踪 | 📋 计划中 |
| 难度曲线调优 | 📋 计划中 |
| 代码完整重构（替换旧玩法核心） | 📋 计划中 |
| 真持久化 / 反作弊 / 数据分析接入 | 📋 计划中 |

> `src/` 里的源码目前仍是旧版「金融街图志」玩法（拼写街道名）。新 Citydle 玩法的重构尚未开始。`prototype/` 目录是新版概念的可玩原型。

---

## 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | Next.js 14 (App Router) |
| **语言** | TypeScript |
| **样式** | Tailwind CSS + CSS 变量 |
| **地图** | Leaflet.js |
| **瓦片** | CARTO Positron（无标签） |
| **地理编码** | OpenStreetMap Nominatim |
| **路网 / 地理数据** | Overpass API（OSM）——4 镜像并发竞速 |
| **数据库** | SQLite（Node.js 原生 `node:sqlite`） |
| **字体** | Cinzel（标题）、IM Fell English（正文） |

---

## 快速开始

### 环境要求

- Node.js 22.x 或更高版本
- npm 10.x 或更高版本

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/citydle.git
cd citydle

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

> 注意：当前运行的是旧版「金融街图志」玩法。新版 Citydle 概念原型在 `prototype/` 目录。

### 生产构建

```bash
npm run build
npm start
```

### 环境变量

本地开发无需任何环境变量。应用使用：
- 本地 SQLite 数据库（自动创建在 `data/` 目录）
- 公共 Overpass API 镜像
- 公共 Nominatim API

---

## 部署

### Vercel（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/citydle)

**注意**：Vercel 无服务器环境下 SQLite 会复制到 `/tmp`，冷启动时数据重置。如需持久化，可考虑 Vercel Postgres、Turso 或 PlanetScale。

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

## 测试

```bash
# 运行单元测试（Vitest）
npm test

# 监听模式
npm run test:watch

# 构建验证（含 lint + 类型检查）
npm run build
```

---

## 许可证

MIT

---

## 致谢

- [OpenStreetMap](https://www.openstreetmap.org/) 贡献者提供所有地理数据
- [Overpass API](https://overpass-api.de/) 提供路网与地理特征查询
- [CARTO](https://carto.com/) 提供无标签瓦片样式
- [Leaflet.js](https://leafletjs.com/) 提供交互式地图引擎
- [Wordle](https://www.nytimes.com/games/wordle/index.html) 提供每日谜题格式的灵感
