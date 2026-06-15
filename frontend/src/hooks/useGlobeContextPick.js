import { useCallback, useEffect } from 'react';
import * as THREE from 'three';

const GLOBE_RADIUS = 100;

export const useGlobeContextPick = (globeRef, dimensions, onPick) => {
  const getGlobeCoordsFromPointer = useCallback((event) => {
    const globe = globeRef.current;
    const renderer = globe?.renderer?.();
    const camera = globe?.camera?.();
    const domElement = renderer?.domElement;
    if (!globe || !camera || !domElement) return null;

    const rect = domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    const hitPoint = new THREE.Vector3();
    raycaster.setFromCamera(pointer, camera);

    if (!raycaster.ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(0, 0, 0), GLOBE_RADIUS), hitPoint)) {
      return null;
    }

    const coords = globe.toGeoCoords(hitPoint);
    if (!Number.isFinite(coords?.lat) || !Number.isFinite(coords?.lng)) return null;
    return { lat: coords.lat, lng: coords.lng };
  }, [globeRef]);

  useEffect(() => {
    if (!onPick) return undefined;

    let cleanup = null;
    const attachTimer = window.setTimeout(() => {
      const domElement = globeRef.current?.renderer?.()?.domElement;
      if (!domElement) return;

      const handleContextMenu = (event) => {
        const coords = getGlobeCoordsFromPointer(event);
        if (!coords) return;
        event.preventDefault();
        onPick(coords, event);
      };

      domElement.addEventListener('contextmenu', handleContextMenu);
      cleanup = () => domElement.removeEventListener('contextmenu', handleContextMenu);
    }, 0);

    return () => {
      window.clearTimeout(attachTimer);
      cleanup?.();
    };
  }, [dimensions.height, dimensions.width, getGlobeCoordsFromPointer, globeRef, onPick]);
};
