// fetch-cities.mjs — 批量从 OSM / Overpass 拉取世界城市「地图骨架」,生成 Citydle 城市库。
// 数据干净:全部真实 OSM(路网 + 水系 + 海岸线),带 source + license + 拉取时间,
// 坐标精度截断到 5 位,零手工捏造。输出到 public/cities/(游戏端静态直出)。
//
// 数据格式要点:
// - 同名街道的多个 way 保存为独立 segments(绝不首尾拼接 → 不产生现实中不存在的连线)
// - 保留道路等级 tier:1=干道(motorway/trunk/primary) 2=次干(secondary/tertiary) 3=毛细(其余)
// - 几何裁切到 bbox 外扩 10%(线条延伸出画框,渲染时按声明 bbox 取景)
// - index.json 每次从磁盘上的全部城市文件重建,补拉单城不会丢其它城市的索引
//
// 用法: node fetch-cities.mjs              # 拉全部
//        node fetch-cities.mjs paris rome   # 只拉指定 id(补拉失败的)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "public", "cities");
fs.mkdirSync(OUT, { recursive: true });

// 中心点取各城最有辨识度的核心区,半径 km 控制 bbox。坐标为真实地标位置。
// country 为事实性元数据,随城市 JSON 与 index.json 一起输出(线索 6 与结算页用)。
const C_ = (cn, en) => ({ cn, en });
const CITIES = [
  // —— 初版 30 城 ——
  { id: "new-york", cn: "纽约", en: "New York", c: [40.7074, -74.009], r: 1.6, feat: "下城网格+海岸", country: C_("美国", "USA") },
  { id: "london", cn: "伦敦", en: "London", c: [51.513, -0.09], r: 1.5, feat: "金融城+泰晤士河", country: C_("英国", "UK") },
  { id: "hong-kong", cn: "香港", en: "Hong Kong", c: [22.281, 114.158], r: 1.4, feat: "中环+维港", country: C_("中国", "China") },
  { id: "singapore", cn: "新加坡", en: "Singapore", c: [1.283, 103.851], r: 1.5, feat: "滨海湾", country: C_("新加坡", "Singapore") },
  { id: "tokyo", cn: "东京", en: "Tokyo", c: [35.681, 139.767], r: 1.5, feat: "丸之内+皇居", country: C_("日本", "Japan") },
  { id: "paris", cn: "巴黎", en: "Paris", c: [48.855, 2.345], r: 1.6, feat: "塞纳河+西岱岛+放射", country: C_("法国", "France") },
  { id: "venice", cn: "威尼斯", en: "Venice", c: [45.438, 12.336], r: 1.3, feat: "运河迷宫", country: C_("意大利", "Italy") },
  { id: "barcelona", cn: "巴塞罗那", en: "Barcelona", c: [41.392, 2.165], r: 1.6, feat: "Eixample 网格", country: C_("西班牙", "Spain") },
  { id: "washington-dc", cn: "华盛顿", en: "Washington DC", c: [38.895, -77.036], r: 1.8, feat: "放射+网格", country: C_("美国", "USA") },
  { id: "san-francisco", cn: "旧金山", en: "San Francisco", c: [37.793, -122.402], r: 1.5, feat: "海湾+网格", country: C_("美国", "USA") },
  { id: "chicago", cn: "芝加哥", en: "Chicago", c: [41.882, -87.629], r: 1.6, feat: "Loop 网格+湖滨", country: C_("美国", "USA") },
  { id: "amsterdam", cn: "阿姆斯特丹", en: "Amsterdam", c: [52.369, 4.895], r: 1.4, feat: "同心运河", country: C_("荷兰", "Netherlands") },
  { id: "istanbul", cn: "伊斯坦布尔", en: "Istanbul", c: [41.018, 28.974], r: 1.8, feat: "金角湾+海峡", country: C_("土耳其", "Türkiye") },
  { id: "rome", cn: "罗马", en: "Rome", c: [41.892, 12.482], r: 1.6, feat: "古城+台伯河", country: C_("意大利", "Italy") },
  { id: "sydney", cn: "悉尼", en: "Sydney", c: [-33.86, 151.208], r: 1.6, feat: "海港+环形码头", country: C_("澳大利亚", "Australia") },
  { id: "moscow", cn: "莫斯科", en: "Moscow", c: [55.752, 37.617], r: 1.8, feat: "放射环线+红场", country: C_("俄罗斯", "Russia") },
  { id: "beijing", cn: "北京", en: "Beijing", c: [39.908, 116.397], r: 1.8, feat: "棋盘+故宫", country: C_("中国", "China") },
  { id: "shanghai", cn: "上海", en: "Shanghai", c: [31.236, 121.49], r: 1.6, feat: "外滩+黄浦江", country: C_("中国", "China") },
  { id: "bangkok", cn: "曼谷", en: "Bangkok", c: [13.752, 100.493], r: 1.8, feat: "湄南河弯", country: C_("泰国", "Thailand") },
  { id: "toronto", cn: "多伦多", en: "Toronto", c: [43.648, -79.381], r: 1.6, feat: "网格+安大略湖", country: C_("加拿大", "Canada") },
  { id: "boston", cn: "波士顿", en: "Boston", c: [42.358, -71.058], r: 1.5, feat: "不规则老城+查尔斯河", country: C_("美国", "USA") },
  { id: "vienna", cn: "维也纳", en: "Vienna", c: [48.208, 16.373], r: 1.5, feat: "环城大道", country: C_("奥地利", "Austria") },
  { id: "berlin", cn: "柏林", en: "Berlin", c: [52.516, 13.39], r: 1.7, feat: "施普雷河", country: C_("德国", "Germany") },
  { id: "buenos-aires", cn: "布宜诺斯艾利斯", en: "Buenos Aires", c: [-34.603, -58.381], r: 1.6, feat: "网格", country: C_("阿根廷", "Argentina") },
  { id: "vancouver", cn: "温哥华", en: "Vancouver", c: [49.283, -123.118], r: 1.6, feat: "半岛+网格", country: C_("加拿大", "Canada") },
  { id: "lisbon", cn: "里斯本", en: "Lisbon", c: [38.711, -9.139], r: 1.5, feat: "丘陵+塔霍河", country: C_("葡萄牙", "Portugal") },
  { id: "kyoto", cn: "京都", en: "Kyoto", c: [35.011, 135.768], r: 1.6, feat: "古都棋盘", country: C_("日本", "Japan") },
  { id: "rio-de-janeiro", cn: "里约热内卢", en: "Rio de Janeiro", c: [-22.906, -43.176], r: 1.6, feat: "海岸+山", country: C_("巴西", "Brazil") },
  { id: "mumbai", cn: "孟买", en: "Mumbai", c: [18.927, 72.832], r: 1.5, feat: "半岛海岸", country: C_("印度", "India") },
  { id: "cape-town", cn: "开普敦", en: "Cape Town", c: [-33.92, 18.423], r: 1.5, feat: "海岸+桌山", country: C_("南非", "South Africa") },
  // —— 扩充批次:亚洲 ——
  { id: "osaka", cn: "大阪", en: "Osaka", c: [34.676, 135.501], r: 1.6, feat: "御堂筋+道顿堀", country: C_("日本", "Japan") },
  { id: "seoul", cn: "首尔", en: "Seoul", c: [37.57, 126.982], r: 1.6, feat: "清溪川+景福宫", country: C_("韩国", "South Korea") },
  { id: "shenzhen", cn: "深圳", en: "Shenzhen", c: [22.543, 114.057], r: 1.7, feat: "福田中轴网格", country: C_("中国", "China") },
  { id: "guangzhou", cn: "广州", en: "Guangzhou", c: [23.117, 113.264], r: 1.6, feat: "珠江+老城", country: C_("中国", "China") },
  { id: "chengdu", cn: "成都", en: "Chengdu", c: [30.66, 104.063], r: 1.7, feat: "环形路网+府南河", country: C_("中国", "China") },
  { id: "xian", cn: "西安", en: "Xi'an", c: [34.262, 108.943], r: 1.7, feat: "明城墙棋盘", country: C_("中国", "China") },
  { id: "hangzhou", cn: "杭州", en: "Hangzhou", c: [30.252, 120.165], r: 1.6, feat: "西湖东岸", country: C_("中国", "China") },
  { id: "chongqing", cn: "重庆", en: "Chongqing", c: [29.557, 106.577], r: 1.5, feat: "渝中两江半岛", country: C_("中国", "China") },
  { id: "tianjin", cn: "天津", en: "Tianjin", c: [39.124, 117.196], r: 1.6, feat: "海河九曲", country: C_("中国", "China") },
  { id: "macau", cn: "澳门", en: "Macau", c: [22.193, 113.54], r: 1.2, feat: "半岛老城", country: C_("中国", "China") },
  { id: "hanoi", cn: "河内", en: "Hanoi", c: [21.029, 105.852], r: 1.5, feat: "三十六行街+还剑湖", country: C_("越南", "Vietnam") },
  { id: "ho-chi-minh", cn: "胡志明市", en: "Ho Chi Minh City", c: [10.776, 106.7], r: 1.6, feat: "西贡河+法式网格", country: C_("越南", "Vietnam") },
  { id: "kuala-lumpur", cn: "吉隆坡", en: "Kuala Lumpur", c: [3.148, 101.695], r: 1.6, feat: "双河交汇", country: C_("马来西亚", "Malaysia") },
  { id: "jakarta", cn: "雅加达", en: "Jakarta", c: [-6.175, 106.827], r: 1.7, feat: "独立广场+运河", country: C_("印度尼西亚", "Indonesia") },
  { id: "delhi", cn: "德里", en: "Delhi", c: [28.633, 77.22], r: 1.8, feat: "康诺特广场放射", country: C_("印度", "India") },
  { id: "dubai", cn: "迪拜", en: "Dubai", c: [25.265, 55.297], r: 1.7, feat: "迪拜湾", country: C_("阿联酋", "UAE") },
  { id: "tel-aviv", cn: "特拉维夫", en: "Tel Aviv", c: [32.072, 34.776], r: 1.5, feat: "地中海岸+白城", country: C_("以色列", "Israel") },
  // —— 扩充批次:欧洲 ——
  { id: "madrid", cn: "马德里", en: "Madrid", c: [40.417, -3.703], r: 1.6, feat: "太阳门放射", country: C_("西班牙", "Spain") },
  { id: "milan", cn: "米兰", en: "Milan", c: [45.464, 9.19], r: 1.5, feat: "同心环", country: C_("意大利", "Italy") },
  { id: "florence", cn: "佛罗伦萨", en: "Florence", c: [43.771, 11.255], r: 1.3, feat: "阿诺河文艺复兴老城", country: C_("意大利", "Italy") },
  { id: "naples", cn: "那不勒斯", en: "Naples", c: [40.847, 14.253], r: 1.5, feat: "海湾+西班牙区网格", country: C_("意大利", "Italy") },
  { id: "athens", cn: "雅典", en: "Athens", c: [37.976, 23.728], r: 1.5, feat: "卫城+普拉卡", country: C_("希腊", "Greece") },
  { id: "prague", cn: "布拉格", en: "Prague", c: [50.087, 14.42], r: 1.5, feat: "伏尔塔瓦河弯+老城", country: C_("捷克", "Czechia") },
  { id: "budapest", cn: "布达佩斯", en: "Budapest", c: [47.499, 19.045], r: 1.6, feat: "多瑙河双城", country: C_("匈牙利", "Hungary") },
  { id: "krakow", cn: "克拉科夫", en: "Kraków", c: [50.062, 19.937], r: 1.4, feat: "老城绿带环", country: C_("波兰", "Poland") },
  { id: "munich", cn: "慕尼黑", en: "Munich", c: [48.137, 11.575], r: 1.5, feat: "老城环+伊萨尔河", country: C_("德国", "Germany") },
  { id: "hamburg", cn: "汉堡", en: "Hamburg", c: [53.55, 9.993], r: 1.6, feat: "阿尔斯特湖+港口", country: C_("德国", "Germany") },
  { id: "frankfurt", cn: "法兰克福", en: "Frankfurt", c: [50.111, 8.682], r: 1.5, feat: "美因河+银行区", country: C_("德国", "Germany") },
  { id: "cologne", cn: "科隆", en: "Cologne", c: [50.938, 6.957], r: 1.4, feat: "莱茵河+半环老城", country: C_("德国", "Germany") },
  { id: "zurich", cn: "苏黎世", en: "Zurich", c: [47.372, 8.542], r: 1.4, feat: "湖口+利马特河", country: C_("瑞士", "Switzerland") },
  { id: "geneva", cn: "日内瓦", en: "Geneva", c: [46.205, 6.145], r: 1.4, feat: "莱芒湖口+罗讷河", country: C_("瑞士", "Switzerland") },
  { id: "brussels", cn: "布鲁塞尔", en: "Brussels", c: [50.847, 4.352], r: 1.5, feat: "五边形老城", country: C_("比利时", "Belgium") },
  { id: "copenhagen", cn: "哥本哈根", en: "Copenhagen", c: [55.679, 12.578], r: 1.5, feat: "运河+港湾", country: C_("丹麦", "Denmark") },
  { id: "stockholm", cn: "斯德哥尔摩", en: "Stockholm", c: [59.329, 18.068], r: 1.5, feat: "老城群岛", country: C_("瑞典", "Sweden") },
  { id: "oslo", cn: "奥斯陆", en: "Oslo", c: [59.913, 10.74], r: 1.5, feat: "峡湾口网格", country: C_("挪威", "Norway") },
  { id: "dublin", cn: "都柏林", en: "Dublin", c: [53.346, -6.26], r: 1.5, feat: "利菲河", country: C_("爱尔兰", "Ireland") },
  { id: "edinburgh", cn: "爱丁堡", en: "Edinburgh", c: [55.951, -3.196], r: 1.4, feat: "新城网格+老城脊线", country: C_("英国", "UK") },
  { id: "porto", cn: "波尔图", en: "Porto", c: [41.146, -8.611], r: 1.4, feat: "杜罗河谷阶梯", country: C_("葡萄牙", "Portugal") },
  { id: "seville", cn: "塞维利亚", en: "Seville", c: [37.389, -5.995], r: 1.4, feat: "老城迷宫+瓜河", country: C_("西班牙", "Spain") },
  { id: "marseille", cn: "马赛", en: "Marseille", c: [43.296, 5.37], r: 1.5, feat: "老港扇形", country: C_("法国", "France") },
  { id: "lyon", cn: "里昂", en: "Lyon", c: [45.762, 4.835], r: 1.5, feat: "两河半岛", country: C_("法国", "France") },
  { id: "bordeaux", cn: "波尔多", en: "Bordeaux", c: [44.84, -0.575], r: 1.4, feat: "加龙河月亮港", country: C_("法国", "France") },
  { id: "saint-petersburg", cn: "圣彼得堡", en: "Saint Petersburg", c: [59.935, 30.325], r: 1.7, feat: "涅瓦河放射+运河", country: C_("俄罗斯", "Russia") },
  // —— 扩充批次:美洲 ——
  { id: "los-angeles", cn: "洛杉矶", en: "Los Angeles", c: [34.048, -118.25], r: 1.6, feat: "DTLA 斜网格", country: C_("美国", "USA") },
  { id: "seattle", cn: "西雅图", en: "Seattle", c: [47.605, -122.333], r: 1.5, feat: "海湾斜拼网格", country: C_("美国", "USA") },
  { id: "denver", cn: "丹佛", en: "Denver", c: [39.745, -104.992], r: 1.5, feat: "斜核+正交拼接", country: C_("美国", "USA") },
  { id: "miami", cn: "迈阿密", en: "Miami", c: [25.775, -80.193], r: 1.6, feat: "比斯坎湾", country: C_("美国", "USA") },
  { id: "new-orleans", cn: "新奥尔良", en: "New Orleans", c: [29.955, -90.069], r: 1.5, feat: "密西西比月牙扇形", country: C_("美国", "USA") },
  { id: "philadelphia", cn: "费城", en: "Philadelphia", c: [39.952, -75.165], r: 1.5, feat: "佩恩五广场网格", country: C_("美国", "USA") },
  { id: "pittsburgh", cn: "匹兹堡", en: "Pittsburgh", c: [40.441, -79.999], r: 1.4, feat: "三河金三角", country: C_("美国", "USA") },
  { id: "detroit", cn: "底特律", en: "Detroit", c: [42.331, -83.046], r: 1.5, feat: "放射轮辐", country: C_("美国", "USA") },
  { id: "montreal", cn: "蒙特利尔", en: "Montreal", c: [45.508, -73.561], r: 1.5, feat: "老港+网格", country: C_("加拿大", "Canada") },
  { id: "quebec-city", cn: "魁北克城", en: "Quebec City", c: [46.813, -71.208], r: 1.3, feat: "城墙老城", country: C_("加拿大", "Canada") },
  { id: "mexico-city", cn: "墨西哥城", en: "Mexico City", c: [19.433, -99.133], r: 1.7, feat: "索卡洛殖民网格", country: C_("墨西哥", "Mexico") },
  { id: "havana", cn: "哈瓦那", en: "Havana", c: [23.137, -82.358], r: 1.5, feat: "老城+海堤大道", country: C_("古巴", "Cuba") },
  { id: "bogota", cn: "波哥大", en: "Bogotá", c: [4.598, -74.076], r: 1.6, feat: "安第斯山麓网格", country: C_("哥伦比亚", "Colombia") },
  { id: "lima", cn: "利马", en: "Lima", c: [-12.046, -77.043], r: 1.5, feat: "殖民棋盘老城", country: C_("秘鲁", "Peru") },
  { id: "santiago", cn: "圣地亚哥", en: "Santiago", c: [-33.438, -70.65], r: 1.6, feat: "马波乔河+棋盘", country: C_("智利", "Chile") },
  { id: "sao-paulo", cn: "圣保罗", en: "São Paulo", c: [-23.546, -46.635], r: 1.7, feat: "中心区放射", country: C_("巴西", "Brazil") },
  { id: "brasilia", cn: "巴西利亚", en: "Brasília", c: [-15.794, -47.882], r: 3.0, feat: "飞机平面图", country: C_("巴西", "Brazil") },
  // —— 扩充批次:非洲/中东 ——
  { id: "cairo", cn: "开罗", en: "Cairo", c: [30.044, 31.236], r: 1.7, feat: "尼罗河+扎马莱克岛", country: C_("埃及", "Egypt") },
  { id: "casablanca", cn: "卡萨布兰卡", en: "Casablanca", c: [33.595, -7.619], r: 1.5, feat: "放射+麦地那", country: C_("摩洛哥", "Morocco") },
  { id: "marrakesh", cn: "马拉喀什", en: "Marrakesh", c: [31.63, -7.989], r: 1.4, feat: "红色麦地那迷宫", country: C_("摩洛哥", "Morocco") },
  { id: "tunis", cn: "突尼斯", en: "Tunis", c: [36.799, 10.18], r: 1.5, feat: "麦地那+新城对比", country: C_("突尼斯", "Tunisia") },
  { id: "lagos", cn: "拉各斯", en: "Lagos", c: [6.455, 3.394], r: 1.6, feat: "拉各斯岛+泻湖", country: C_("尼日利亚", "Nigeria") },
  // —— 扩充批次:大洋洲 ——
  { id: "melbourne", cn: "墨尔本", en: "Melbourne", c: [-37.816, 144.964], r: 1.6, feat: "Hoddle 网格+亚拉河", country: C_("澳大利亚", "Australia") },
  { id: "brisbane", cn: "布里斯班", en: "Brisbane", c: [-27.47, 153.025], r: 1.5, feat: "河曲半岛", country: C_("澳大利亚", "Australia") },
  { id: "perth", cn: "珀斯", en: "Perth", c: [-31.953, 115.857], r: 1.5, feat: "天鹅河+网格", country: C_("澳大利亚", "Australia") },
  { id: "auckland", cn: "奥克兰", en: "Auckland", c: [-36.847, 174.765], r: 1.5, feat: "怀特马塔港", country: C_("新西兰", "New Zealand") },
  { id: "wellington", cn: "惠灵顿", en: "Wellington", c: [-41.288, 174.778], r: 1.4, feat: "港湾环抱", country: C_("新西兰", "New Zealand") },
];

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const HW = "^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street|pedestrian|road)(_link)?$";

// 道路等级 → 渲染层级。线索 1「主干道剪影」只画 tier 1,逐层加入 2、3。
const TIER = {
  motorway: 1, trunk: 1, primary: 1,
  secondary: 2, tertiary: 2,
  residential: 3, unclassified: 3, living_street: 3, pedestrian: 3, road: 3,
};
function tierOf(highway) {
  return TIER[highway.replace(/_link$/, "")] || 3;
}

// 几何裁切边界:bbox 外扩 10%,让线条自然延伸出画框而不是停在框内留豁口
const CLIP_MARGIN = 0.1;

function bboxOf(c, r) {
  const dLat = r / 111;
  const dLng = r / (111 * Math.cos((c[0] * Math.PI) / 180));
  return { south: c[0] - dLat, north: c[0] + dLat, west: c[1] - dLng, east: c[1] + dLng };
}
function expandBbox(b, margin) {
  const dLat = (b.north - b.south) * margin;
  const dLng = (b.east - b.west) * margin;
  return { south: b.south - dLat, north: b.north + dLat, west: b.west - dLng, east: b.east + dLng };
}
// 主查询拉 way;末尾追加 relation 水体的成员 way(bbox 内),
// 否则 multipolygon 形式的水体(悉尼港、各种海湾湖泊)会整体缺失。
function buildQuery(b) {
  const bb = "(" + b.south + "," + b.west + "," + b.north + "," + b.east + ")";
  return (
    "[out:json][timeout:60];(" +
    'way["highway"~"' + HW + '"]["name"]' + bb + ";" +
    'way["natural"="coastline"]' + bb + ";" +
    'way["natural"="water"]' + bb + ";" +
    'way["waterway"~"^(river|canal)$"]' + bb + ";" +
    ");out tags geom;" +
    'rel["natural"="water"]' + bb + ";way(r)" + bb + ";out geom;"
  );
}

// Overpass 的 bbox 选择会带回整条 way(可延伸到 bbox 外很远)。
// 按外扩 bbox 把一条 way 切成若干「框内连续段」:出入框处在真实线段上插值出
// 与裁切框的交点(交点仍在这条路的真实折线上),框外部分丢弃 →
// 几何严格有界、且每一段都是这条路真实连续的一截。
function clampToBox(pIn, pOut, box) {
  let t = 1;
  if (pOut.lat < box.south) t = Math.min(t, (box.south - pIn.lat) / (pOut.lat - pIn.lat));
  if (pOut.lat > box.north) t = Math.min(t, (box.north - pIn.lat) / (pOut.lat - pIn.lat));
  if (pOut.lng < box.west) t = Math.min(t, (box.west - pIn.lng) / (pOut.lng - pIn.lng));
  if (pOut.lng > box.east) t = Math.min(t, (box.east - pIn.lng) / (pOut.lng - pIn.lng));
  const lat = pIn.lat + t * (pOut.lat - pIn.lat);
  const lng = pIn.lng + t * (pOut.lng - pIn.lng);
  return [
    +Math.min(box.north, Math.max(box.south, lat)).toFixed(5),
    +Math.min(box.east, Math.max(box.west, lng)).toFixed(5),
  ];
}
function clipWay(geometry, clipBox) {
  const inside = (p) =>
    p.lat >= clipBox.south && p.lat <= clipBox.north && p.lng >= clipBox.west && p.lng <= clipBox.east;
  const pts = geometry.map((p) => ({ lat: +p.lat.toFixed(5), lng: +p.lon.toFixed(5) }));
  const segments = [];
  let cur = null;
  for (let i = 0; i < pts.length; i++) {
    if (inside(pts[i])) {
      if (!cur) {
        cur = [];
        if (i > 0) cur.push(clampToBox(pts[i], pts[i - 1], clipBox)); // 入框交点
      }
      cur.push([pts[i].lat, pts[i].lng]);
    } else if (cur) {
      cur.push(clampToBox(pts[i - 1], pts[i], clipBox)); // 出框交点
      if (cur.length >= 2) segments.push(cur);
      cur = null;
    }
  }
  if (cur && cur.length >= 2) segments.push(cur);
  return segments;
}

function segmentsKm(segments, cosLat) {
  let km = 0;
  for (const seg of segments) {
    for (let i = 1; i < seg.length; i++) {
      const dLat = (seg[i][0] - seg[i - 1][0]) * 111;
      const dLng = (seg[i][1] - seg[i - 1][1]) * 111 * cosLat;
      km += Math.sqrt(dLat * dLat + dLng * dLng);
    }
  }
  return +km.toFixed(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function race(query) {
  const ctrls = MIRRORS.map(() => new AbortController());
  const ps = MIRRORS.map(async (url, i) => {
    const res = await fetch(url, {
      method: "POST",
      signal: ctrls[i].signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "citydle-datagen/0.1 (OSM map-skeleton game; github frank99-owl/citydle)",
      },
      body: "data=" + encodeURIComponent(query),
    });
    if (!res.ok) throw new Error("HTTP " + res.status + " @" + url);
    const j = await res.json();
    if (!j.elements) throw new Error("no elements @" + url);
    ctrls.forEach((c, ci) => { if (ci !== i) c.abort(); });
    return j;
  });
  return Promise.any(ps);
}

function processCity(city, data) {
  const b = bboxOf(city.c, city.r);
  const clipBox = expandBbox(b, CLIP_MARGIN);
  const cosLat = Math.cos((city.c[0] * Math.PI) / 180);
  const streetsMap = new Map(); // name → { tier, segments }
  const water = [], coastline = [];
  const seenWaterIds = new Set(); // 同一 way 可能既带 tag 又是 relation 成员,按 id 去重
  for (const el of data.elements) {
    if (!el.geometry || el.geometry.length < 2) continue;
    const segs = clipWay(el.geometry, clipBox);
    if (!segs.length) continue;
    const t = el.tags || {};
    if (t.highway && t.name) {
      const tier = tierOf(t.highway);
      const cur = streetsMap.get(t.name);
      if (!cur) streetsMap.set(t.name, { tier, segments: segs });
      else {
        cur.tier = Math.min(cur.tier, tier);
        cur.segments.push(...segs);
      }
    } else if (t.natural === "coastline") {
      if (!seenWaterIds.has(el.id)) { seenWaterIds.add(el.id); coastline.push(...segs); }
    } else if (t.natural === "water" || t.waterway) {
      if (!seenWaterIds.has(el.id)) { seenWaterIds.add(el.id); water.push(...segs); }
    } else {
      // 无匹配 tag 的 way 只可能来自查询末尾的 relation 水体成员
      if (!seenWaterIds.has(el.id)) { seenWaterIds.add(el.id); water.push(...segs); }
    }
  }
  const streets = [...streetsMap.entries()]
    .map(([name, s]) => ({ name, tier: s.tier, km: segmentsKm(s.segments, cosLat), segments: s.segments }))
    .sort((a, z) => a.tier - z.tier || z.km - a.km);
  const tiers = { t1: 0, t2: 0, t3: 0 };
  for (const s of streets) tiers["t" + s.tier]++;
  return {
    id: city.id, cn: city.cn, en: city.en, feature: city.feat, country: city.country,
    center: city.c, radiusKm: city.r, bbox: b,
    source: "overpass / OpenStreetMap", license: "ODbL", fetchedAt: new Date().toISOString(),
    counts: { streets: streets.length, water: water.length, coastline: coastline.length, tiers },
    streets, water, coastline,
  };
}

// index.json 永远从磁盘上的全部城市文件重建,而不是只用本次运行成功的列表
function rebuildIndex() {
  const files = fs.readdirSync(OUT).filter((f) => f.endsWith(".json") && f !== "index.json" && f !== "morphology.json");
  const index = files
    .map((f) => {
      const d = JSON.parse(fs.readFileSync(path.join(OUT, f)));
      return { id: d.id, cn: d.cn, en: d.en, feature: d.feature, country: d.country, counts: d.counts };
    })
    .sort((a, z) => a.id.localeCompare(z.id));
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 2));
  return index.length;
}

async function run() {
  const only = process.argv.slice(2);
  const list = only.length ? CITIES.filter((c) => only.includes(c.id)) : CITIES;
  const ok = [], fail = [];
  console.log("开始拉取 " + list.length + " 座城市(真实 OSM 数据)...\n");
  for (const city of list) {
    process.stdout.write("· " + city.id.padEnd(16) + " ");
    try {
      let data;
      for (let attempt = 0; ; attempt++) {
        try {
          data = await race(buildQuery(bboxOf(city.c, city.r)));
          break;
        } catch (e) {
          if (attempt >= 2) throw e; // 全镜像被拒多为瞬时限流,退避重试两次
          await sleep(10000 * (attempt + 1));
        }
      }
      const out = processCity(city, data);
      fs.writeFileSync(path.join(OUT, city.id + ".json"), JSON.stringify(out));
      const c = out.counts;
      console.log(
        "✓ 街道 " + String(c.streets).padStart(4) +
        " (干" + c.tiers.t1 + "/次" + c.tiers.t2 + "/毛" + c.tiers.t3 + ")" +
        " · 水系 " + String(c.water).padStart(3) + " · 海岸 " + c.coastline
      );
      ok.push(city.id);
    } catch (e) {
      console.log("✗ 失败: " + ((e && e.message) || e));
      fail.push(city.id);
    }
    await sleep(2000);
  }
  const total = rebuildIndex();
  console.log("\n完成: " + ok.length + " 成功 / " + fail.length + " 失败" + (fail.length ? " (失败: " + fail.join(", ") + ")" : ""));
  console.log("index.json 含 " + total + " 城 · 输出: " + OUT);
}
run();
