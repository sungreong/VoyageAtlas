import * as THREE from 'three';

const ENGINE_RINGS = [
  { count: 20, radius: 44, nodeRadius: 4.1, group: 'fixed' },
  { count: 10, radius: 27, nodeRadius: 4.9, group: 'gimbal', angleOffset: 0.18 },
  { count: 3, radius: 12, nodeRadius: 5.7, group: 'core' }
];

const fitText = (ctx, text, maxWidth) => {
  const value = String(text || '');
  if (ctx.measureText(value).width <= maxWidth) return value;

  let low = 0;
  let high = value.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (ctx.measureText(`${value.slice(0, mid)}...`).width <= maxWidth) low = mid;
    else high = mid - 1;
  }

  return `${value.slice(0, Math.max(1, low))}...`;
};

const roundRect = (ctx, x, y, width, height, radius) => {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
};

const clamp01 = (value) => Math.max(0, Math.min(1, value || 0));

const ringEngines = () => ENGINE_RINGS.flatMap((ring) => (
  Array.from({ length: ring.count }, (_, index) => {
    const angle = -Math.PI / 2 + (ring.angleOffset || 0) + (Math.PI * 2 * index) / ring.count;
    return {
      angle,
      group: ring.group,
      radius: ring.nodeRadius,
      cx: 60 + Math.cos(angle) * ring.radius,
      cy: 60 + Math.sin(angle) * ring.radius,
      index
    };
  })
));

const ENGINES = ringEngines();

const getPhaseBand = (progress) => {
  if (progress < 0.22) return 'boost';
  if (progress < 0.42) return 'maxq';
  if (progress < 0.72) return 'coast';
  return 'entry';
};

const getEnginePower = (engine, telemetry) => {
  const throttle = clamp01(telemetry.throttle);
  const phase = getPhaseBand(telemetry.progress || 0);
  const steeringAngle = (telemetry.headingRadians || 0) + Math.sin((telemetry.currentLat || 0) * 0.18 + (telemetry.currentLng || 0) * 0.11) * 0.38;
  const forwardLoad = Math.cos(engine.angle - steeringAngle) * 0.5 + 0.5;
  const brakingLoad = Math.cos(engine.angle - steeringAngle + Math.PI) * 0.5 + 0.5;
  const stablePulse = 0.94 + Math.sin((telemetry.currentLat || 0) * 0.09 + (telemetry.currentLng || 0) * 0.07 + engine.index * 2.4) * 0.06;

  let targetPower = 0.08;
  if (phase === 'boost') {
    targetPower = engine.group === 'fixed' ? 0.95 : engine.group === 'gimbal' ? 0.88 + forwardLoad * 0.08 : 0.76 + forwardLoad * 0.14;
  } else if (phase === 'maxq') {
    targetPower = engine.group === 'fixed' ? 0.55 : engine.group === 'gimbal' ? 0.64 + forwardLoad * 0.2 : 0.76 + forwardLoad * 0.14;
  } else if (phase === 'coast') {
    targetPower = engine.group === 'fixed' ? 0.18 : engine.group === 'gimbal' ? 0.36 + forwardLoad * 0.34 : 0.68 + forwardLoad * 0.24;
  } else {
    targetPower = engine.group === 'fixed' ? 0.24 + brakingLoad * 0.58 : engine.group === 'gimbal' ? 0.32 + brakingLoad * 0.5 : 0.72 + brakingLoad * 0.22;
  }

  const floor = engine.group === 'core' ? 0.56 : engine.group === 'gimbal' ? 0.34 : 0.26;
  return clamp01(Math.max(floor, targetPower * throttle * stablePulse));
};

const getAveragePower = (group, telemetry) => {
  const groupEngines = ENGINES.filter(engine => engine.group === group);
  return groupEngines.reduce((total, engine) => total + getEnginePower(engine, telemetry), 0) / groupEngines.length;
};

export const createScreenHudSprite = (width, height) => {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  }));
  sprite.frustumCulled = false;
  sprite.renderOrder = 999;
  sprite.userData = {
    canvas,
    ctx: canvas.getContext('2d'),
    height,
    pixelRatio,
    texture,
    width
  };

  return sprite;
};

export const disposeScreenHudSprite = (sprite) => {
  if (!sprite) return;
  sprite.parent?.remove(sprite);
  sprite.material?.map?.dispose();
  sprite.material?.dispose();
};

export const positionScreenHudSprite = (sprite, camera, dimensions, anchor, pixelHeight) => {
  if (!sprite || !camera || !dimensions.width || !dimensions.height) return;

  const distance = 72;
  const direction = new THREE.Vector3();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
  camera.getWorldDirection(direction);

  const fov = THREE.MathUtils.degToRad(camera.fov || 45);
  const viewHeight = 2 * Math.tan(fov / 2) * distance;
  const viewWidth = viewHeight * (dimensions.width / dimensions.height);
  const x = ((anchor.x ?? 0.5) - 0.5) * viewWidth;
  const y = (0.5 - (anchor.y ?? 0.5)) * viewHeight;
  const worldHeight = viewHeight * (pixelHeight / dimensions.height);
  const aspect = sprite.userData.width / sprite.userData.height;

  sprite.position.copy(camera.position)
    .add(direction.multiplyScalar(distance))
    .add(right.multiplyScalar(x))
    .add(up.multiplyScalar(y));
  sprite.quaternion.copy(camera.quaternion);
  sprite.scale.set(aspect * worldHeight, worldHeight, 1);
};

export const drawRouteHud = (sprite, route) => {
  const { canvas, ctx, pixelRatio, texture, width, height } = sprite.userData;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(4, 24, 34, 0.92)');
  gradient.addColorStop(1, 'rgba(3, 12, 20, 0.9)');

  ctx.shadowColor = 'rgba(74, 239, 255, 0.36)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = gradient;
  ctx.strokeStyle = 'rgba(74, 239, 255, 0.72)';
  ctx.lineWidth = 2;
  roundRect(ctx, 2, 2, width - 4, height - 4, 14);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.font = '900 29px "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4af5ff';
  ctx.fillText(fitText(ctx, `${route.fromName || '-'} → ${route.toName || '-'}`, width - 54), width / 2, 38);

  ctx.font = '700 15px "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  ctx.fillStyle = 'rgba(230, 244, 241, 0.84)';
  ctx.fillText(fitText(ctx, [route.dateLabel, route.transportLabel].filter(Boolean).join(' / '), width - 72), width / 2, 66);

  texture.needsUpdate = true;
};

export const drawStarshipHud = (sprite, telemetry) => {
  const { canvas, ctx, pixelRatio, texture, width, height } = sprite.userData;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, 'rgba(2, 4, 6, 0.94)');
  bg.addColorStop(1, 'rgba(8, 15, 18, 0.82)');
  ctx.fillStyle = bg;
  ctx.strokeStyle = 'rgba(246, 250, 244, 0.16)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 1, 1, width - 2, height - 2, 10);
  ctx.fill();
  ctx.stroke();

  const centerX = 72;
  const centerY = height / 2;
  ctx.save();
  ctx.translate(centerX - 60, centerY - 60);
  ctx.strokeStyle = 'rgba(245, 248, 241, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(60, 60, 52, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([3, 5]);
  ctx.strokeStyle = 'rgba(158, 207, 198, 0.18)';
  ctx.beginPath();
  ctx.arc(60, 60, 31, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const heading = telemetry.headingRadians || 0;
  ctx.strokeStyle = 'rgba(158, 207, 198, 0.46)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(60, 60);
  ctx.lineTo(60 + Math.sin(heading) * 42, 60 - Math.cos(heading) * 42);
  ctx.stroke();

  ENGINES.forEach((engine) => {
    const power = getEnginePower(engine, telemetry);
    ctx.fillStyle = `rgba(244, 247, 240, ${0.16 + power * 0.78})`;
    ctx.strokeStyle = power > 0.54 ? 'rgba(255, 238, 199, 0.98)' : 'rgba(255, 226, 168, 0.72)';
    ctx.lineWidth = power > 0.54 ? 2.7 : 2.2;
    ctx.shadowColor = power > 0.54 ? 'rgba(255, 226, 168, 0.9)' : 'rgba(255, 226, 168, 0.32)';
    ctx.shadowBlur = power > 0.54 ? 10 : 4;
    ctx.beginPath();
    ctx.arc(engine.cx, engine.cy, engine.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
  ctx.shadowBlur = 0;

  const metricX = 160;
  ctx.font = '900 18px "Orbitron", "Malgun Gothic", sans-serif';
  ctx.fillStyle = 'rgba(244, 247, 240, 0.9)';
  ctx.fillText('SPEED', metricX, 42);
  ctx.fillText('ALTITUDE', metricX, 82);

  ctx.font = '950 30px "Orbitron", "Malgun Gothic", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f7f8f1';
  ctx.fillText(Math.round(telemetry.speedKmh || 0).toLocaleString(), width - 62, 43);
  ctx.fillText(String(Math.round(telemetry.altitudeKm || 0)).padStart(2, '0'), width - 62, 83);

  ctx.font = '900 13px "Orbitron", "Malgun Gothic", sans-serif';
  ctx.fillStyle = 'rgba(244, 247, 240, 0.72)';
  ctx.fillText('KM/H', width - 16, 42);
  ctx.fillText('KM', width - 16, 82);
  ctx.textAlign = 'left';

  const drawFuel = (label, value, y, colorA, colorB) => {
    ctx.font = '900 16px "Orbitron", "Malgun Gothic", sans-serif';
    ctx.fillStyle = 'rgba(244, 247, 240, 0.9)';
    ctx.fillText(label, metricX, y + 4);
    ctx.fillStyle = 'rgba(244, 247, 240, 0.12)';
    roundRect(ctx, metricX + 54, y - 7, width - metricX - 74, 10, 6);
    ctx.fill();
    const bar = ctx.createLinearGradient(metricX + 54, y, width - 20, y);
    bar.addColorStop(0, colorA);
    bar.addColorStop(1, colorB);
    ctx.fillStyle = bar;
    roundRect(ctx, metricX + 54, y - 7, (width - metricX - 74) * clamp01(value), 10, 6);
    ctx.fill();
  };

  drawFuel('LOX', telemetry.lox, 118, '#f7f8f1', '#ffe2a8');
  drawFuel('CH4', telemetry.ch4, 148, '#dcecb8', '#9ecfc6');

  const powers = [
    ['FIXED', getAveragePower('fixed', telemetry), '#ffe2a8'],
    ['GIMBAL', getAveragePower('gimbal', telemetry), '#9ecfc6'],
    ['CORE', getAveragePower('core', telemetry), '#f7f8f1']
  ];
  powers.forEach(([label, value, color], index) => {
    const y = 178 + index * 13;
    ctx.font = '900 9px "Orbitron", "Malgun Gothic", sans-serif';
    ctx.fillStyle = 'rgba(244, 247, 240, 0.64)';
    ctx.fillText(label, metricX, y);
    ctx.fillStyle = 'rgba(244, 247, 240, 0.12)';
    ctx.fillRect(metricX + 58, y - 5, 120, 3);
    ctx.fillStyle = color;
    ctx.fillRect(metricX + 58, y - 5, 120 * clamp01(value), 3);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(value * 100)}%`, width - 20, y);
    ctx.textAlign = 'left';
  });

  texture.needsUpdate = true;
};
