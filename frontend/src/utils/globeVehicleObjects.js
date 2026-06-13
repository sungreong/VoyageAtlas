import * as THREE from 'three';
import { TRAVELER_ICONS } from '../assets/travelerIcons';

const getTravelerTexture = (mode, textureCache) => {
  const icon = TRAVELER_ICONS[mode] || TRAVELER_ICONS.plane;
  const cached = textureCache.current.get(mode);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(icon.rotation);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  const glow = ctx.createRadialGradient(128, 128, 16, 128, 128, 106);
  glow.addColorStop(0, icon.glow);
  glow.addColorStop(0.46, 'rgba(255, 255, 255, 0.12)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.current.set(mode, texture);

  if (icon.imageSrc) {
    const image = new Image();
    image.onload = () => {
      const iconScale = icon.textureScale || 0.78;
      const maxWidth = canvas.width * iconScale;
      const maxHeight = canvas.height * iconScale;
      const aspect = icon.imageAspect || (image.naturalWidth / image.naturalHeight) || 1;
      let width = maxWidth;
      let height = width / aspect;

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspect;
      }

      ctx.save();
      ctx.shadowColor = icon.accent;
      ctx.shadowBlur = 12;
      ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      ctx.restore();
      texture.needsUpdate = true;
    };
    image.src = icon.imageSrc;
    return texture;
  }

  const iconScale = icon.textureScale || 0.56;
  const offset = canvas.width * (1 - iconScale) / 2;

  ctx.save();
  ctx.translate(offset, offset);
  ctx.scale(iconScale * (canvas.width / icon.viewBox), iconScale * (canvas.height / icon.viewBox));
  if (icon.draw) {
    icon.draw(ctx);
  } else {
    const path = new Path2D(icon.path);
    ctx.shadowColor = icon.accent;
    ctx.shadowBlur = 20;
    ctx.fillStyle = icon.primary;
    ctx.fill(path);
    ctx.shadowBlur = 0;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = icon.accent;
    ctx.lineWidth = Math.max(12, icon.viewBox * 0.018);
    ctx.stroke(path);
  }
  ctx.restore();

  texture.needsUpdate = true;
  return texture;
};

const getStarshipEngineTexture = (textureCache) => {
  const cacheKey = '__starship_engine_plume_v3';
  const cached = textureCache.current.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const centerY = canvas.height / 2;

  const plume = ctx.createLinearGradient(0, centerY, canvas.width, centerY);
  plume.addColorStop(0, 'rgba(93, 227, 255, 0)');
  plume.addColorStop(0.28, 'rgba(93, 227, 255, 0.12)');
  plume.addColorStop(0.58, 'rgba(255, 206, 120, 0.34)');
  plume.addColorStop(0.84, 'rgba(255, 244, 202, 0.68)');
  plume.addColorStop(1, 'rgba(255, 255, 245, 0.8)');

  ctx.save();
  ctx.filter = 'blur(4px)';
  ctx.fillStyle = plume;
  ctx.beginPath();
  ctx.moveTo(10, centerY);
  ctx.bezierCurveTo(86, 28, 232, 44, 374, 54);
  ctx.bezierCurveTo(232, 72, 86, 100, 10, centerY);
  ctx.fill();
  ctx.restore();

  const core = ctx.createLinearGradient(52, centerY, canvas.width, centerY);
  core.addColorStop(0, 'rgba(64, 215, 255, 0)');
  core.addColorStop(0.5, 'rgba(123, 239, 255, 0.22)');
  core.addColorStop(0.8, 'rgba(255, 237, 184, 0.56)');
  core.addColorStop(1, 'rgba(255, 255, 248, 0.74)');

  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.moveTo(58, centerY);
  ctx.bezierCurveTo(134, 52, 260, 58, 378, 60);
  ctx.bezierCurveTo(260, 70, 134, 78, 58, centerY);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.current.set(cacheKey, texture);
  return texture;
};

const orientVehicleObject = (obj, vehicle, globeRadius, toGlobeVector) => {
  const lat = Number(vehicle.lat);
  const lng = Number(vehicle.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  const altitude = (vehicle.altitude || 0.2) + (vehicle.vehicleLift ?? 0.095);
  const position = toGlobeVector(lat, lng, altitude, globeRadius);
  const targetLat = Number.isFinite(Number(vehicle.targetLat)) ? Number(vehicle.targetLat) : lat;
  const targetLng = Number.isFinite(Number(vehicle.targetLng)) ? Number(vehicle.targetLng) : lng;
  const target = toGlobeVector(targetLat, targetLng, altitude, globeRadius);
  const normal = position.clone().normalize();
  const north = toGlobeVector(lat + 0.05, lng, altitude, globeRadius).sub(position).projectOnPlane(normal).normalize();
  const east = toGlobeVector(lat, lng + 0.05, altitude, globeRadius).sub(position).projectOnPlane(normal).normalize();
  const headingRad = Number.isFinite(Number(vehicle.heading)) ? Number(vehicle.heading) * Math.PI / 180 : null;
  const forward = headingRad === null
    ? target.sub(position).projectOnPlane(normal)
    : north.multiplyScalar(Math.cos(headingRad)).add(east.multiplyScalar(Math.sin(headingRad)));

  if (forward.lengthSq() < 0.0001) {
    forward.copy(normal.clone().cross(new THREE.Vector3(0, 1, 0)));
    if (forward.lengthSq() < 0.0001) forward.copy(new THREE.Vector3(1, 0, 0));
  }

  forward.normalize();
  const mode = vehicle.vehicleMode || 'plane';
  const headingOffset = TRAVELER_ICONS[mode]?.headingOffset || 0;
  if (headingOffset) forward.applyAxisAngle(normal, headingOffset).normalize();

  const lateral = new THREE.Vector3().crossVectors(normal, forward).normalize();
  const matrix = new THREE.Matrix4().makeBasis(forward, lateral, normal);
  matrix.setPosition(position);

  obj.matrixAutoUpdate = false;
  obj.matrix.copy(matrix);
  obj.matrixWorldNeedsUpdate = true;
};

const positionVehicleBillboard = (obj, vehicle, globeRadius, toGlobeVector) => {
  const lat = Number(vehicle.lat);
  const lng = Number(vehicle.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  obj.matrixAutoUpdate = true;
  obj.position.copy(toGlobeVector(lat, lng, (vehicle.altitude || 0.2) + (vehicle.vehicleLift ?? 0.11), globeRadius));
};

const disposeVehicleChildren = (group) => {
  group.children.forEach(child => {
    child.geometry?.dispose();
    if (Array.isArray(child.material)) child.material.forEach(material => material.dispose());
    else child.material?.dispose();
  });
  group.clear();
};

const applyVehicleRenderMode = (group, mode, textureCache) => {
  const icon = TRAVELER_ICONS[mode] || TRAVELER_ICONS.plane;
  disposeVehicleChildren(group);

  if (icon.renderMode === 'billboard') {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getTravelerTexture(mode, textureCache),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    }));
    sprite.scale.set(icon.scale, icon.scale, 1);
    sprite.renderOrder = 14;
    group.add(sprite);
    group.userData = { renderMode: icon.renderMode, vehicleMode: mode, iconSprite: sprite };
    return;
  }

  if (icon.renderMode === 'comet') {
    [
      { x: 2.1, radius: 0.7, color: 0xfff7df, opacity: 1 },
      { x: 1.05, radius: 0.52, color: 0xffd18a, opacity: 0.74 },
      { x: 0.1, radius: 0.38, color: 0xffa85f, opacity: 0.46 },
      { x: -0.75, radius: 0.25, color: 0x9ecfc6, opacity: 0.3 },
      { x: -1.45, radius: 0.16, color: 0x6be7ff, opacity: 0.2 }
    ].forEach(({ x, radius, color, opacity }, index) => {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 32, 16),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false
        })
      );
      particle.position.x = x;
      particle.renderOrder = 15 - index;
      group.add(particle);
    });

    const tail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.42, 3.2, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffc16d,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false
      })
    );
    tail.rotation.z = Math.PI / 2;
    tail.position.x = 0.2;
    tail.renderOrder = 10;
    group.add(tail);
    group.userData = { renderMode: icon.renderMode, vehicleMode: mode };
    return;
  }

  const material = new THREE.MeshBasicMaterial({
    map: getTravelerTexture(mode, textureCache),
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(icon.scale, icon.scale), material);
  mesh.renderOrder = 12;
  group.add(mesh);

  if (mode === 'starship') {
    const plumeMaterial = new THREE.MeshBasicMaterial({
      map: getStarshipEngineTexture(textureCache),
      transparent: true,
      opacity: 0.86,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const plume = new THREE.Mesh(new THREE.PlaneGeometry(icon.scale * 0.28, icon.scale * 0.12), plumeMaterial);
    plume.position.x = -icon.scale * 0.575;
    plume.position.z = -0.03;
    plume.renderOrder = 11;
    group.add(plume);

    group.userData = {
      renderMode: icon.renderMode,
      vehicleMode: mode,
      iconMesh: mesh,
      enginePlume: plume
    };
    return;
  }

  group.userData = { renderMode: icon.renderMode, vehicleMode: mode, iconMesh: mesh };
};

const updateStarshipEngine = (group, vehicle, icon) => {
  if (vehicle.vehicleMode !== 'starship') return;

  const plume = group.userData?.enginePlume;
  if (!plume) return;

  const progress = Number.isFinite(Number(vehicle.progress)) ? Number(vehicle.progress) : 0.5;
  const liftBias = progress < 0.18 || progress > 0.82 ? 1.04 : 0.88;
  const pulse = 0.5 + Math.sin(performance.now() * 0.018) * 0.5;
  const stretch = liftBias + pulse * 0.08;
  const widthPulse = 0.84 + pulse * 0.08;

  plume.scale.set(stretch, widthPulse, 1);
  plume.position.x = -icon.scale * (0.575 + pulse * 0.01);
  plume.material.opacity = 0.42 + pulse * 0.14;
};

const updateLandingPresentation = (group, vehicle, icon) => {
  const landingProgress = Math.max(0, Math.min(1, Number(vehicle.landingProgress || 0)));
  const vehicleScale = 1 - landingProgress * 0.42;
  const vehicleOpacity = 1 - landingProgress * 0.24;
  const mesh = group.userData?.iconMesh;
  const sprite = group.userData?.iconSprite;

  if (mesh) {
    mesh.scale.setScalar(vehicleScale);
    if (mesh.material) mesh.material.opacity = vehicleOpacity;
  }

  if (sprite) {
    sprite.scale.set(icon.scale * vehicleScale, icon.scale * vehicleScale, 1);
    if (sprite.material) sprite.material.opacity = vehicleOpacity;
  }

  if (group.userData?.enginePlume?.material) {
    group.userData.enginePlume.material.opacity *= 1 - landingProgress * 0.36;
  }
};

export const updateVehicleObject = (obj, vehicle, globeRadius, toGlobeVector, textureCache) => {
  const mode = vehicle.vehicleMode || 'plane';
  const icon = TRAVELER_ICONS[mode] || TRAVELER_ICONS.plane;

  if (obj.userData?.vehicleMode !== mode || obj.userData?.renderMode !== icon.renderMode) {
    applyVehicleRenderMode(obj, mode, textureCache);
  }

  if (icon.renderMode === 'billboard') positionVehicleBillboard(obj, vehicle, globeRadius, toGlobeVector);
  else orientVehicleObject(obj, vehicle, globeRadius, toGlobeVector);
  updateStarshipEngine(obj, { ...vehicle, vehicleMode: mode }, icon);
  updateLandingPresentation(obj, vehicle, icon);

  obj.renderOrder = 12;
  obj.userData = { ...obj.userData, ...vehicle, type: 'vehicle', vehicleMode: mode };
};

export const createVehicleObject = (vehicle, globeRadius, toGlobeVector, textureCache) => {
  const mode = vehicle.vehicleMode || 'plane';
  const group = new THREE.Group();
  group.renderOrder = 12;
  applyVehicleRenderMode(group, mode, textureCache);
  updateVehicleObject(group, vehicle, globeRadius, toGlobeVector, textureCache);
  return group;
};
