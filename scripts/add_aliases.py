#!/usr/bin/env python3
"""Add multilingual aliases to all preset JSON files."""
import json
import sys
import os

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

NY_ALIASES = {
    "1st Place": ["1st Place", "第一巷"],
    "2nd Place": ["2nd Place", "第二巷"],
    "3rd Place": ["3rd Place", "第三巷"],
    "6th Avenue": ["6th Avenue", "第六大道"],
    "Albany Street": ["Albany Street", "奥尔巴尼街"],
    "Ann Street": ["Ann Street", "安街"],
    "Avenue of the Finest": ["Avenue of the Finest", "最佳大道"],
    "Barclay Street": ["Barclay Street", "巴克莱街"],
    "Battery Place": ["Battery Place", "炮台广场"],
    "Baxter Street": ["Baxter Street", "巴克斯特街"],
    "Bayard Street": ["Bayard Street", "贝亚德街"],
    "Beach Street": ["Beach Street", "海滩街"],
    "Beaver Street": ["Beaver Street", "海狸街"],
    "Beekman Street": ["Beekman Street", "比克曼街"],
    "Bridge Street": ["Bridge Street", "桥街"],
    "Broad Street": ["Broad Street", "宽街"],
    "Broadway": ["Broadway", "百老汇"],
    "Brooklyn Bridge": ["Brooklyn Bridge", "布鲁克林大桥"],
    "Broome Street": ["Broome Street", "布鲁姆街"],
    "Burling Slip": ["Burling Slip", "伯林小港"],
    "Canal Street": ["Canal Street", "运河街"],
    "Cannon's Walk": ["Cannon's Walk", "炮台步道"],
    "Cardinal Hayes Place": ["Cardinal Hayes Place", "海斯枢机广场"],
    "Carlisle Street": ["Carlisle Street", "卡莱尔街"],
    "Cedar Street": ["Cedar Street", "雪松街"],
    "Centre Market Place": ["Centre Market Place", "中央市场广场"],
    "Centre Street": ["Centre Street", "中心街"],
    "Chambers Street": ["Chambers Street", "钱伯斯街"],
    "Chatham Square": ["Chatham Square", "查塔姆广场"],
    "Church Street": ["Church Street", "教堂街"],
    "Cliff Street": ["Cliff Street", "悬崖街"],
    "Coenties Alley": ["Coenties Alley", "科恩提斯巷"],
    "Coenties Slip": ["Coenties Slip", "科恩提斯小港"],
    "Cortlandt Street": ["Cortlandt Street", "科特兰街"],
    "Cortlandt Way": ["Cortlandt Way", "科特兰路"],
    "Crosby Street": ["Crosby Street", "克罗斯比街"],
    "Dey Street": ["Dey Street", "迪伊街"],
    "Dover Street": ["Dover Street", "多佛街"],
    "Doyers Street": ["Doyers Street", "摆花街"],
    "Duane Street": ["Duane Street", "杜安街"],
    "Dutch Street": ["Dutch Street", "荷兰街"],
    "East Broadway": ["East Broadway", "东百老汇"],
    "Edgar Street": ["Edgar Street", "埃德加街"],
    "Elizabeth Street": ["Elizabeth Street", "伊丽莎白街"],
    "Elk Street": ["Elk Street", "麋鹿街"],
    "Ericsson Place": ["Ericsson Place", "埃里克森广场"],
    "Evacuation Day Plaza": ["Evacuation Day Plaza", "撤退日广场"],
    "Exchange Alley": ["Exchange Alley", "交易所巷"],
    "Exchange Place": ["Exchange Place", "交易所广场"],
    "Fletcher Street": ["Fletcher Street", "弗莱彻街"],
    "Frankfort Street": ["Frankfort Street", "法兰克福街"],
    "Franklin Street": ["Franklin Street", "富兰克林街"],
    "Front Street": ["Front Street", "前街"],
    "Fulton Street": ["Fulton Street", "富尔顿街"],
    "Gold Street": ["Gold Street", "黄金街"],
    "Golden Hill Plaza": ["Golden Hill Plaza", "金山广场"],
    "Gouverneur Lane": ["Gouverneur Lane", "古弗纳尔巷"],
    "Grand Street": ["Grand Street", "大街"],
    "Greene Street": ["Greene Street", "格林街"],
    "Greenwich Street": ["Greenwich Street", "格林威治街"],
    "Gwathmey Plaza": ["Gwathmey Plaza", "格瓦斯米广场"],
    "Hanover Square": ["Hanover Square", "汉诺威广场"],
    "Hanover Street": ["Hanover Street", "汉诺威街"],
    "Harrison Street": ["Harrison Street", "哈里森街"],
    "Henry Street": ["Henry Street", "亨利街"],
    "Hester Street": ["Hester Street", "赫斯特街"],
    "Hogan Place": ["Hogan Place", "霍根广场"],
    "Howard Street": ["Howard Street", "霍华德街"],
    "Hudson Street": ["Hudson Street", "哈德逊街"],
    "James Street": ["James Street", "詹姆斯街"],
    "Jay Street": ["Jay Street", "杰伊街"],
    "John Street": ["John Street", "约翰街"],
    "Joseph P. Ward Street": ["Joseph P. Ward Street", "沃德街"],
    "Lafayette Street": ["Lafayette Street", "拉斐特街"],
    "Leonard Street": ["Leonard Street", "伦纳德街"],
    "Liberty Street": ["Liberty Street", "自由街"],
    "Liberty Street Bridge": ["Liberty Street Bridge", "自由街桥"],
    "Lispenard Street": ["Lispenard Street", "利斯佩纳德街"],
    "Little West Street": ["Little West Street", "小西街"],
    "Madison Street": ["Madison Street", "麦迪逊街"],
    "Maiden Lane": ["Maiden Lane", "少女巷"],
    "Mercer Street": ["Mercer Street", "默瑟街"],
    "Mill Lane": ["Mill Lane", "磨坊巷"],
    "Moore Street": ["Moore Street", "摩尔街"],
    "Morris Street": ["Morris Street", "莫里斯街"],
    "Mosco Street": ["Mosco Street", "莫斯科街"],
    "Mott Street": ["Mott Street", "莫特街"],
    "Mulberry Street": ["Mulberry Street", "桑树街"],
    "Murray Street": ["Murray Street", "默里街"],
    "Nassau Street": ["Nassau Street", "拿骚街"],
    "New Street": ["New Street", "新街"],
    "North End Avenue": ["North End Avenue", "北端大道"],
    "North End Way": ["North End Way", "北端路"],
    "North Moore Street": ["North Moore Street", "北摩尔街"],
    "Old Slip": ["Old Slip", "老码头"],
    "Old Slip Plaza": ["Old Slip Plaza", "老码头广场"],
    "Oliver Street": ["Oliver Street", "奥利弗街"],
    "Park Place": ["Park Place", "公园广场"],
    "Park Row": ["Park Row", "公园排"],
    "Pearl Street": ["Pearl Street", "珍珠街"],
    "Peck Slip": ["Peck Slip", "佩克小港"],
    "Pell Street": ["Pell Street", "柏街"],
    "Peter Minuit Plaza": ["Peter Minuit Plaza", "米纽伊特广场"],
    "Pier 15": ["Pier 15", "15号码头"],
    "Pier 3 Plaza": ["Pier 3 Plaza", "3号码头广场"],
    "Pine Street": ["Pine Street", "松树街"],
    "Platt Street": ["Platt Street", "普拉特街"],
    "Reade Street": ["Reade Street", "里德街"],
    "Rector Place": ["Rector Place", "教区长广场"],
    "Rector Street": ["Rector Street", "教区长街"],
    "River Terrace": ["River Terrace", "河岸台地"],
    "Robert F. Wagner Sr. Place": ["Robert F. Wagner Sr. Place", "瓦格纳广场"],
    "Rose Street": ["Rose Street", "玫瑰街"],
    "Saint James Place": ["Saint James Place", "圣詹姆斯广场"],
    "Saint John's Lane": ["Saint John's Lane", "圣约翰巷"],
    "South End Avenue": ["South End Avenue", "南端大道"],
    "South Street": ["South Street", "南街"],
    "South William Street": ["South William Street", "南威廉街"],
    "Spruce Street": ["Spruce Street", "云杉街"],
    "State Street": ["State Street", "州街"],
    "Stone Street": ["Stone Street", "石街"],
    "Thames Street": ["Thames Street", "泰晤士街"],
    "Thomas Street": ["Thomas Street", "托马斯街"],
    "Trimble Place": ["Trimble Place", "特里姆布尔广场"],
    "Trinity Place": ["Trinity Place", "三一广场"],
    "Varick Street": ["Varick Street", "瓦里克街"],
    "Vesey Place": ["Vesey Place", "维西广场"],
    "Vesey Street": ["Vesey Street", "维西街"],
    "Walker Street": ["Walker Street", "沃克街"],
    "Wall Street": ["Wall Street", "华尔街"],
    "Warren Street": ["Warren Street", "沃伦街"],
    "Washington Street": ["Washington Street", "华盛顿街"],
    "Water Street": ["Water Street", "水街"],
    "West Broadway": ["West Broadway", "西百老汇"],
    "West Street": ["West Street", "西街"],
    "West Thames Street": ["West Thames Street", "西泰晤士街"],
    "White Street": ["White Street", "白街"],
    "Whitehall Street": ["Whitehall Street", "白厅街"],
    "William Street": ["William Street", "威廉街"],
    "Wooster Street": ["Wooster Street", "伍斯特街"],
    "Worth Street": ["Worth Street", "沃斯街"],
}

TOKYO_ALIASES = {
    "あおぎり通り": ["あおぎり通り", "Aogiri-dori"],
    "あじさい通り": ["あじさい通り", "Ajisai-dori"],
    "さくら通り": ["さくら通り", "Sakura-dori"],
    "みゆき通り": ["みゆき通り", "Miyuki-dori"],
    "むろまち小路": ["むろまち小路", "Muromachi Koji"],
    "並木通り": ["並木通り", "Namiki-dori"],
    "丸の内 1st": ["丸の内 1st", "Marunouchi 1st"],
    "丸の内 2nd": ["丸の内 2nd", "Marunouchi 2nd"],
    "丸の内 3rd": ["丸の内 3rd", "Marunouchi 3rd"],
    "丸の内 4th": ["丸の内 4th", "Marunouchi 4th"],
    "丸の内 5th": ["丸の内 5th", "Marunouchi 5th"],
    "丸の内 6th": ["丸の内 6th", "Marunouchi 6th"],
    "丸の内 7th": ["丸の内 7th", "Marunouchi 7th"],
    "丸の内仲通り": ["丸の内仲通り", "Marunouchi Naka-dori"],
    "丸の内室町線": ["丸の内室町線", "Marunouchi Muromachi Line"],
    "亀島橋": ["亀島橋", "Kamejima-bashi"],
    "二八通り": ["二八通り", "Nihachi-dori"],
    "京橋大根河岸通り": ["京橋大根河岸通り", "Kyobashi Daikon-gashi-dori"],
    "京橋宝通り": ["京橋宝通り", "Kyobashi Takara-dori"],
    "京橋竹河岸通り": ["京橋竹河岸通り", "Kyobashi Take-gashi-dori"],
    "八日通り": ["八日通り", "Yoka-dori"],
    "八重洲仲通り": ["八重洲仲通り", "Yaesu Naka-dori"],
    "八重洲北口通り": ["八重洲北口通り", "Yaesu Kita-guchi-dori"],
    "八重洲通り": ["八重洲通り", "Yaesu-dori"],
    "内堀通り": ["内堀通り", "Uchibori-dori"],
    "和田倉橋": ["和田倉橋", "Wadabori-bashi"],
    "外堀通り": ["外堀通り", "Sotobori-dori"],
    "大名小路": ["大名小路", "Daimyo Koji"],
    "大手町仲通り": ["大手町仲通り", "Otemachi Naka-dori"],
    "平成通り": ["平成通り", "Heisei-dori"],
    "按針通り": ["按針通り", "Anjin-dori"],
    "新亀島橋": ["新亀島橋", "Shin-Kamejima-bashi"],
    "新場橋": ["新場橋", "Shinbashi-bashi"],
    "新大橋通り": ["新大橋通り", "Shin-Ohashi-dori"],
    "日比谷通り": ["日比谷通り", "Hibiya-dori"],
    "日銀通り": ["日銀通り", "Gin-dori"],
    "昭和通り": ["昭和通り", "Showa-dori"],
    "有楽町高架下センター商店街": ["有楽町高架下センター商店街", "Yurakucho Kōkasita Center Shopping Street"],
    "柳通り": ["柳通り", "Yanagi-dori"],
    "永代通り": ["永代通り", "Eitai-dori"],
    "江戸・もみじ通り": ["江戸・もみじ通り", "Edo Momiji-dori"],
    "江戸桜通り": ["江戸桜通り", "Edo Zakura-dori"],
    "江戸通り": ["江戸通り", "Edo-dori"],
    "江戸通り(8時から20時右折禁止)": ["江戸通り(8時から20時右折禁止)", "Edo-dori (No Right Turn 8:00-20:00)"],
    "福徳の森": ["福徳の森", "Fukutoku no Mori"],
    "行幸通り": ["行幸通り", "Gyoko-dori"],
    "鈴らん通り": ["鈴らん通り", "Suzuran-dori"],
    "銀座レンガ通り": ["銀座レンガ通り", "Ginza Renga-dori"],
    "銀座柳通り": ["銀座柳通り", "Ginza Yanagi-dori"],
    "銀座桜通り": ["銀座桜通り", "Ginza Sakura-dori"],
    "錦町有楽町線": ["錦町有楽町線", "Nishimachi Yurakucho Line"],
    "鍛冶橋通り": ["鍛冶橋通り", "Kajibashi-dori"],
    "鎧橋": ["鎧橋", "Yoroi-bashi"],
    "養珠院通り": ["養珠院通り", "Yōjuin-dori"],
    "馬場先通り": ["馬場先通り", "Babasaki-dori"],
}

# For Tokyo: if street not in map, default to [name]
def tokyo_aliases(name):
    return TOKYO_ALIASES.get(name, [name])

def ny_aliases(name):
    return NY_ALIASES.get(name, [name])

def add_aliases(filepath, alias_fn):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for street in data['streets']:
        street['aliases'] = alias_fn(street['name'])
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(f"  {filepath}: {len(data['streets'])} streets updated")

def add_hk_aliases(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for street in data['streets']:
        name = street['name']
        # HK format: "中文 English" - find the boundary between CJK and ASCII
        # Split at the first space after the last CJK character
        last_cjk_idx = -1
        for i, c in enumerate(name):
            if ord(c) > 0x2E80:  # CJK range
                last_cjk_idx = i
        if last_cjk_idx >= 0 and last_cjk_idx < len(name) - 1:
            rest = name[last_cjk_idx + 1:]
            if rest.startswith(' '):
                english_part = rest[1:]  # skip the space
                street['aliases'] = [name, english_part]
            else:
                street['aliases'] = [name]
        else:
            street['aliases'] = [name]
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(f"  {filepath}: {len(data['streets'])} streets updated")

def add_generic_aliases(filepath):
    """For cities without predefined translations: aliases = [name]"""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for street in data['streets']:
        street['aliases'] = [street['name']]
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(f"  {filepath}: {len(data['streets'])} streets updated")

print("Adding aliases to preset files...")
add_aliases('data/presets/new-york.json', ny_aliases)
add_aliases('data/presets/london.json', lambda name: [name])
add_aliases('data/presets/tokyo.json', tokyo_aliases)
add_hk_aliases('data/presets/hong-kong.json')
add_aliases('data/presets/singapore.json', lambda name: [name])
print("Done!")
