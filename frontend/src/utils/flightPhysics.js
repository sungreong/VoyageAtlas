/**
 * Flight Physics Simulation Utilities
 * Provides realistic flight dynamics calculations for aircraft visualization
 */

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

/**
 * Quadratic ease-in: accelerating from zero velocity
 */
export function easeInQuad(t) {
  return t * t;
}

/**
 * Quadratic ease-out: decelerating to zero velocity
 */
export function easeOutQuad(t) {
  return t * (2 - t);
}

/**
 * Quadratic ease-in-out: acceleration until halfway, then deceleration
 */
export function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Linear interpolation between two values
 */
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

// ============================================================================
// FLIGHT PHASE DETECTION
// ============================================================================

export const FlightPhase = {
  TAKEOFF: 'TAKEOFF',   // 0-10%: Steep climb, increasing speed
  CLIMB: 'CLIMB',       // 10-20%: Gradual altitude gain, stabilizing speed
  CRUISE: 'CRUISE',     // 20-80%: Constant altitude, max speed
  DESCENT: 'DESCENT',   // 80-95%: Gradual altitude loss, reducing speed
  APPROACH: 'APPROACH'  // 95-100%: Steep descent, significant deceleration
};

/**
 * Determines current flight phase based on journey progress
 * @param {number} progress - Journey progress (0 to 1)
 * @returns {string} Flight phase constant
 */
export function calculateFlightPhase(progress) {
  if (progress < 0.1) return FlightPhase.TAKEOFF;
  if (progress < 0.2) return FlightPhase.CLIMB;
  if (progress < 0.8) return FlightPhase.CRUISE;
  if (progress < 0.95) return FlightPhase.DESCENT;
  return FlightPhase.APPROACH;
}

// ============================================================================
// ALTITUDE SIMULATION
// ============================================================================

/**
 * Calculates realistic altitude based on journey progress and distance
 * Short flights stay lower, long flights reach higher cruise altitudes
 *
 * @param {number} progress - Journey progress (0 to 1)
 * @param {number} totalDistance - Total flight distance in km
 * @returns {number} Altitude value for globe rendering (0.02 to 0.30)
 */
export function calculateAltitude(progress, totalDistance) {
  // Determine max cruise altitude based on flight distance
  // Short flights (<500km): max 0.15 altitude
  // Medium flights (500-2000km): max 0.20 altitude
  // Long flights (2000-6000km): max 0.25 altitude
  // Ultra-long flights (>6000km): max 0.30 altitude
  let maxAltitude;
  if (totalDistance < 500) {
    maxAltitude = 0.15;
  } else if (totalDistance < 2000) {
    maxAltitude = 0.18;
  } else if (totalDistance < 6000) {
    maxAltitude = 0.23;
  } else {
    maxAltitude = 0.28;
  }

  // Calculate altitude based on flight phase
  if (progress < 0.1) {
    // TAKEOFF: Steep climb using ease-out curve
    const t = progress / 0.1;
    return easeOutQuad(t) * maxAltitude * 0.4;
  } else if (progress < 0.2) {
    // CLIMB: Gradual climb to cruise altitude
    const t = (progress - 0.1) / 0.1;
    return lerp(maxAltitude * 0.4, maxAltitude, easeInOutQuad(t));
  } else if (progress < 0.8) {
    // CRUISE: Maintain constant altitude
    return maxAltitude;
  } else if (progress < 0.95) {
    // DESCENT: Gradual descent
    const t = (progress - 0.8) / 0.15;
    return lerp(maxAltitude, maxAltitude * 0.25, easeInQuad(t));
  } else {
    // APPROACH: Final steep descent
    const t = (progress - 0.95) / 0.05;
    return lerp(maxAltitude * 0.25, 0.02, easeInQuad(t));
  }
}

// ============================================================================
// BANKING ANGLE CALCULATION
// ============================================================================

/**
 * Normalizes angle delta to -180 to +180 range
 * @param {number} delta - Angle difference in degrees
 * @returns {number} Normalized angle delta
 */
function normalizeAngleDelta(delta) {
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

/**
 * Calculates realistic banking (roll) angle during turns
 * Commercial aircraft typically bank up to 25-30° in normal flight
 *
 * @param {number} currentHeading - Current heading in degrees (0-360)
 * @param {number} previousHeading - Previous heading in degrees (0-360)
 * @param {number} speedMultiplier - Current speed multiplier (0.5-1.0)
 * @returns {number} Bank angle in degrees (-30 to +30)
 */
export function calculateBankAngle(currentHeading, previousHeading, speedMultiplier = 1.0) {
  const headingChange = normalizeAngleDelta(currentHeading - previousHeading);

  // Real commercial aircraft bank up to 25-30° in normal flight
  const maxBank = 28;

  // Calculate bank angle proportional to heading change rate
  // Multiply by speed - faster aircraft bank more aggressively
  const bankAngle = Math.min(Math.abs(headingChange) * 12 * speedMultiplier, maxBank);

  // Return positive bank for right turn, negative for left turn
  return headingChange > 0 ? bankAngle : -bankAngle;
}

// ============================================================================
// PITCH ANGLE CALCULATION
// ============================================================================

/**
 * Calculates pitch angle (nose up/down) based on flight phase
 *
 * @param {number} progress - Journey progress (0 to 1)
 * @param {string} phase - Current flight phase
 * @returns {number} Pitch angle in degrees (-8 to +18)
 */
export function calculatePitch(progress, phase) {
  switch (phase) {
    case FlightPhase.TAKEOFF:
      // Steep nose-up during takeoff, gradually reducing
      const takeoffT = progress / 0.1;
      return lerp(18, 12, takeoffT);

    case FlightPhase.CLIMB:
      // Moderate nose-up during climb
      const climbT = (progress - 0.1) / 0.1;
      return lerp(12, 3, climbT);

    case FlightPhase.CRUISE:
      // Level flight with slight positive pitch
      return 2;

    case FlightPhase.DESCENT:
      // Slight nose-down during descent
      const descentT = (progress - 0.8) / 0.15;
      return lerp(2, -4, descentT);

    case FlightPhase.APPROACH:
      // Pronounced nose-down during final approach
      const approachT = (progress - 0.95) / 0.05;
      return lerp(-4, -8, approachT);

    default:
      return 0;
  }
}

// ============================================================================
// SPEED VARIATION CALCULATION
// ============================================================================

/**
 * Calculates speed variation throughout flight
 * Aircraft accelerate during takeoff, maintain speed during cruise,
 * and decelerate during descent
 *
 * @param {number} progress - Journey progress (0 to 1)
 * @param {number} baseSpeed - Base speed multiplier (typically 1.0)
 * @returns {number} Speed multiplier (0.5 to 1.1)
 */
export function calculateSpeed(progress, baseSpeed = 1.0) {
  if (progress < 0.1) {
    // TAKEOFF: Accelerating from 60% to 90% of cruise speed
    const t = progress / 0.1;
    return baseSpeed * lerp(0.6, 0.9, easeOutQuad(t));
  } else if (progress < 0.2) {
    // CLIMB: Final acceleration to cruise speed
    const t = (progress - 0.1) / 0.1;
    return baseSpeed * lerp(0.9, 1.05, t);
  } else if (progress < 0.8) {
    // CRUISE: Maintain max speed (slightly above base for efficiency)
    return baseSpeed * 1.05;
  } else if (progress < 0.95) {
    // DESCENT: Gradual deceleration
    const t = (progress - 0.8) / 0.15;
    return baseSpeed * lerp(1.05, 0.75, t);
  } else {
    // APPROACH: Significant deceleration for landing
    const t = (progress - 0.95) / 0.05;
    return baseSpeed * lerp(0.75, 0.45, easeInQuad(t));
  }
}

// ============================================================================
// AIRCRAFT TYPE SELECTION
// ============================================================================

export const AircraftType = {
  REGIONAL: 'regional',       // Small regional jets (CRJ, E-Jets)
  NARROWBODY: 'narrowbody',   // Single-aisle (A320, 737)
  WIDEBODY: 'widebody',       // Twin-aisle (777, A350)
  ULTRALONG: 'ultra-long'     // Ultra-long-range (A350-900ULR, 777-200LR)
};

/**
 * Selects appropriate aircraft type based on flight distance
 *
 * @param {number} distance - Flight distance in km
 * @returns {string} Aircraft type constant
 */
export function selectAircraftType(distance) {
  if (distance < 500) return AircraftType.REGIONAL;
  if (distance < 2000) return AircraftType.NARROWBODY;
  if (distance < 8000) return AircraftType.WIDEBODY;
  return AircraftType.ULTRALONG;
}

// ============================================================================
// DISTANCE CALCULATION
// ============================================================================

/**
 * Calculates great circle distance between two points on Earth
 * Uses Haversine formula
 *
 * @param {number} lat1 - Latitude of point 1 in degrees
 * @param {number} lng1 - Longitude of point 1 in degrees
 * @param {number} lat2 - Latitude of point 2 in degrees
 * @param {number} lng2 - Longitude of point 2 in degrees
 * @returns {number} Distance in kilometers
 */
export function getGreatCircleDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
