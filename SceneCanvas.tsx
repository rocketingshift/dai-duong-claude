import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import EarthGlobe from './EarthGlobe';
import Ocean from './Ocean';
import Ship from './Ship';
import CameraRig from './CameraRig';
import ShipInfoTrail from './ShipInfoTrail';
import type { Stage } from '../state/experienceState';

export default function SceneCanvas({
  stage,
  onRouteEnd,
}: {
  stage: Stage;
  onRouteEnd: () => void;
}) {
  const showOcean = stage === 'transition' || stage === 'ship' || stage === 'end';
  const showEarth = stage === 'earth' || stage === 'transition';

  return (
    <Canvas
      dpr={[1, Math.min(window.devicePixelRatio, 2)]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 42, near: 0.1, far: 500, position: [0, 0.6, 7.5] }}
    >
      <color attach="background" args={['#020420']} />
      <fog attach="fog" args={['#020420', 12, 55]} />
      <Suspense fallback={null}>
        {showEarth && <EarthGlobe />}
        {showOcean && (
          <>
            <Ocean />
            <Ship stage={stage} />
            <ShipInfoTrail onRouteEnd={onRouteEnd} />
            <ambientLight intensity={0.35} />
            <directionalLight position={[6, 8, -3]} intensity={1.1} color="#bfe9ff" />
          </>
        )}
        <CameraRig stage={stage} />
      </Suspense>
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.3} intensity={0.7} mipmapBlur />
        <Vignette eskil={false} offset={0.15} darkness={0.9} />
      </EffectComposer>
    </Canvas>
  );
}
