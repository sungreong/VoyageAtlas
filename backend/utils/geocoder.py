from math import atan2, cos, radians, sin, sqrt

import requests

CITY_COORDS = {
    # 한국
    "서울": (37.5665, 126.9780), "인천": (37.4563, 126.7052), "부산": (35.1796, 129.0756),
    "제주": (33.4996, 126.5312), "제주도": (33.4996, 126.5312), "제주시": (33.4996, 126.5312), "서귀포": (33.2541, 126.5601),
    "Seoul": (37.5665, 126.9780), "Incheon": (37.4563, 126.7052), "Busan": (35.1796, 129.0756),
    "Jeju": (33.4996, 126.5312), "Jeju-do": (33.4996, 126.5312), "Jeju City": (33.4996, 126.5312), "Seogwipo": (33.2541, 126.5601),
    # 일본
    "도쿄": (35.6762, 139.6503), "오사카": (34.6937, 135.5023), "후쿠오카": (33.5904, 130.4017), "삿포로": (43.0611, 141.3564),
    "Tokyo": (35.6762, 139.6503), "Osaka": (34.6937, 135.5023), "Fukuoka": (33.5904, 130.4017), "Sapporo": (43.0611, 141.3564),
    # 유럽
    "파리": (48.8566, 2.3522), "런던": (51.5074, -0.1278), "로마": (41.9028, 12.4964), "베를린": (52.5200, 13.4050),
    "Paris": (48.8566, 2.3522), "London": (51.5074, -0.1278), "Rome": (41.9028, 12.4964), "Berlin": (52.5200, 13.4050),
    # 북미
    "뉴욕": (40.7128, -74.0060), "로스앤젤레스": (34.0522, -118.2437), "시카고": (41.8781, -87.6298), "밴쿠버": (49.2827, -123.1207),
    "New York": (40.7128, -74.0060), "Los Angeles": (34.0522, -118.2437), "Chicago": (41.8781, -87.6298), "Vancouver": (49.2827, -123.1207),
    # 동남아
    "방콕": (13.7563, 100.5018), "다낭": (16.0544, 108.2022), "싱가포르": (1.3521, 103.8198), "타이베이": (25.0330, 121.5654),
    "Bangkok": (13.7563, 100.5018), "Da Nang": (16.0544, 108.2022), "Singapore": (1.3521, 103.8198), "Taipei": (25.0330, 121.5654),
}

COUNTRY_REPRESENTATIVE_CITIES = {
    "kr": {"name": "서울, 대한민국", "city": "서울", "country": "대한민국", "lat": 37.5665, "lng": 126.9780},
    "jp": {"name": "도쿄, 일본", "city": "도쿄", "country": "일본", "lat": 35.6762, "lng": 139.6503},
    "cn": {"name": "베이징, 중국", "city": "베이징", "country": "중국", "lat": 39.9042, "lng": 116.4074},
    "tw": {"name": "타이베이, 대만", "city": "타이베이", "country": "대만", "lat": 25.0330, "lng": 121.5654},
    "hk": {"name": "홍콩", "city": "홍콩", "country": "홍콩", "lat": 22.3193, "lng": 114.1694},
    "th": {"name": "방콕, 태국", "city": "방콕", "country": "태국", "lat": 13.7563, "lng": 100.5018},
    "vn": {"name": "하노이, 베트남", "city": "하노이", "country": "베트남", "lat": 21.0278, "lng": 105.8342},
    "sg": {"name": "싱가포르", "city": "싱가포르", "country": "싱가포르", "lat": 1.3521, "lng": 103.8198},
    "my": {"name": "쿠알라룸푸르, 말레이시아", "city": "쿠알라룸푸르", "country": "말레이시아", "lat": 3.1390, "lng": 101.6869},
    "id": {"name": "자카르타, 인도네시아", "city": "자카르타", "country": "인도네시아", "lat": -6.2088, "lng": 106.8456},
    "ph": {"name": "마닐라, 필리핀", "city": "마닐라", "country": "필리핀", "lat": 14.5995, "lng": 120.9842},
    "kh": {"name": "프놈펜, 캄보디아", "city": "프놈펜", "country": "캄보디아", "lat": 11.5564, "lng": 104.9282},
    "la": {"name": "비엔티안, 라오스", "city": "비엔티안", "country": "라오스", "lat": 17.9757, "lng": 102.6331},
    "in": {"name": "뉴델리, 인도", "city": "뉴델리", "country": "인도", "lat": 28.6139, "lng": 77.2090},
    "np": {"name": "카트만두, 네팔", "city": "카트만두", "country": "네팔", "lat": 27.7172, "lng": 85.3240},
    "ae": {"name": "두바이, 아랍에미리트", "city": "두바이", "country": "아랍에미리트", "lat": 25.2048, "lng": 55.2708},
    "tr": {"name": "이스탄불, 튀르키예", "city": "이스탄불", "country": "튀르키예", "lat": 41.0082, "lng": 28.9784},
    "fr": {"name": "파리, 프랑스", "city": "파리", "country": "프랑스", "lat": 48.8566, "lng": 2.3522},
    "gb": {"name": "런던, 영국", "city": "런던", "country": "영국", "lat": 51.5074, "lng": -0.1278},
    "it": {"name": "로마, 이탈리아", "city": "로마", "country": "이탈리아", "lat": 41.9028, "lng": 12.4964},
    "de": {"name": "베를린, 독일", "city": "베를린", "country": "독일", "lat": 52.5200, "lng": 13.4050},
    "es": {"name": "마드리드, 스페인", "city": "마드리드", "country": "스페인", "lat": 40.4168, "lng": -3.7038},
    "pt": {"name": "리스본, 포르투갈", "city": "리스본", "country": "포르투갈", "lat": 38.7223, "lng": -9.1393},
    "ch": {"name": "취리히, 스위스", "city": "취리히", "country": "스위스", "lat": 47.3769, "lng": 8.5417},
    "at": {"name": "빈, 오스트리아", "city": "빈", "country": "오스트리아", "lat": 48.2082, "lng": 16.3738},
    "nl": {"name": "암스테르담, 네덜란드", "city": "암스테르담", "country": "네덜란드", "lat": 52.3676, "lng": 4.9041},
    "be": {"name": "브뤼셀, 벨기에", "city": "브뤼셀", "country": "벨기에", "lat": 50.8503, "lng": 4.3517},
    "cz": {"name": "프라하, 체코", "city": "프라하", "country": "체코", "lat": 50.0755, "lng": 14.4378},
    "us": {"name": "뉴욕, 미국", "city": "뉴욕", "country": "미국", "lat": 40.7128, "lng": -74.0060},
    "ca": {"name": "밴쿠버, 캐나다", "city": "밴쿠버", "country": "캐나다", "lat": 49.2827, "lng": -123.1207},
    "mx": {"name": "멕시코시티, 멕시코", "city": "멕시코시티", "country": "멕시코", "lat": 19.4326, "lng": -99.1332},
    "br": {"name": "상파울루, 브라질", "city": "상파울루", "country": "브라질", "lat": -23.5558, "lng": -46.6396},
    "ar": {"name": "부에노스아이레스, 아르헨티나", "city": "부에노스아이레스", "country": "아르헨티나", "lat": -34.6037, "lng": -58.3816},
    "au": {"name": "시드니, 호주", "city": "시드니", "country": "호주", "lat": -33.8688, "lng": 151.2093},
    "nz": {"name": "오클랜드, 뉴질랜드", "city": "오클랜드", "country": "뉴질랜드", "lat": -36.8509, "lng": 174.7645},
    "eg": {"name": "카이로, 이집트", "city": "카이로", "country": "이집트", "lat": 30.0444, "lng": 31.2357},
    "za": {"name": "케이프타운, 남아프리카공화국", "city": "케이프타운", "country": "남아프리카공화국", "lat": -33.9249, "lng": 18.4241},
}

def geocode_city(city_name: str):
    query = city_name.strip()
    # Try dictionary first
    if query in CITY_COORDS:
        return CITY_COORDS[query]

    query_lower = query.lower()
    for known_city, coords in CITY_COORDS.items():
        if known_city.lower() == query_lower:
            return coords
    
    # Fallback to OpenStreetMap (Nominatim) - No API key required for low volume
    try:
        url = "https://nominatim.openstreetmap.org/search"
        response = requests.get(
            url,
            params={"q": query, "format": "json", "limit": 1},
            headers={'User-Agent': 'VoyageAtlas-PoC'}
        )
        data = response.json()
        if data:
            return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f"Geocoding error for {query}: {e}")
    
    return None, None


def calculate_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    earth_radius_km = 6371
    d_lat = radians(lat2 - lat1)
    d_lng = radians(lng2 - lng1)
    a = (
        sin(d_lat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng / 2) ** 2
    )
    return earth_radius_km * 2 * atan2(sqrt(a), sqrt(1 - a))


def get_address_city_name(address: dict) -> str | None:
    if not address:
        return None

    return (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("municipality")
        or address.get("county")
        or address.get("suburb")
        or address.get("island")
    )


def get_address_region_name(address: dict) -> str | None:
    if not address:
        return None

    return (
        address.get("state")
        or address.get("province")
        or address.get("region")
        or address.get("county")
        or address.get("state_district")
    )


def build_location_label(city: str | None, region: str | None, country: str | None) -> str | None:
    parts = []
    for part in (city, region, country):
        if part and part not in parts:
            parts.append(part)
    return ", ".join(parts) if parts else None


def get_country_representative(address: dict) -> dict | None:
    country_code = (address.get("country_code") or "").lower()
    if country_code in COUNTRY_REPRESENTATIVE_CITIES:
        return COUNTRY_REPRESENTATIVE_CITIES[country_code]

    country = address.get("country")
    if not country:
        return None

    country_lower = country.lower()
    for representative in COUNTRY_REPRESENTATIVE_CITIES.values():
        if representative["country"].lower() == country_lower:
            return representative

    return None


def get_nearest_known_city(lat: float, lng: float) -> dict:
    nearest = None
    seen_coords = set()

    for city, (city_lat, city_lng) in CITY_COORDS.items():
        coord_key = (round(city_lat, 4), round(city_lng, 4))
        if coord_key in seen_coords:
            continue

        seen_coords.add(coord_key)
        distance_km = calculate_distance_km(lat, lng, city_lat, city_lng)
        if nearest is None or distance_km < nearest["distance_km"]:
            nearest = {
                "name": city,
                "lat": city_lat,
                "lng": city_lng,
                "distance_km": round(distance_km, 1),
            }

    return nearest


def reverse_geocode_coords(lat: float, lng: float) -> dict:
    if lat is None or lng is None:
        raise ValueError("lat and lng are required")

    lat = float(lat)
    lng = float(lng)
    if not -90 <= lat <= 90 or not -180 <= lng <= 180:
        raise ValueError("lat or lng is outside the valid range")

    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "format": "jsonv2",
                "lat": lat,
                "lon": lng,
                "zoom": 10,
                "addressdetails": 1,
                "accept-language": "ko,en",
            },
            headers={"User-Agent": "VoyageAtlas-PoC"},
            timeout=6,
        )
        response.raise_for_status()
        data = response.json()
        address = data.get("address") or {}
        city = get_address_city_name(address)
        region = get_address_region_name(address)
        country = address.get("country")

        name = build_location_label(city, region, country)
        if name:
            return {
                "name": name,
                "city": city,
                "region": region,
                "country": country,
                "display_name": data.get("display_name"),
                "lat": lat,
                "lng": lng,
                "source": "reverse",
            }

        representative = get_country_representative(address)
        if representative:
            return {
                **representative,
                "display_name": data.get("display_name"),
                "source": "country_representative",
                "selected_lat": lat,
                "selected_lng": lng,
            }
    except Exception as e:
        print(f"Reverse geocoding error for {lat}, {lng}: {e}")

    nearest = get_nearest_known_city(lat, lng)
    return {
        "name": nearest["name"] if nearest else f"Selected location ({lat:.4f}, {lng:.4f})",
        "city": nearest["name"] if nearest else None,
        "country": None,
        "display_name": None,
        "lat": lat,
        "lng": lng,
        "source": "nearest_known",
        "distance_km": nearest["distance_km"] if nearest else None,
        "matched_lat": nearest["lat"] if nearest else None,
        "matched_lng": nearest["lng"] if nearest else None,
    }
