# Citydle · 每日街图 — 读地图，认城市

[English](README.md) | 中文版

> 每日一题已可在 `/` 完整游玩。旧版「金融街图志」玩法已删除（见 git 历史）。

---

**Citydle**（每日街图）是一个每日地图推理小游戏。每天出一道题：给你一座真实城市的路网骨架——以羊皮纸风格的制图轮廓呈现——用 **6 条线索**，从 6 个候选城市里认出它是哪儿。用的线索越少，得分越高。

像 Wordle，但猜的是城市——而且你用来猜的，是这座城市的路网线条本身。

---

## 玩法

每道题把同一座城市的路网分 6 层递进揭示：

| 线索 | 显示内容 |
|------|---------|
| 第 1 条 | 干道骨架剪影（干道稀疏时按长度从真实低层级街道补足） |
| 第 2 条 | + 水系与海岸线 |
| 第 3 条 | + 次干路网 |
| 第 4 条 | + 完整路网纹理（信息量最大、形状个性最强） |
| 第 5 条 | + 一条街道名 |
| 第 6 条 | + 国家 / 首字母（兜底，不直接给答案） |

地标线索待管线拉到真实 OSM POI 后加入——绝不编造。

**6 选 1 淘汰制**——6 个候选里有 3 个与答案形态相近（这是难度旋钮）。选错会淘汰该候选**并**消耗一条线索。全球玩家每个 UTC 日同一道题。

每日同题，制造「今天你猜了吗」的同步感。Wordle 风格方块分享 + 连续天数 streak。

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



---

## 当前状态 vs 计划

| 功能 | 状态 |
|------|------|
| 每日一题——全球同题、确定性、30 天内不重复 | ✅ 已完成 |
| 30 城城市库（真实 OSM 数据 + 机器校验） | ✅ 已完成 |
| 6 选 1 淘汰模式 + 形态分组干扰项 | ✅ 已完成 |
| Wordle 式方块分享 + streak（localStorage） | ✅ 已完成 |
| 代码完整重构——旧玩法已删除，应用全静态 | ✅ 已完成 |
| 难度曲线调优（上线后按数据） | 📋 计划中 |
| 地标线索（待管线支持 OSM POI 与 relation 水体） | 📋 计划中 |
| 数据分析（PostHog）/ 服务端判题 / 反作弊 | 📋 计划中 |

---

## 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | Next.js 14 (App Router) |
| **语言** | TypeScript |
| **样式** | Tailwind CSS + CSS 变量 |
| **渲染** | 原生 `<canvas>`（不用地图库） |
| **路网 / 地理数据** | Overpass API（OSM）——4 镜像并发竞速 |
| **持久化** | 仅 localStorage（streak、统计、防重玩） |
| **字体** | Cinzel（标题）、IM Fell English（正文） |

---

## 快速开始

### 环境要求

- Node.js 22.x 或更高版本
- npm 10.x 或更高版本

### 安装

```bash
# 克隆仓库
git clone https://github.com/frank99-owl/citydle.git
cd citydle

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

### 数据管线

```bash
node fetch-cities.mjs            # 从 Overpass 重拉 30 城数据
node validate-cities.mjs         # 机器校验门——每次拉取后必须通过
node compute-morphology.mjs      # 网格度 + 水系分类 → morphology.json
node make-prototype.mjs          # 独立可玩 demo → prototype/index.html
node inspect-cities.mjs          # 全城市视觉抽查 → prototype/inspect.html
```

### 生产构建

```bash
npm run build
npm start
```

### 环境变量

本地开发无需任何环境变量。应用使用：

- 公共 Overpass API 镜像

---

## 部署

### Vercel（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/frank99-owl/citydle)

应用完全静态——无环境变量、无数据库、无服务端函数，任何静态托管均可部署。

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
- [Wordle](https://www.nytimes.com/games/wordle/index.html) 提供每日谜题格式的灵感
