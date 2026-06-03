# 金融街图志 (Financial Street Cartographer)

[English Version](README.md)

《金融街图志》是一款复古羊皮纸地图风格的全栈式街道名称竞猜网页游戏。玩家可以通过寻找并拼写出世界各大金融中心（纽约、伦敦、东京、香港、新加坡）或任意自定义画框区域内的所有街道名称，来测试和挑战自己的地理知识和记忆。

## 🌟 核心特色与玩法

1.  **复古纸质地图美学**：
    *   全站采用精致的古风牛皮纸背景与排版设计。
    *   集成 Leaflet.js 并配合 CARTO Positron 瓦片和浏览器端 CSS 滤镜，让整张地图呈现出如同手绘航海图般的复古牛皮纸效果。
    *   **60fps 流畅拖拽与缩放**：将 CSS 滤镜从单个瓦片图片 `.leaflet-tile` 移至瓦片容器 `.leaflet-tile-pane`（利用 GPU 硬件加速合成），彻底消除了拖拽和缩放时的渲染卡顿。
2.  **防止作弊与游戏完整性**：
    *   采用 CARTO Positron `light_nolabels` 无标签瓦片图层。背景地图上没有任何街道文字，玩家必须完全依靠地理记忆与空间感知来进行竞猜。
3.  **预设关卡秒级启动 (零延迟)**：
    *   五大金融中心的街道几何数据已编译为本地静态 JSON 文件 (`data/presets/*.json`)。选择预设关卡直接从本地读取，响应时间 **< 10ms**，彻底规避了 Overpass API 网络延迟与服务宕机的风险。
4.  **自由拉框模式与地址搜索**：
    *   **城市寻址搜索框**：自定义拉框模式下，玩家可以通过搜索框输入城市名（如“北京”、“巴黎”），服务器端将请求安全代理至 OpenStreetMap Nominatim 接口，并自动平移定位至目标城市，无需手动在世界地图上漫游拖拽。
    *   **SQLite 经纬度缓存**：玩家拉框过的自定义区域会被缓存至 SQLite 数据库 (`street_cache`)。重新加载或挑战已玩过的区域可实现毫秒级瞬间加载。
    *   **并发测速镜像竞速**：首次查询新区域时，后端会并发请求 4 个公共 Overpass 镜像，以最快返回的响应为准，并中止其他慢请求，确保最速加载。
5.  **连击与全屏彩纸动画**：
    *   当玩家连续猜对街道时，点亮连击（Streak）计数器，并触发逐渐加强的 `canvas-confetti` 全屏五彩纸屑喷洒特效。
6.  **成就勋章系统**：
    *   包含三套精美的中世纪盾牌勋章：
        *   🥉 **探索者 (Explorer)** — 猜中 10% 以上街道。
        *   🥈 **领航员 (Navigator)** — 猜中 50% 以上街道。
        *   🥇 **制图大师 (Cartographer Master)** — 猜中 80% 以上街道。
7.  **本地持久化记录 (SQLite)**：
    *   基于 SQLite（Node.js 原生内置 `node:sqlite` 引擎）保存游戏历史数据。
    *   **延迟数据库连接 (Lazy Init)**：数据库连接在使用时才被动态建立，完全解决了 Next.js 静态编译/打包构建时的 SQLite 文件锁冲突报错。

---

## 🏗️ 项目结构

前端采用模块化架构，职责分离清晰：

```
src/
├── app/page.tsx              # 根组件编排器
├── types/                    # TypeScript 类型定义
├── hooks/                    # 自定义 React Hooks
│   ├── useLeafletMap.ts      # 地图生命周期与图层
│   ├── useMapProvider.ts     # 地图供应商与坐标转换
│   ├── useStreets.ts         # 街道数据获取
│   ├── useGameLogic.ts       # 游戏状态与操作
│   └── useLocalStorage.ts    # 持久化存储
├── components/
│   ├── lobby/                # 大厅 UI 组件
│   ├── game/                 # 游戏中组件
│   ├── settlement/           # 结算视图
│   └── shared/               # 可复用 UI 元素
└── lib/                      # 工具函数与常量
```

详细模块文档请参阅 [ARCHITECTURE_zh.md](ARCHITECTURE_zh.md)。

---

## 🛠 技术架构与选型

*   **框架**：Next.js 14 (App Router) + TypeScript (动态延迟 SQLite 连接管理)
*   **样式**：Vanilla CSS / Tailwind CSS (暗黄羊皮纸主题系统)
*   **地图**：Leaflet.js + CARTO Positron 无标签瓦片 (Canvas 矢量渲染器)
*   **地理数据源**：OpenStreetMap Overpass API (并发测速竞速及 Regex 优化) + OSM Nominatim API 代理
*   **数据库**：SQLite (利用 Node.js 22.5+ 原生内置的 `node:sqlite`，无任何 native C++ 模块编译依赖，完美契合高版本 node 环境)
*   **特效动画**：`canvas-confetti`

---

## 🚀 启动与开发

1.  **安装依赖**：
    ```bash
    npm install
    ```
2.  **启动开发服务器**：
    ```bash
    npm run dev
    ```
3.  **构建生产版本**：
    ```bash
    npm run build
    ```
