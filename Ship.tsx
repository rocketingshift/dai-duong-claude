import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperienceRef } from '../state/experienceState';
import type { Stage } from '../state/experienceState';

const ROUTE_LENGTH = 70; // world units the ship travels, z: 0 -> -ROUTE_LENGTH
const SAIL_DURATION = 34; // seconds for the whole route (autoplay speed)
const WAKE_POINTS = 60;

function Hull() {
  return (
    <group>
      {/* main hull, tapered via scale on a box so no external model is needed */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[1.1, 0.55, 3.4]} />
        <meshStandardMaterial color="#e9edf2" roughness={0.55} metalness={0.15} />
      </mesh>
      {/* bow taper */}
      <mesh position={[0, 0.2, -1.85]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.62, 0.9, 4]} />
        <meshStandardMaterial color="#e9edf2" roughness={0.55} metalness={0.15} />
      </mesh>
      {/* deckhouse */}
      <mesh position={[0, 0.75, 0.4]} castShadow>
        <boxGeometry args={[0.7, 0.5, 0.9]} />
        <meshStandardMaterial color="#0f2743" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* mast */}
      <mesh position={[0, 1.4, 0.4]}>
        <cylinderGeometry args={[0.03, 0.03, 1.1, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* beacon light (emissive, feeds bloom) */}
      <mesh position={[0, 1.98, 0.4]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#5ee7ff" emissive="#5ee7ff" emissiveIntensity={4} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.98, 0.4]} color="#5ee7ff" intensity={2.5} distance={6} />
    </group>
  );
}

export default function Ship({ stage }: { stage: Stage }) {
  const shipRef = useRef<THREE.Group>(null);
  const state = useExperienceRef();
  const elapsed = useRef(0);

  // ring buffer of past positions for the wake trail
  const wakePositions = useMemo(() => new Float32Array(WAKE_POINTS * 3), []);
  const wakeGeo = useRef<THREE.BufferGeometry>(null);
  const wakeHistory = useRef<THREE.Vector3[]>(
    Array.from({ length: WAKE_POINTS }, () => new THREE.Vector3(0, -1.4, 0))
  );

  useFrame((_, delta) => {
    if (!shipRef.current) return;

    if (stage === 'ship') {
      elapsed.current = Math.min(elapsed.current + delta, SAIL_DURATION);
    }
    const routeProgress = THREE.MathUtils.clamp(elapsed.current / SAIL_DURATION, 0, 1);
    state.routeProgress = routeProgress;

    // smooth the mouse-driven steering value (this creates the "zigzag" feel)
    state.steer = THREE.MathUtils.damp(state.steer, state.mouseX, 4, delta);

    // gentle autonomous serpentine baseline + mouse steering on top
    const baseZig = Math.sin(routeProgress * Math.PI * 5) * 1.1;
    const targetX = baseZig + state.steer * 3.2;

    const targetZ = -routeProgress * ROUTE_LENGTH;

    shipRef.current.position.x = THREE.MathUtils.damp(shipRef.current.position.x, targetX, 3, delta);
    shipRef.current.position.z = targetZ;

    // bob with the ocean swell
    const t = performance.now() * 0.001;
    shipRef.current.position.y = Math.sin(t * 1.4) * 0.08 - 1.15;

    // heading follows lateral velocity (turn into the zigzag), plus slight roll
    const lateralVel = state.steer + Math.cos(routeProgress * Math.PI * 5) * 0.6;
    const targetHeading = THREE.MathUtils.clamp(-lateralVel * 0.5, -0.6, 0.6);
    shipRef.current.rotation.y = THREE.MathUtils.damp(shipRef.current.rotation.y, targetHeading, 3, delta);
    shipRef.current.rotation.z = THREE.MathUtils.damp(shipRef.current.rotation.z, -lateralVel * 0.12, 3, delta);

    state.shipX = shipRef.current.position.x;
    state.shipZ = shipRef.current.position.z;
    state.shipHeading = shipRef.current.rotation.y;

    // update wake trail
    const hist = wakeHistory.current;
    for (let i = hist.length - 1; i > 0; i--) hist[i].copy(hist[i - 1]);
    hist[0].set(shipRef.current.position.x, -1.38, shipRef.current.position.z + 1.6);
    for (let i = 0; i < hist.length; i++) {
      wakePositions[i * 3] = hist[i].x;
      wakePositions[i * 3 + 1] = hist[i].y;
      wakePositions[i * 3 + 2] = hist[i].z;
    }
    if (wakeGeo.current) {
      (wakeGeo.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  });

  return (
    <>
      <group ref={shipRef} position={[0, -1.15, 0]}>
        <Hull />
      </group>
      <points>
        <bufferGeometry ref={wakeGeo}>
          <bufferAttribute attach="attributes-position" args={[wakePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.35}
          color="#bfeaff"
          transparent
          opacity={0.35}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  );
}

export { ROUTE_LENGTH, SAIL_DURATION };
