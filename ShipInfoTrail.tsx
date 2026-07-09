import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { ROUTE_INFOS, useExperienceRef } from '../state/experienceState';

export default function ShipInfoTrail({ onRouteEnd }: { onRouteEnd: () => void }) {
  const state = useExperienceRef();
  const anchorRef = useRef<THREE.Group>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const endedRef = useRef(false);

  useFrame((_, delta) => {
    if (!anchorRef.current) return;

    // position the anchor slightly above & ahead of the ship's current spot
    anchorRef.current.position.x = THREE.MathUtils.damp(
      anchorRef.current.position.x,
      state.shipX,
      4,
      delta
    );
    anchorRef.current.position.z = state.shipZ - 1.6;
    anchorRef.current.position.y = 1.1 + Math.sin(performance.now() * 0.0016) * 0.08;

    // figure out which of the 4 waypoints is currently "active"
    let idx = -1;
    for (let i = 0; i < ROUTE_INFOS.length; i++) {
      if (state.routeProgress >= ROUTE_INFOS[i].triggerAt) idx = i;
    }
    if (idx !== activeIndex) setActiveIndex(idx);

    if (state.routeProgress >= 1 && !endedRef.current) {
      endedRef.current = true;
      onRouteEnd();
    }
  });

  const info = activeIndex >= 0 ? ROUTE_INFOS[activeIndex] : null;

  return (
    <group ref={anchorRef}>
      <Html center distanceFactor={8} transform occlude={false} style={{ pointerEvents: 'none' }}>
        <div
          className="info-card rounded-xl px-4 py-3 w-56 text-white transition-all duration-500"
          style={{
            opacity: info ? 1 : 0,
            transform: info ? 'translateY(0px)' : 'translateY(10px)',
          }}
        >
          {info && (
            <>
              <div className="hud-label text-[9px] text-cyan-300/80">{info.label}</div>
              <div className="text-sm font-semibold mt-1">{info.title}</div>
              <div className="text-2xl font-bold text-cyan-200 mt-1">{info.value}</div>
              <div className="text-[11px] text-white/60 mt-1 leading-snug">{info.detail}</div>
            </>
          )}
        </div>
      </Html>
    </group>
  );
}
