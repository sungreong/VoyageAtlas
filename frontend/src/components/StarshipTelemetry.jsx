import React from 'react';
import './StarshipTelemetry.css';

const ring = (count, radius, startAngle = -Math.PI / 2) => (
  Array.from({ length: count }, (_, index) => {
    const angle = startAngle + (Math.PI * 2 * index) / count;
    return {
      index,
      angle,
      cx: 60 + Math.cos(angle) * radius,
      cy: 60 + Math.sin(angle) * radius
    };
  })
);

const ENGINES = [
  ...ring(20, 44).map(engine => ({ ...engine, radius: 4.1, group: 'fixed', role: 'Fixed ring' })),
  ...ring(10, 27, -Math.PI / 2 + 0.18).map(engine => ({ ...engine, radius: 4.9, group: 'gimbal', role: 'Gimbal ring', index: engine.index + 20 })),
  ...ring(3, 12, -Math.PI / 2).map(engine => ({ ...engine, radius: 5.7, group: 'core', role: 'Core trim', index: engine.index + 30 }))
];

const clampPercent = (value) => `${Math.max(0, Math.min(100, Math.round(value * 100)))}%`;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (edge0, edge1, value) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const getPhaseBand = (progress) => {
  if (progress < 0.22) return 'boost';
  if (progress < 0.42) return 'maxq';
  if (progress < 0.72) return 'coast';
  return 'entry';
};

const getSteeringModel = (telemetry) => {
  const currentLat = telemetry.currentLat || 0;
  const currentLng = telemetry.currentLng || 0;
  const headingRadians = telemetry.headingRadians || 0;
  const steeringBias = Math.sin(currentLat * 0.18 + currentLng * 0.11) * 0.38;
  const steeringAngle = headingRadians + steeringBias;
  const turnCommand = Math.sin(steeringAngle) * 0.72 + Math.sin(currentLng * 0.08 + currentLat * 0.03) * 0.28;
  return { currentLat, currentLng, steeringAngle, turnCommand };
};

const getIgnitionGate = (engine, telemetry) => {
  if (engine.group === 'core') return 1;

  const progress = telemetry.progress || 0;
  const { currentLat, currentLng, steeringAngle, turnCommand } = getSteeringModel(telemetry);
  const lateralSide = Math.sin(engine.angle - steeringAngle);
  const coordinateSide = Math.sin(currentLng * 0.12 - currentLat * 0.05);
  const turnSide = Math.sign(turnCommand || coordinateSide || 1);

  const delayedSide = Math.sign(lateralSide || 1) !== turnSide;
  if (!delayedSide) return 1;

  const coordinateDelay = (Math.sin(currentLat * 0.21 + currentLng * 0.13 + engine.index * 0.67) * 0.5 + 0.5) * 0.22;
  const baseDelay = engine.group === 'gimbal' ? 0.22 : 0.34;
  const release = smoothstep(baseDelay + coordinateDelay, baseDelay + coordinateDelay + 0.32, progress);
  const keepAlive = engine.group === 'gimbal' ? 0.03 : 0.01;
  return keepAlive + release * (1 - keepAlive);
};

const getEnginePower = (engine, telemetry, throttle) => {
  const progress = telemetry.progress || 0;
  const phase = getPhaseBand(progress);
  const { currentLat, currentLng, steeringAngle } = getSteeringModel(telemetry);
  const forwardLoad = Math.cos(engine.angle - steeringAngle) * 0.5 + 0.5;
  const brakingLoad = Math.cos(engine.angle - steeringAngle + Math.PI) * 0.5 + 0.5;
  const stablePulse = 0.94 + Math.sin(currentLat * 0.09 + currentLng * 0.07 + engine.index * 2.4) * 0.06;
  const pairedBalance = engine.group === 'fixed'
    ? 0.92 + (engine.index % 2 === 0 ? 0.04 : -0.04)
    : 1;

  let targetPower = 0.08;
  if (phase === 'boost') {
    targetPower = engine.group === 'fixed' ? 0.95 : engine.group === 'gimbal' ? 0.82 + forwardLoad * 0.14 : 0.72 + forwardLoad * 0.18;
  } else if (phase === 'maxq') {
    targetPower = engine.group === 'fixed' ? 0.55 : engine.group === 'gimbal' ? 0.64 + forwardLoad * 0.2 : 0.76 + forwardLoad * 0.14;
  } else if (phase === 'coast') {
    targetPower = engine.group === 'fixed' ? 0.18 : engine.group === 'gimbal' ? 0.36 + forwardLoad * 0.34 : 0.68 + forwardLoad * 0.24;
  } else {
    targetPower = engine.group === 'fixed' ? 0.24 + brakingLoad * 0.58 : engine.group === 'gimbal' ? 0.32 + brakingLoad * 0.5 : 0.72 + brakingLoad * 0.22;
  }

  const gate = getIgnitionGate(engine, telemetry);
  const idleFloor = engine.group === 'core' ? 0.56 : engine.group === 'gimbal' ? 0.18 * gate : 0.1 * gate;
  return clamp01(Math.max(idleFloor, targetPower * throttle * stablePulse * pairedBalance * gate));
};

const getAveragePower = (group, telemetry, throttle) => {
  const engines = ENGINES.filter(engine => engine.group === group);
  if (!engines.length) return 0;
  return engines.reduce((total, engine) => total + getEnginePower(engine, telemetry, throttle), 0) / engines.length;
};

export default function StarshipTelemetry({ visible, telemetry }) {
  if (!visible || !telemetry) return null;

  const throttle = Math.max(0, Math.min(1, telemetry.throttle || 0));
  const progress = Math.max(0, Math.min(1, telemetry.progress || 0));
  const loxFill = clampPercent(telemetry.lox ?? 0);
  const ch4Fill = clampPercent(telemetry.ch4 ?? 0);
  const headingRadians = telemetry.headingRadians || 0;
  const vectorTip = {
    x: 60 + Math.sin(headingRadians) * 42,
    y: 60 - Math.cos(headingRadians) * 42
  };
  const groupPower = {
    fixed: getAveragePower('fixed', telemetry, throttle),
    gimbal: getAveragePower('gimbal', telemetry, throttle),
    core: getAveragePower('core', telemetry, throttle)
  };

  return (
    <aside className="starship-telemetry" aria-label="Starship engine telemetry">
      <div className="engine-stack">
        <svg className="starship-engine-map" viewBox="0 0 120 120" role="img" aria-label="Engine output cluster">
          <circle className="engine-reticle" cx="60" cy="60" r="52" />
          <circle className="engine-reticle faint" cx="60" cy="60" r="31" />
          <line className="engine-vector" x1="60" y1="60" x2={vectorTip.x} y2={vectorTip.y} />
          {ENGINES.map(engine => {
            const power = getEnginePower(engine, telemetry, throttle);
            return (
              <circle
                key={`${engine.group}-${engine.index}`}
                className={`engine-node ${power > 0.08 ? 'armed' : ''} ${power > 0.18 ? 'lit' : ''} ${power > 0.54 ? 'hot' : ''}`}
                cx={engine.cx}
                cy={engine.cy}
                r={engine.radius}
                style={{
                  '--engine-alpha': 0.16 + power * 0.84,
                  '--engine-heat': power
                }}
              />
            );
          })}
        </svg>
      </div>

      <div className="starship-metrics">
        <div className="metric-row">
          <span>SPEED</span>
          <strong>{Math.round(telemetry.speedKmh).toLocaleString()}</strong>
          <small>KM/H</small>
        </div>
        <div className="metric-row">
          <span>ALTITUDE</span>
          <strong>{Math.round(telemetry.altitudeKm)}</strong>
          <small>KM</small>
        </div>
        <div className="fuel-row">
          <span>LOX</span>
          <div className="fuel-bar" aria-hidden="true">
            <i style={{ width: loxFill }} />
          </div>
        </div>
        <div className="fuel-row">
          <span>CH4</span>
          <div className="fuel-bar methane" aria-hidden="true">
            <i style={{ width: ch4Fill }} />
          </div>
        </div>
        <div className="telemetry-phase">
          <span>{telemetry.phase}</span>
          <i style={{ transform: `scaleX(${Math.max(0.08, throttle)})` }} />
        </div>
        <div className="engine-output-grid" aria-label="Engine group output">
          {[
            ['FIXED', groupPower.fixed, 'fixed'],
            ['GIMBAL', groupPower.gimbal, 'gimbal'],
            ['CORE', groupPower.core, 'core']
          ].map(([label, power, tone]) => (
            <div className="engine-output-row" key={label}>
              <span>{label}</span>
              <b><i className={tone} style={{ transform: `scaleX(${Math.max(0.04, power)})` }} /></b>
              <em>{Math.round(power * 100)}%</em>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
