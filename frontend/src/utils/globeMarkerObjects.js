import * as THREE from 'three';

const FONT_STACK = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

const getPixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);

const roundRect = (ctx, x, y, width, height, radius) => {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
};

const getMarkerAltitude = (item, markerStyle) => {
  const shape = markerStyle.markerShape || 'pin';
  if (item.type === 'world-highlight') return 0.024;
  if (shape === 'landmark') return item.active ? 0.07 : 0.044;
  if (shape === 'flag') return item.active ? 0.064 : 0.038;
  if (shape === 'beacon') return item.active ? 0.052 : 0.032;
  if (shape === 'pin') return item.active ? 0.06 : 0.036;
  return item.active ? 0.035 : item.focusMode ? 0.016 : 0.022;
};

const getRenderOrder = (item) => {
  if (item.type === 'world-highlight') return 5;
  if (item.active) return 24;
  return item.focusMode ? 20 : 12;
};

const prepareCanvas = (width, height) => {
  const pixelRatio = getPixelRatio();
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * pixelRatio);
  canvas.height = Math.ceil(height * pixelRatio);
  const ctx = canvas.getContext('2d');
  ctx.scale(pixelRatio, pixelRatio);
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return { canvas, ctx };
};

const measureText = (text, fontSize) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `700 ${fontSize}px ${FONT_STACK}`;
  return Math.ceil(ctx.measureText(text).width);
};

const clampLabel = (text) => {
  const normalized = String(text || '');
  return normalized.length > 18 ? `${normalized.slice(0, 17)}...` : normalized;
};

const drawLabelCapsule = (ctx, text, x, y, width, height, theme, active) => {
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = active ? 'rgba(58, 39, 18, 0.76)' : 'rgba(4, 13, 17, 0.78)';
  ctx.strokeStyle = active ? 'rgba(255, 226, 168, 0.72)' : 'rgba(158, 207, 198, 0.45)';
  ctx.lineWidth = 1.6;
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = active ? theme.activeLabelText : theme.labelText;
  ctx.fillText(text, x + 10, y + height / 2 + 1);
};

const drawClassicLabel = ({ text, item, theme, fontSize, markerStyle }) => {
  const worldHighlight = item.type === 'world-highlight';
  const active = Boolean(item.active);
  const focusMode = Boolean(item.focusMode);
  const paddingX = worldHighlight ? 10 : active ? 18 : focusMode ? 12 : 13;
  const paddingY = worldHighlight ? 6 : active ? 10 : focusMode ? 7 : 8;
  const dotSize = worldHighlight ? 7 : active ? 14 : focusMode ? 8 : 10;
  const textWidth = measureText(text, fontSize);
  const width = Math.max(worldHighlight ? 68 : 72, textWidth + paddingX * 2 + dotSize + (worldHighlight ? 8 : 10));
  const height = fontSize + paddingY * 2;
  const { canvas, ctx } = prepareCanvas(width, height);

  ctx.font = `700 ${fontSize}px ${FONT_STACK}`;
  ctx.fillStyle = worldHighlight ? 'rgba(24, 22, 15, 0.48)' : active ? theme.activeLabelFill : theme.labelFill;
  ctx.strokeStyle = worldHighlight ? 'rgba(255, 226, 168, 0.38)' : active ? theme.activeLabelStroke : theme.labelStroke;
  ctx.lineWidth = 2;
  if (worldHighlight) ctx.setLineDash([4, 4]);
  roundRect(ctx, 1, 1, width - 2, height - 2, worldHighlight ? 12 : 9);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = worldHighlight ? 'rgba(255, 226, 168, 0.22)' : active ? theme.activeMarker : theme.marker;
  ctx.strokeStyle = worldHighlight ? 'rgba(255, 226, 168, 0.82)' : ctx.fillStyle;
  ctx.lineWidth = worldHighlight ? 2 : 1;
  ctx.beginPath();
  ctx.arc(paddingX, height / 2, dotSize / 2, 0, Math.PI * 2);
  if (worldHighlight) ctx.stroke();
  else ctx.fill();

  ctx.fillStyle = worldHighlight ? 'rgba(255, 244, 205, 0.78)' : active ? theme.activeLabelText : theme.labelText;
  ctx.fillText(text, paddingX + dotSize + 9, height / 2 + 1);

  const spriteHeight = (worldHighlight ? focusMode ? 1.58 : 1.75 : active ? 3.9 : focusMode ? 2.35 : 2.55) * markerStyle.labelScale;
  return { canvas, width, height, spriteHeight };
};

const drawTextGlow = (ctx, text, x, y, color, shadowColor) => {
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
};

const drawPinMarker = ({ text, item, theme, fontSize, markerStyle }) => {
  const active = Boolean(item.active);
  const label = clampLabel(text);
  const iconSize = active ? 54 : 46;
  const labelFontSize = Math.max(13, Math.round(fontSize * 0.92));
  const textWidth = measureText(label, labelFontSize);
  const width = Math.max(130, textWidth + 30, iconSize + 26);
  const height = active ? 102 : 88;
  const { canvas, ctx } = prepareCanvas(width, height);
  const pinX = width / 2;
  const pinY = active ? 31 : 28;
  const radius = active ? 24 : 20;
  const pinColor = active ? theme.activeMarker : theme.marker;

  ctx.font = `900 ${labelFontSize}px ${FONT_STACK}`;
  ctx.fillStyle = 'rgba(2, 8, 12, 0.46)';
  ctx.beginPath();
  ctx.ellipse(pinX, height - 18, radius * 0.86, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = active ? 'rgba(255, 226, 168, 0.82)' : 'rgba(126, 214, 226, 0.68)';
  ctx.shadowBlur = active ? 28 : 22;
  ctx.fillStyle = pinColor;
  ctx.beginPath();
  ctx.arc(pinX, pinY, radius, 0, Math.PI * 2);
  ctx.moveTo(pinX - radius * 0.58, pinY + radius * 0.62);
  ctx.lineTo(pinX, active ? 72 : 64);
  ctx.lineTo(pinX + radius * 0.58, pinY + radius * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = active ? 'rgba(255, 247, 223, 0.92)' : 'rgba(237, 249, 243, 0.78)';
  ctx.lineWidth = active ? 3 : 2.4;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(5, 18, 24, 0.82)';
  ctx.beginPath();
  ctx.arc(pinX, pinY, active ? 8 : 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = active ? 'rgba(255, 247, 223, 0.92)' : 'rgba(237, 249, 243, 0.86)';
  ctx.beginPath();
  ctx.arc(pinX, pinY, active ? 3.2 : 2.6, 0, Math.PI * 2);
  ctx.fill();
  drawLabelCapsule(ctx, label, (width - textWidth - 20) / 2, height - 28, textWidth + 20, 23, theme, active);

  const spriteHeight = (active ? 10.4 : item.focusMode ? 8.4 : 7.6) * markerStyle.labelScale;
  return { canvas, width, height, spriteHeight };
};

const drawFlagMarker = ({ text, item, theme, fontSize, markerStyle }) => {
  const active = Boolean(item.active);
  const label = clampLabel(text);
  const labelFontSize = Math.max(13, Math.round(fontSize * 0.92));
  const textWidth = measureText(label, labelFontSize);
  const width = Math.max(136, textWidth + 34);
  const height = active ? 106 : 94;
  const { canvas, ctx } = prepareCanvas(width, height);
  const poleX = width / 2 - 27;
  const poleTop = 12;
  const poleBottom = active ? 76 : 68;
  const flagColor = active ? theme.activeMarker : theme.marker;

  ctx.font = `900 ${labelFontSize}px ${FONT_STACK}`;
  ctx.strokeStyle = 'rgba(237, 249, 243, 0.88)';
  ctx.lineWidth = active ? 3.2 : 2.8;
  ctx.beginPath();
  ctx.moveTo(poleX, poleTop);
  ctx.lineTo(poleX, poleBottom);
  ctx.stroke();

  ctx.shadowColor = active ? 'rgba(255, 226, 168, 0.82)' : 'rgba(126, 214, 226, 0.62)';
  ctx.shadowBlur = active ? 26 : 20;
  ctx.fillStyle = flagColor;
  ctx.beginPath();
  ctx.moveTo(poleX + 2, poleTop + 1);
  ctx.lineTo(poleX + 56, poleTop + 7);
  ctx.lineTo(poleX + 46, poleTop + 36);
  ctx.lineTo(poleX + 2, poleTop + 29);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = active ? 'rgba(255, 247, 223, 0.86)' : 'rgba(237, 249, 243, 0.58)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(237, 249, 243, 0.28)';
  ctx.beginPath();
  ctx.ellipse(poleX + 4, poleBottom + 3, 24, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  drawLabelCapsule(ctx, label, (width - textWidth - 20) / 2, height - 30, textWidth + 20, 23, theme, active);

  const spriteHeight = (active ? 10.8 : item.focusMode ? 8.55 : 7.85) * markerStyle.labelScale;
  return { canvas, width, height, spriteHeight };
};

const drawLandmarkMarker = ({ text, item, theme, fontSize, markerStyle }) => {
  const active = Boolean(item.active);
  const label = clampLabel(text);
  const labelFontSize = Math.max(13, Math.round(fontSize * 0.9));
  const textWidth = measureText(label, labelFontSize);
  const width = Math.max(142, textWidth + 34);
  const height = active ? 112 : 100;
  const { canvas, ctx } = prepareCanvas(width, height);
  const cx = width / 2;
  const iconTop = 10;
  const iconColor = active ? theme.activeMarker : theme.marker;

  ctx.font = `900 ${labelFontSize}px ${FONT_STACK}`;
  ctx.shadowColor = active ? 'rgba(255, 226, 168, 0.76)' : 'rgba(126, 214, 226, 0.62)';
  ctx.shadowBlur = active ? 28 : 22;
  ctx.fillStyle = iconColor;
  ctx.beginPath();
  ctx.moveTo(cx, iconTop);
  ctx.lineTo(cx - 34, iconTop + 25);
  ctx.lineTo(cx + 34, iconTop + 25);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - 29, iconTop + 31, 58, 6);
  [-18, -6, 6, 18].forEach(offset => {
    roundRect(ctx, cx + offset - 3, iconTop + 42, 6, 26, 3);
    ctx.fill();
  });
  ctx.fillRect(cx - 36, iconTop + 74, 72, 6);
  ctx.strokeStyle = active ? 'rgba(255, 247, 223, 0.82)' : 'rgba(237, 249, 243, 0.56)';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - 29, iconTop + 31, 58, 6);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(237, 249, 243, 0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, height - 17, 36, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  drawLabelCapsule(ctx, label, (width - textWidth - 20) / 2, height - 30, textWidth + 20, 23, theme, active);

  const spriteHeight = (active ? 11.2 : item.focusMode ? 8.9 : 8.15) * markerStyle.labelScale;
  return { canvas, width, height, spriteHeight };
};

const drawBeaconMarker = ({ text, item, theme, fontSize, markerStyle }) => {
  const active = Boolean(item.active);
  const textWidth = measureText(text, fontSize);
  const width = Math.max(108, textWidth + 56);
  const height = active ? 60 : 52;
  const { canvas, ctx } = prepareCanvas(width, height);
  const cx = 22;
  const cy = height / 2;
  const color = active ? theme.activeMarker : theme.marker;

  ctx.font = `800 ${fontSize}px ${FONT_STACK}`;
  ctx.strokeStyle = color;
  ctx.lineWidth = active ? 2.2 : 1.6;
  ctx.shadowColor = active ? 'rgba(255, 226, 168, 0.5)' : 'rgba(126, 214, 226, 0.36)';
  ctx.shadowBlur = active ? 14 : 9;
  [8, 15].forEach(radius => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI * 0.72, Math.PI * 0.72);
    ctx.stroke();
  });
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, active ? 5 : 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  drawTextGlow(ctx, text, 48, cy + 1, active ? theme.activeLabelText : theme.labelText, 'rgba(0, 0, 0, 0.68)');

  const spriteHeight = (active ? 7.4 : item.focusMode ? 5.9 : 5.35) * markerStyle.labelScale;
  return { canvas, width, height, spriteHeight };
};

const drawMarkerCanvas = (item, theme, markerStyle) => {
  const text = item.label || item.name || '';
  const active = Boolean(item.active);
  const focusMode = Boolean(item.focusMode);
  const worldHighlight = item.type === 'world-highlight';
  const fontSize = Math.round((worldHighlight ? focusMode ? 12 : 13 : active ? 23 : focusMode ? 17 : 18) * markerStyle.labelScale);
  const args = { text, item, theme, fontSize, markerStyle };

  if (worldHighlight || markerStyle.markerShape === 'label') return drawClassicLabel(args);
  if (markerStyle.markerShape === 'flag') return drawFlagMarker(args);
  if (markerStyle.markerShape === 'landmark') return drawLandmarkMarker(args);
  if (markerStyle.markerShape === 'beacon') return drawBeaconMarker(args);
  return drawPinMarker(args);
};

export const createGlobeMarkerObject = (item, globeRadius, toGlobeVector, theme, markerStyle) => {
  const { canvas, width, height, spriteHeight } = drawMarkerCanvas(item, theme, markerStyle);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set((width / height) * spriteHeight, spriteHeight, 1);
  sprite.position.copy(toGlobeVector(item.lat, item.lng, getMarkerAltitude(item, markerStyle), globeRadius));
  sprite.renderOrder = getRenderOrder(item);
  sprite.userData = item;

  return sprite;
};

export const updateGlobeMarkerObject = (obj, item, globeRadius, toGlobeVector, theme, markerStyle) => {
  if (obj.userData?.visualKey !== item.visualKey || obj.userData?.label !== item.label) {
    const fresh = createGlobeMarkerObject(item, globeRadius, toGlobeVector, theme, markerStyle);
    obj.material?.map?.dispose();
    obj.material?.dispose();
    obj.material = fresh.material;
    obj.scale.copy(fresh.scale);
    obj.renderOrder = fresh.renderOrder;
  }

  obj.position.copy(toGlobeVector(Number(item.lat), Number(item.lng), getMarkerAltitude(item, markerStyle), globeRadius));
  obj.userData = item;
};
