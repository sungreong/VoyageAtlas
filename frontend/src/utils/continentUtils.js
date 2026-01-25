
/**
 * Determines the continent for a given latitude and longitude.
 * This uses simplified bounding boxes and logic.
 * 
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 * @returns {string} Continent Name (Asia, Europe, Africa, North America, South America, Oceania, Antarctica)
 */
export const getContinent = (lat, lng) => {
    // 1. Antarctica
    if (lat < -60) return "Antarctica";

    // 2. Oceania (Simplified: Australia, NZ, Pacific Islands)
    // Approx: Lat < 0, Lng > 110 (Excluding parts of Indo which might be Asia, but keep simple)
    // Refinement for Australia/NZ
    if (lat < 0 && lat > -50 && lng > 110 && lng < 180) {
        return "Oceania";
    }

    // 3. North America
    // Approx: Lat > 15 (Panama canal is roughly 9N, but lets stick to geographical simple split)
    // Actually, Panama border is around 7-9N.
    // Lng < -30 (Greenland is NA) and > -170
    if (lat > 12 && lng < -30 && lng > -170) {
        return "North America";
    }

    // 4. South America
    // Lat < 12 and Lng < -30
    if (lat <= 12 && lng < -30) {
        return "South America";
    }

    // 5. Europe
    // Lat > 35, Lng > -30 and Lng < 60 (Rough Ural mountains)
    // Note: Turkey/mid-east complexity.
    if (lat > 35 && lng > -30 && lng < 60) {
        return "Europe";
    }

    // 6. Africa
    // Lat between 35 and -35? Lng between -20 and 60?
    // Bounded by Mediterreanean (Lat 35)
    if (lat <= 35 && lat > -40 && lng > -20 && lng < 60) {
        return "Africa";
    }

    // 7. Asia
    // Everything else (Russia east of Urals, Middle East, India, China, SE Asia)
    return "Asia";
};
