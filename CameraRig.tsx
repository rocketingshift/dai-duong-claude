import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperienceRef } from '../state/experienceState';
import type { Stage } from '../state/experienceState';

const EARTH_POS = new THREE.Vector3(0, 0.6, 7.5);
const DIVE_TARGET = new THREE.Vector3(0, -0.9, 4.5);
const tmp = new THREE.Vector3();
const lookTmp = new THREE.Vector3();

export default function CameraRig({ stage }: { stage: Stage }) {
  const { camera } = useThree();
  const state = useExperienceRef();

  useFrame((_, delta) => {
    const persp = camera as THREE.PerspectiveCamera;

    if (stage === 'earth') {
      camera.position.lerp(EARTH_POS, 1 - Math.pow(0.001, delta));
      lookTmp.set(0, 0.2, 0);
      camera.lookAt(lookTmp);
      persp.fov = THREE.MathUtils.damp(persp.fov, 42, 3, delta);
      persp.updateProjectionMatrix();
      return;
    }

    if (stage === 'transition') {
      const t = state.transitionProgress;
      tmp.lerpVectors(EARTH_POS, DIVE_TARGET, t);
      camera.position.lerp(tmp, 1 - Math.pow(0.0001, delta));
      lookTmp.lerpVectors(new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(0, -1.2, -4), t);
      camera.lookAt(lookTmp);
      persp.fov = THREE.MathUtils.damp(persp.fov, THREE.MathUtils.lerp(42, 62, t), 3, delta);
      persp.updateProjectionMatrix();
      return;
    }

    // 'ship' and 'end' -> chase camera following the ship
    const behind = 6.5 - state.steer * 0.8;
    const targetPos = tmp.set(
      state.shipX * 0.5,
      1.6,
      state.shipZ + behind
    );
    camera.position.lerp(targetPos, 1 - Math.pow(0.0007, delta));
    lookTmp.set(state.shipX * 0.9, -0.6, state.shipZ - 3);
    camera.lookAt(lookTmp);
    persp.fov = THREE.MathUtils.damp(persp.fov, 58, 3, delta);
    persp.updateProjectionMatrix();
  });

  return null;
}
