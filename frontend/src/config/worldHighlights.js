const BASE_WORLD_LIFE_LIST_DESTINATIONS = [
  {
    id: 'paris',
    name: 'Paris',
    aliases: ['paris', '파리'],
    region: 'France',
    type: 'city',
    lat: 48.8566,
    lng: 2.3522,
    priority: 10
  },
  {
    id: 'new-york',
    name: 'New York',
    aliases: ['new york', 'nyc', '뉴욕'],
    region: 'United States',
    type: 'city',
    lat: 40.7128,
    lng: -74.006,
    priority: 10
  },
  {
    id: 'london',
    name: 'London',
    aliases: ['london', '런던'],
    region: 'United Kingdom',
    type: 'city',
    lat: 51.5074,
    lng: -0.1278,
    priority: 10
  },
  {
    id: 'rome',
    name: 'Rome',
    aliases: ['rome', 'roma', '로마'],
    region: 'Italy',
    type: 'city',
    lat: 41.9028,
    lng: 12.4964,
    priority: 9
  },
  {
    id: 'barcelona',
    name: 'Barcelona',
    aliases: ['barcelona', '바르셀로나'],
    region: 'Spain',
    type: 'city',
    lat: 41.3874,
    lng: 2.1686,
    priority: 9
  },
  {
    id: 'madrid',
    name: 'Madrid',
    aliases: ['madrid', '마드리드'],
    region: 'Spain',
    type: 'city',
    lat: 40.4168,
    lng: -3.7038,
    priority: 9
  },
  {
    id: 'milan',
    name: 'Milan',
    aliases: ['milan', 'milano', '밀라노'],
    region: 'Italy',
    type: 'city',
    lat: 45.4642,
    lng: 9.19,
    priority: 8
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    aliases: ['istanbul', '이스탄불'],
    region: 'Turkiye',
    type: 'city',
    lat: 41.0082,
    lng: 28.9784,
    priority: 9
  },
  {
    id: 'cairo',
    name: 'Cairo',
    aliases: ['cairo', '카이로'],
    region: 'Egypt',
    type: 'city',
    lat: 30.0444,
    lng: 31.2357,
    priority: 9
  },
  {
    id: 'dubai',
    name: 'Dubai',
    aliases: ['dubai', '두바이'],
    region: 'United Arab Emirates',
    type: 'city',
    lat: 25.2048,
    lng: 55.2708,
    priority: 8
  },
  {
    id: 'macau',
    name: 'Macau',
    aliases: ['macau', 'macao', '마카오'],
    region: 'China',
    type: 'city',
    lat: 22.1987,
    lng: 113.5439,
    priority: 8
  },
  {
    id: 'kuala-lumpur',
    name: 'Kuala Lumpur',
    aliases: ['kuala lumpur', 'kl', '쿠알라룸푸르'],
    region: 'Malaysia',
    type: 'city',
    lat: 3.139,
    lng: 101.6869,
    priority: 8
  },
  {
    id: 'seoul',
    name: 'Seoul',
    aliases: ['seoul', '서울'],
    region: 'South Korea',
    type: 'city',
    lat: 37.5665,
    lng: 126.978,
    priority: 8
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    aliases: ['tokyo', '도쿄'],
    region: 'Japan',
    type: 'city',
    lat: 35.6762,
    lng: 139.6503,
    priority: 10
  },
  {
    id: 'kyoto',
    name: 'Kyoto',
    aliases: ['kyoto', '교토'],
    region: 'Japan',
    type: 'city',
    lat: 35.0116,
    lng: 135.7681,
    priority: 9
  },
  {
    id: 'osaka',
    name: 'Osaka',
    aliases: ['osaka', '오사카'],
    region: 'Japan',
    type: 'city',
    lat: 34.6937,
    lng: 135.5023,
    priority: 8
  },
  {
    id: 'sapporo',
    name: 'Sapporo',
    aliases: ['sapporo', '삿포로'],
    region: 'Japan',
    type: 'city',
    lat: 43.0618,
    lng: 141.3545,
    priority: 8
  },
  {
    id: 'fukuoka',
    name: 'Fukuoka',
    aliases: ['fukuoka', '후쿠오카'],
    region: 'Japan',
    type: 'city',
    lat: 33.5904,
    lng: 130.4017,
    priority: 8
  },
  {
    id: 'nara',
    name: 'Nara',
    aliases: ['nara', '나라'],
    region: 'Japan',
    type: 'city',
    lat: 34.6851,
    lng: 135.8048,
    priority: 8
  },
  {
    id: 'hiroshima',
    name: 'Hiroshima',
    aliases: ['hiroshima', '히로시마'],
    region: 'Japan',
    type: 'city',
    lat: 34.3853,
    lng: 132.4553,
    priority: 8
  },
  {
    id: 'kanazawa',
    name: 'Kanazawa',
    aliases: ['kanazawa', '가나자와'],
    region: 'Japan',
    type: 'city',
    lat: 36.5613,
    lng: 136.6562,
    priority: 7
  },
  {
    id: 'nagoya',
    name: 'Nagoya',
    aliases: ['nagoya', '나고야'],
    region: 'Japan',
    type: 'city',
    lat: 35.1815,
    lng: 136.9066,
    priority: 7
  },
  {
    id: 'yokohama',
    name: 'Yokohama',
    aliases: ['yokohama', '요코하마'],
    region: 'Japan',
    type: 'city',
    lat: 35.4437,
    lng: 139.638,
    priority: 7
  },
  {
    id: 'kobe',
    name: 'Kobe',
    aliases: ['kobe', '고베'],
    region: 'Japan',
    type: 'city',
    lat: 34.6901,
    lng: 135.1955,
    priority: 7
  },
  {
    id: 'nikko',
    name: 'Nikko',
    aliases: ['nikko', '닛코'],
    region: 'Japan',
    type: 'nature',
    lat: 36.7198,
    lng: 139.6982,
    priority: 7
  },
  {
    id: 'hakone',
    name: 'Hakone',
    aliases: ['hakone', '하코네'],
    region: 'Japan',
    type: 'nature',
    lat: 35.2324,
    lng: 139.1069,
    priority: 7
  },
  {
    id: 'fujikawaguchiko',
    name: 'Fujikawaguchiko',
    aliases: ['fujikawaguchiko', 'kawaguchiko', '후지카와구치코', '가와구치코'],
    region: 'Japan',
    type: 'nature',
    lat: 35.4973,
    lng: 138.7552,
    priority: 7
  },
  {
    id: 'naha',
    name: 'Naha',
    aliases: ['naha', 'okinawa', '나하', '오키나와'],
    region: 'Japan',
    type: 'resort',
    lat: 26.2124,
    lng: 127.6792,
    priority: 8
  },
  {
    id: 'nagasaki',
    name: 'Nagasaki',
    aliases: ['nagasaki', '나가사키'],
    region: 'Japan',
    type: 'city',
    lat: 32.7503,
    lng: 129.8777,
    priority: 7
  },
  {
    id: 'beppu',
    name: 'Beppu',
    aliases: ['beppu', '벳푸'],
    region: 'Japan',
    type: 'nature',
    lat: 33.2846,
    lng: 131.4912,
    priority: 7
  },
  {
    id: 'takayama',
    name: 'Takayama',
    aliases: ['takayama', '다카야마'],
    region: 'Japan',
    type: 'city',
    lat: 36.1461,
    lng: 137.2522,
    priority: 7
  },
  {
    id: 'kamakura',
    name: 'Kamakura',
    aliases: ['kamakura', '가마쿠라'],
    region: 'Japan',
    type: 'city',
    lat: 35.3192,
    lng: 139.5467,
    priority: 7
  },
  {
    id: 'sendai',
    name: 'Sendai',
    aliases: ['sendai', '센다이'],
    region: 'Japan',
    type: 'city',
    lat: 38.2682,
    lng: 140.8694,
    priority: 7
  },
  {
    id: 'bangkok',
    name: 'Bangkok',
    aliases: ['bangkok', '방콕'],
    region: 'Thailand',
    type: 'city',
    lat: 13.7563,
    lng: 100.5018,
    priority: 9
  },
  {
    id: 'chiang-mai',
    name: 'Chiang Mai',
    aliases: ['chiang mai', '치앙마이'],
    region: 'Thailand',
    type: 'city',
    lat: 18.7883,
    lng: 98.9853,
    priority: 9
  },
  {
    id: 'hoi-an',
    name: 'Hoi An',
    aliases: ['hoi an', '호이안'],
    region: 'Vietnam',
    type: 'city',
    lat: 15.8801,
    lng: 108.338,
    priority: 8
  },
  {
    id: 'singapore',
    name: 'Singapore',
    aliases: ['singapore', '싱가포르'],
    region: 'Singapore',
    type: 'city',
    lat: 1.3521,
    lng: 103.8198,
    priority: 9
  },
  {
    id: 'hong-kong',
    name: 'Hong Kong',
    aliases: ['hong kong', '홍콩'],
    region: 'China',
    type: 'city',
    lat: 22.3193,
    lng: 114.1694,
    priority: 8
  },
  {
    id: 'bali',
    name: 'Bali',
    aliases: ['bali', '발리'],
    region: 'Indonesia',
    type: 'resort',
    lat: -8.3405,
    lng: 115.092,
    priority: 9
  },
  {
    id: 'ubud',
    name: 'Ubud',
    aliases: ['ubud', '우붓'],
    region: 'Bali',
    type: 'nature',
    lat: -8.5069,
    lng: 115.2625,
    priority: 8
  },
  {
    id: 'maldives',
    name: 'Maldives',
    aliases: ['maldives', '몰디브'],
    region: 'Indian Ocean',
    type: 'resort',
    lat: 3.2028,
    lng: 73.2207,
    priority: 9
  },
  {
    id: 'phuket',
    name: 'Phuket',
    aliases: ['phuket', '푸켓'],
    region: 'Thailand',
    type: 'resort',
    lat: 7.8804,
    lng: 98.3923,
    priority: 8
  },
  {
    id: 'santorini',
    name: 'Santorini',
    aliases: ['santorini', '산토리니'],
    region: 'Greece',
    type: 'resort',
    lat: 36.3932,
    lng: 25.4615,
    priority: 9
  },
  {
    id: 'reykjavik',
    name: 'Reykjavik',
    aliases: ['reykjavik', '레이캬비크'],
    region: 'Iceland',
    type: 'nature',
    lat: 64.1466,
    lng: -21.9426,
    priority: 8
  },
  {
    id: 'toulouse',
    name: 'Toulouse',
    aliases: ['toulouse', '툴루즈'],
    region: 'France',
    type: 'city',
    lat: 43.6047,
    lng: 1.4442,
    priority: 7
  },
  {
    id: 'palma-de-mallorca',
    name: 'Palma de Mallorca',
    aliases: ['palma de mallorca', 'palma', '팔마 데 마요르카'],
    region: 'Spain',
    type: 'resort',
    lat: 39.5696,
    lng: 2.6502,
    priority: 7
  },
  {
    id: 'genoa',
    name: 'Genoa',
    aliases: ['genoa', 'genova', '제노바'],
    region: 'Italy',
    type: 'city',
    lat: 44.4056,
    lng: 8.9463,
    priority: 7
  },
  {
    id: 'marrakech',
    name: 'Marrakech',
    aliases: ['marrakech', '마라케시'],
    region: 'Morocco',
    type: 'city',
    lat: 31.6295,
    lng: -7.9811,
    priority: 8
  },
  {
    id: 'cape-town',
    name: 'Cape Town',
    aliases: ['cape town', '케이프타운'],
    region: 'South Africa',
    type: 'city',
    lat: -33.9249,
    lng: 18.4241,
    priority: 9
  },
  {
    id: 'sydney',
    name: 'Sydney',
    aliases: ['sydney', '시드니'],
    region: 'Australia',
    type: 'city',
    lat: -33.8688,
    lng: 151.2093,
    priority: 9
  },
  {
    id: 'queenstown',
    name: 'Queenstown',
    aliases: ['queenstown', '퀸스타운'],
    region: 'New Zealand',
    type: 'nature',
    lat: -45.0312,
    lng: 168.6626,
    priority: 8
  },
  {
    id: 'rio-de-janeiro',
    name: 'Rio de Janeiro',
    aliases: ['rio de janeiro', 'rio', '리우데자네이루'],
    region: 'Brazil',
    type: 'city',
    lat: -22.9068,
    lng: -43.1729,
    priority: 9
  },
  {
    id: 'cusco',
    name: 'Cusco',
    aliases: ['cusco', '쿠스코'],
    region: 'Peru',
    type: 'nature',
    lat: -13.5319,
    lng: -71.9675,
    priority: 9
  },
  {
    id: 'san-francisco',
    name: 'San Francisco',
    aliases: ['san francisco', '샌프란시스코'],
    region: 'United States',
    type: 'city',
    lat: 37.7749,
    lng: -122.4194,
    priority: 8
  },
  {
    id: 'vancouver',
    name: 'Vancouver',
    aliases: ['vancouver', '밴쿠버'],
    region: 'Canada',
    type: 'city',
    lat: 49.2827,
    lng: -123.1207,
    priority: 8
  },
  {
    id: 'mexico-city',
    name: 'Mexico City',
    aliases: ['mexico city', '멕시코시티'],
    region: 'Mexico',
    type: 'city',
    lat: 19.4326,
    lng: -99.1332,
    priority: 8
  },
  {
    id: 'san-miguel-de-allende',
    name: 'San Miguel de Allende',
    aliases: ['san miguel de allende', '산미겔데아옌데'],
    region: 'Mexico',
    type: 'city',
    lat: 20.9144,
    lng: -100.7452,
    priority: 9
  },
  {
    id: 'havana',
    name: 'Havana',
    aliases: ['havana', '아바나'],
    region: 'Cuba',
    type: 'city',
    lat: 23.1136,
    lng: -82.3666,
    priority: 7
  },
  {
    id: 'honolulu',
    name: 'Honolulu',
    aliases: ['honolulu', 'hawaii', '호놀룰루', '하와이'],
    region: 'Hawaii',
    type: 'resort',
    lat: 21.3099,
    lng: -157.8581,
    priority: 9
  },
  {
    id: 'amsterdam',
    name: 'Amsterdam',
    aliases: ['amsterdam', '암스테르담'],
    region: 'Netherlands',
    type: 'city',
    lat: 52.3676,
    lng: 4.9041,
    priority: 8
  },
  {
    id: 'prague',
    name: 'Prague',
    aliases: ['prague', '프라하'],
    region: 'Czechia',
    type: 'city',
    lat: 50.0755,
    lng: 14.4378,
    priority: 8
  },
  {
    id: 'vienna',
    name: 'Vienna',
    aliases: ['vienna', '비엔나', '빈'],
    region: 'Austria',
    type: 'city',
    lat: 48.2082,
    lng: 16.3738,
    priority: 8
  },
  {
    id: 'lisbon',
    name: 'Lisbon',
    aliases: ['lisbon', '리스본'],
    region: 'Portugal',
    type: 'city',
    lat: 38.7223,
    lng: -9.1393,
    priority: 8
  },
  {
    id: 'venice',
    name: 'Venice',
    aliases: ['venice', '베네치아'],
    region: 'Italy',
    type: 'city',
    lat: 45.4408,
    lng: 12.3155,
    priority: 8
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    aliases: ['jaipur', '자이푸르'],
    region: 'India',
    type: 'city',
    lat: 26.9124,
    lng: 75.7873,
    priority: 7
  },
  {
    id: 'dubrovnik',
    name: 'Dubrovnik',
    aliases: ['dubrovnik', '두브로브니크'],
    region: 'Croatia',
    type: 'resort',
    lat: 42.6507,
    lng: 18.0944,
    priority: 7
  }
];

const createDestination = ([id, name, aliases, region, type, lat, lng, priority]) => ({
  id,
  name,
  aliases,
  region,
  type,
  lat,
  lng,
  priority
});

const COUNTRY_DESTINATION_ROWS = [
  ['los-angeles', 'Los Angeles', ['los angeles', 'la', '로스앤젤레스', '엘에이'], 'United States', 'city', 34.0522, -118.2437, 8],
  ['las-vegas', 'Las Vegas', ['las vegas', 'vegas', '라스베이거스'], 'United States', 'city', 36.1699, -115.1398, 8],
  ['chicago', 'Chicago', ['chicago', '시카고'], 'United States', 'city', 41.8781, -87.6298, 7],
  ['miami', 'Miami', ['miami', '마이애미'], 'United States', 'resort', 25.7617, -80.1918, 8],
  ['orlando', 'Orlando', ['orlando', '올랜도'], 'United States', 'city', 28.5383, -81.3792, 8],
  ['new-orleans', 'New Orleans', ['new orleans', '뉴올리언스'], 'United States', 'city', 29.9511, -90.0715, 7],
  ['santa-fe', 'Santa Fe', ['santa fe', '산타페'], 'United States', 'city', 35.687, -105.9378, 7],
  ['washington-dc', 'Washington DC', ['washington dc', 'washington', '워싱턴 DC', '워싱턴'], 'United States', 'city', 38.9072, -77.0369, 7],
  ['seattle', 'Seattle', ['seattle', '시애틀'], 'United States', 'city', 47.6062, -122.3321, 7],
  ['boston', 'Boston', ['boston', '보스턴'], 'United States', 'city', 42.3601, -71.0589, 7],
  ['toronto', 'Toronto', ['toronto', '토론토'], 'Canada', 'city', 43.6532, -79.3832, 7],
  ['montreal', 'Montreal', ['montreal', '몬트리올'], 'Canada', 'city', 45.5019, -73.5674, 7],
  ['quebec-city', 'Quebec City', ['quebec city', '퀘벡시티'], 'Canada', 'city', 46.8139, -71.208, 7],
  ['banff', 'Banff', ['banff', '밴프'], 'Canada', 'nature', 51.1784, -115.5708, 8],
  ['cancun', 'Cancun', ['cancun', '칸쿤'], 'Mexico', 'resort', 21.1619, -86.8515, 8],
  ['tulum', 'Tulum', ['tulum', '툴룸'], 'Mexico', 'resort', 20.2114, -87.4654, 7],
  ['oaxaca', 'Oaxaca', ['oaxaca', '오악사카'], 'Mexico', 'city', 17.0732, -96.7266, 7],
  ['punta-cana', 'Punta Cana', ['punta cana', '푼타카나'], 'Dominican Republic', 'resort', 18.5601, -68.3725, 7],
  ['nassau', 'Nassau', ['nassau', '나소'], 'Bahamas', 'resort', 25.0443, -77.3504, 7],
  ['turks-and-caicos', 'Turks and Caicos', ['turks and caicos', '터크스 케이커스'], 'Caribbean', 'resort', 21.694, -71.7979, 8],
  ['aruba', 'Aruba', ['aruba', '아루바'], 'Caribbean', 'resort', 12.5211, -69.9683, 7],
  ['berlin', 'Berlin', ['berlin', '베를린'], 'Germany', 'city', 52.52, 13.405, 7],
  ['munich', 'Munich', ['munich', 'muenchen', '뮌헨'], 'Germany', 'city', 48.1351, 11.582, 7],
  ['florence', 'Florence', ['florence', 'firenze', '피렌체'], 'Italy', 'city', 43.7696, 11.2558, 8],
  ['naples', 'Naples', ['naples', 'napoli', '나폴리'], 'Italy', 'city', 40.8518, 14.2681, 7],
  ['amalfi-coast', 'Amalfi Coast', ['amalfi coast', 'amalfi', '아말피 해안'], 'Italy', 'resort', 40.634, 14.6027, 8],
  ['palermo', 'Palermo', ['palermo', '팔레르모'], 'Italy', 'city', 38.1157, 13.3615, 7],
  ['nice', 'Nice', ['nice', '니스'], 'France', 'resort', 43.7102, 7.262, 7],
  ['lyon', 'Lyon', ['lyon', '리옹'], 'France', 'city', 45.764, 4.8357, 7],
  ['marseille', 'Marseille', ['marseille', '마르세유'], 'France', 'city', 43.2965, 5.3698, 7],
  ['seville', 'Seville', ['seville', 'sevilla', '세비야'], 'Spain', 'city', 37.3891, -5.9845, 7],
  ['granada', 'Granada', ['granada', '그라나다'], 'Spain', 'city', 37.1773, -3.5986, 7],
  ['valencia', 'Valencia', ['valencia', '발렌시아'], 'Spain', 'city', 39.4699, -0.3763, 7],
  ['ibiza', 'Ibiza', ['ibiza', '이비사'], 'Spain', 'resort', 38.9067, 1.4206, 7],
  ['zurich', 'Zurich', ['zurich', '취리히'], 'Switzerland', 'city', 47.3769, 8.5417, 7],
  ['interlaken', 'Interlaken', ['interlaken', '인터라켄'], 'Switzerland', 'nature', 46.6863, 7.8632, 8],
  ['lucerne', 'Lucerne', ['lucerne', '루체른'], 'Switzerland', 'city', 47.0502, 8.3093, 7],
  ['copenhagen', 'Copenhagen', ['copenhagen', '코펜하겐'], 'Denmark', 'city', 55.6761, 12.5683, 7],
  ['stockholm', 'Stockholm', ['stockholm', '스톡홀름'], 'Sweden', 'city', 59.3293, 18.0686, 7],
  ['oslo', 'Oslo', ['oslo', '오슬로'], 'Norway', 'city', 59.9139, 10.7522, 7],
  ['helsinki', 'Helsinki', ['helsinki', '헬싱키'], 'Finland', 'city', 60.1699, 24.9384, 7],
  ['athens', 'Athens', ['athens', '아테네'], 'Greece', 'city', 37.9838, 23.7275, 8],
  ['paros', 'Paros', ['paros', '파로스'], 'Greece', 'resort', 37.0856, 25.1488, 8],
  ['mykonos', 'Mykonos', ['mykonos', '미코노스'], 'Greece', 'resort', 37.4467, 25.3289, 7],
  ['budapest', 'Budapest', ['budapest', '부다페스트'], 'Hungary', 'city', 47.4979, 19.0402, 7],
  ['krakow', 'Krakow', ['krakow', '크라쿠프'], 'Poland', 'city', 50.0647, 19.945, 7],
  ['edinburgh', 'Edinburgh', ['edinburgh', '에든버러'], 'United Kingdom', 'city', 55.9533, -3.1883, 7],
  ['dublin', 'Dublin', ['dublin', '더블린'], 'Ireland', 'city', 53.3498, -6.2603, 7],
  ['bruges', 'Bruges', ['bruges', '브뤼헤'], 'Belgium', 'city', 51.2093, 3.2247, 7],
  ['antalya', 'Antalya', ['antalya', '안탈리아'], 'Turkiye', 'resort', 36.8969, 30.7133, 8],
  ['cappadocia', 'Cappadocia', ['cappadocia', '카파도키아'], 'Turkiye', 'nature', 38.6431, 34.8289, 8],
  ['mecca', 'Mecca', ['mecca', 'makkah', '메카'], 'Saudi Arabia', 'city', 21.3891, 39.8579, 8],
  ['medina', 'Medina', ['medina', '메디나'], 'Saudi Arabia', 'city', 24.5247, 39.5692, 7],
  ['abu-dhabi', 'Abu Dhabi', ['abu dhabi', '아부다비'], 'United Arab Emirates', 'city', 24.4539, 54.3773, 7],
  ['doha', 'Doha', ['doha', '도하'], 'Qatar', 'city', 25.2854, 51.531, 7],
  ['muscat', 'Muscat', ['muscat', '무스카트'], 'Oman', 'city', 23.588, 58.3829, 7],
  ['petra', 'Petra', ['petra', '페트라'], 'Jordan', 'nature', 30.3285, 35.4444, 8],
  ['luxor', 'Luxor', ['luxor', '룩소르'], 'Egypt', 'city', 25.6872, 32.6396, 7],
  ['sharm-el-sheikh', 'Sharm el-Sheikh', ['sharm el sheikh', '샤름엘셰이크'], 'Egypt', 'resort', 27.9158, 34.3299, 7],
  ['nairobi', 'Nairobi', ['nairobi', '나이로비'], 'Kenya', 'city', -1.2921, 36.8219, 7],
  ['zanzibar', 'Zanzibar', ['zanzibar', '잔지바르'], 'Tanzania', 'resort', -6.1659, 39.2026, 8],
  ['mauritius', 'Mauritius', ['mauritius', '모리셔스'], 'Indian Ocean', 'resort', -20.3484, 57.5522, 8],
  ['seychelles', 'Seychelles', ['seychelles', '세이셸'], 'Indian Ocean', 'resort', -4.6796, 55.492, 8],
  ['victoria-falls', 'Victoria Falls', ['victoria falls', '빅토리아 폭포'], 'Zimbabwe/Zambia', 'nature', -17.9243, 25.8572, 8],
  ['beijing', 'Beijing', ['beijing', '베이징'], 'China', 'city', 39.9042, 116.4074, 8],
  ['shanghai', 'Shanghai', ['shanghai', '상하이'], 'China', 'city', 31.2304, 121.4737, 8],
  ['xian', "Xi'an", ['xian', "xi'an", '시안'], 'China', 'city', 34.3416, 108.9398, 7],
  ['taipei', 'Taipei', ['taipei', '타이베이'], 'Taiwan', 'city', 25.033, 121.5654, 8],
  ['busan', 'Busan', ['busan', '부산'], 'South Korea', 'city', 35.1796, 129.0756, 7],
  ['jeju', 'Jeju', ['jeju', 'jeju-do', '제주', '제주도'], 'South Korea', 'resort', 33.4996, 126.5312, 8],
  ['hanoi', 'Hanoi', ['hanoi', '하노이'], 'Vietnam', 'city', 21.0278, 105.8342, 7],
  ['ho-chi-minh-city', 'Ho Chi Minh City', ['ho chi minh city', 'saigon', '호치민', '사이공'], 'Vietnam', 'city', 10.8231, 106.6297, 7],
  ['da-nang', 'Da Nang', ['da nang', 'danang', '다낭'], 'Vietnam', 'resort', 16.0544, 108.2022, 8],
  ['nha-trang', 'Nha Trang', ['nha trang', '나트랑'], 'Vietnam', 'resort', 12.2388, 109.1967, 7],
  ['ha-long-bay', 'Ha Long Bay', ['ha long bay', 'halong bay', '하롱베이'], 'Vietnam', 'nature', 20.9101, 107.1839, 8],
  ['manila', 'Manila', ['manila', '마닐라'], 'Philippines', 'city', 14.5995, 120.9842, 7],
  ['cebu', 'Cebu', ['cebu', '세부'], 'Philippines', 'resort', 10.3157, 123.8854, 8],
  ['boracay', 'Boracay', ['boracay', '보라카이'], 'Philippines', 'resort', 11.9674, 121.9248, 8],
  ['el-nido', 'El Nido', ['el nido', '엘니도'], 'Philippines', 'resort', 11.1956, 119.4075, 8],
  ['penang', 'Penang', ['penang', '페낭'], 'Malaysia', 'city', 5.4164, 100.3327, 7],
  ['langkawi', 'Langkawi', ['langkawi', '랑카위'], 'Malaysia', 'resort', 6.35, 99.8, 8],
  ['kota-kinabalu', 'Kota Kinabalu', ['kota kinabalu', '코타키나발루'], 'Malaysia', 'resort', 5.9804, 116.0735, 7],
  ['delhi', 'Delhi', ['delhi', 'new delhi', '델리', '뉴델리'], 'India', 'city', 28.6139, 77.209, 7],
  ['agra', 'Agra', ['agra', '아그라'], 'India', 'city', 27.1767, 78.0081, 8],
  ['mumbai', 'Mumbai', ['mumbai', '뭄바이'], 'India', 'city', 19.076, 72.8777, 7],
  ['varanasi', 'Varanasi', ['varanasi', '바라나시'], 'India', 'city', 25.3176, 82.9739, 7],
  ['goa', 'Goa', ['goa', '고아'], 'India', 'resort', 15.2993, 74.124, 7],
  ['kathmandu', 'Kathmandu', ['kathmandu', '카트만두'], 'Nepal', 'city', 27.7172, 85.324, 7],
  ['colombo', 'Colombo', ['colombo', '콜롬보'], 'Sri Lanka', 'city', 6.9271, 79.8612, 7],
  ['galle', 'Galle', ['galle', '갈레'], 'Sri Lanka', 'city', 6.0535, 80.221, 7],
  ['melbourne', 'Melbourne', ['melbourne', '멜버른'], 'Australia', 'city', -37.8136, 144.9631, 8],
  ['brisbane', 'Brisbane', ['brisbane', '브리즈번'], 'Australia', 'city', -27.4698, 153.0251, 7],
  ['gold-coast', 'Gold Coast', ['gold coast', '골드코스트'], 'Australia', 'resort', -28.0167, 153.4, 8],
  ['perth', 'Perth', ['perth', '퍼스'], 'Australia', 'city', -31.9523, 115.8613, 7],
  ['auckland', 'Auckland', ['auckland', '오클랜드'], 'New Zealand', 'city', -36.8509, 174.7645, 7],
  ['rotorua', 'Rotorua', ['rotorua', '로토루아'], 'New Zealand', 'nature', -38.1368, 176.2497, 7],
  ['bora-bora', 'Bora Bora', ['bora bora', '보라보라'], 'French Polynesia', 'resort', -16.5004, -151.7415, 8],
  ['nadi', 'Nadi', ['nadi', 'fiji', '난디', '피지'], 'Fiji', 'resort', -17.7765, 177.4356, 8],
  ['buenos-aires', 'Buenos Aires', ['buenos aires', '부에노스아이레스'], 'Argentina', 'city', -34.6037, -58.3816, 7],
  ['lima', 'Lima', ['lima', '리마'], 'Peru', 'city', -12.0464, -77.0428, 7],
  ['santiago', 'Santiago', ['santiago', '산티아고'], 'Chile', 'city', -33.4489, -70.6693, 7],
  ['cartagena', 'Cartagena', ['cartagena', '카르타헤나'], 'Colombia', 'city', 10.391, -75.4794, 7],
  ['medellin', 'Medellin', ['medellin', '메데인'], 'Colombia', 'city', 6.2442, -75.5812, 7],
  ['quito', 'Quito', ['quito', '키토'], 'Ecuador', 'city', -0.1807, -78.4678, 7],
  ['galapagos', 'Galapagos Islands', ['galapagos', '갈라파고스'], 'Ecuador', 'nature', -0.9538, -90.9656, 8]
];

export const WORLD_LIFE_LIST_DESTINATIONS = [
  ...BASE_WORLD_LIFE_LIST_DESTINATIONS,
  ...COUNTRY_DESTINATION_ROWS.map(createDestination)
];

const GLOBAL_VISIT_ORDER_BY_STATISTICS = [
  'bangkok',
  'hong-kong',
  'london',
  'macau',
  'istanbul',
  'dubai',
  'mecca',
  'antalya',
  'paris',
  'kuala-lumpur',
  'singapore',
  'new-york',
  'delhi',
  'phuket',
  'prague',
  'las-vegas',
  'miami',
  'barcelona',
  'taipei',
  'beijing',
  'los-angeles',
  'madrid',
  'budapest',
  'amsterdam',
  'vienna',
  'orlando',
  'ho-chi-minh-city',
  'berlin',
  'milan',
  'cairo',
  'nairobi',
  'dublin',
  'venice',
  'san-francisco',
  'tokyo',
  'osaka',
  'kyoto',
  'fukuoka',
  'sapporo',
  'nara',
  'hiroshima',
  'naha',
  'nagoya',
  'yokohama',
  'kobe',
  'kanazawa',
  'hakone',
  'nikko',
  'nagasaki',
  'beppu',
  'takayama',
  'kamakura',
  'sendai',
  'fujikawaguchiko',
  'rome',
  'seoul'
];

const GLOBAL_VISIT_RANK = new Map(
  GLOBAL_VISIT_ORDER_BY_STATISTICS.map((id, index) => [id, index + 1])
);

export const sortDestinationsByVisitDemand = (a, b) => {
  const rankA = GLOBAL_VISIT_RANK.get(a.id) || 10000;
  const rankB = GLOBAL_VISIT_RANK.get(b.id) || 10000;
  if (rankA !== rankB) return rankA - rankB;
  if (b.priority !== a.priority) return b.priority - a.priority;
  return a.name.localeCompare(b.name);
};

const KOREAN_DESTINATION_NAMES = {
  'barcelona': '바르셀로나',
  'havana': '아바나',
  'honolulu': '호놀룰루',
  'jaipur': '자이푸르',
  'lisbon': '리스본',
  'maldives': '몰디브',
  'mexico-city': '멕시코시티',
  'phuket': '푸켓',
  'prague': '프라하',
  'reykjavik': '레이캬비크',
  'santorini': '산토리니',
  'vancouver': '밴쿠버',
  'venice': '베네치아',
  'vienna': '빈'
};

export const normalizeDestinationName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const getDestinationSignature = (lat, lng) => {
  const safeLat = Number(lat);
  const safeLng = Number(lng);
  if (!Number.isFinite(safeLat) || !Number.isFinite(safeLng)) return '';
  return `${safeLat.toFixed(1)}:${safeLng.toFixed(1)}`;
};

export const getBilingualDestinationLabel = (destination) => {
  const koreanName = destination.aliases?.find(alias => /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(alias)) ||
    KOREAN_DESTINATION_NAMES[destination.id];
  if (!koreanName || koreanName === destination.name) return destination.name;
  return `${koreanName} / ${destination.name}`;
};
