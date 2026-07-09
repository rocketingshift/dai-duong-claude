import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useExperienceRef } from '../state/experienceState';

/** Simple procedural "continents on a sphere" look, generated at runtime
 *  (no external textures / no scraped assets) via a canvas gradient + noise-ish dots. */
function useProceduralEarthTexture() {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size / 2;
    const ctx = canvas.getContext('2d')!;

    // ocean base
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#04123a');
    grad.addColorStop(1, '#020a26');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // pseudo-random "landmasses"
    ctx.fillStyle = '#0d3d3a';
    let seed = 42;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 42; i++) {
      const x = rand() * canvas.width;
      const y = rand() * canvas.height;
      const r = 8 + rand() * 34;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.6, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

const fresnelVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fresnelFragment = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  void main() {
    float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), uPower);
    gl_FragColor = vec4(uColor * fresnel * uIntensity, fresnel);
  }
`;

export default function EarthGlobe() {
  const groupRef = useRef<THREE.Group>(null);
  const rimRef = useRef<THREE.ShaderMaterial>(null);
  const state = useExperienceRef();
  const earthTexture = useProceduralEarthTexture();

  const rimUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#5ee7ff') },
      uPower: { value: 2.2 },
      uIntensity: { value: 1.6 },
    }),
    []
  );

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }
    // fade the whole earth out as we dive into the transition
    const opacity = THREE.MathUtils.clamp(1 - state.transitionProgress * 1.4, 0, 1);
    groupRef.current?.scale.setScalar(THREE.MathUtils.lerp(1, 0.4, state.transitionProgress));
    if (rimRef.current) rimRef.current.uniforms.uIntensity.value = 1.6 * opacity;
  });

  return (
    <>
      <Stars radius={80} depth={50} count={3000} factor={3} saturation={0} fade speed={0.4} />
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[2.4, 64, 64]} />
          <meshStandardMaterial map={earthTexture} roughness={0.85} metalness={0.1} />
        </mesh>
        {/* fresnel atmosphere rim */}
        <mesh scale={1.06}>
          <sphereGeometry args={[2.4, 64, 64]} />
          <shaderMaterial
            ref={rimRef}
            vertexShader={fresnelVertex}
            fragmentShader={fresnelFragment}
            uniforms={rimUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.FrontSide}
          />
        </mesh>
      </group>
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 3, 5]} intensity={1.4} color="#bfe9ff" />
    </>
  );
}
