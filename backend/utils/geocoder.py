import requests

CITY_COORDS = {
    # 한국
    "서울": (37.5665, 126.9780), "인천": (37.4563, 126.7052), "부산": (35.1796, 129.0756), "제주": (33.4996, 126.5312),
    "Seoul": (37.5665, 126.9780), "Incheon": (37.4563, 126.7052), "Busan": (35.1796, 129.0756), "Jeju": (33.4996, 126.5312),
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

def geocode_city(city_name: str):
    # Try dictionary first
    if city_name in CITY_COORDS:
        return CITY_COORDS[city_name]
    
    # Fallback to OpenStreetMap (Nominatim) - No API key required for low volume
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={city_name}&format=json&limit=1"
        response = requests.get(url, headers={'User-Agent': 'VoyageAtlas-PoC'})
        data = response.json()
        if data:
            return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f"Geocoding error for {city_name}: {e}")
    
    return None, None
