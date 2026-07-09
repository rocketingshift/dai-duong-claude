import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const oceanVertex = /* glsl */ `
  uniform float uTime;
  varying vec3 vPos;
  varying float vWave;

  float wave(vec2 p, float freq, float amp, float speed, float t) {
    return sin(p.x * freq + t * speed) * amp + cos(p.y * freq * 1.3 + t * speed * 0.8) * amp * 0.6;
  }

  void main() {
    vec3 pos = position;
    float w = 0.0;
    w += wave(pos.xy, 0.06, 0.55, 1.0, uTime);
    w += wave(pos.xy, 0.14, 0.25, 1.6, uTime);
    w += wave(pos.xy, 0.32, 0.10, 2.4, uTime);
    pos.z += w;
    vWave = w;
    vPos = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const oceanFragment = /* glsl */ `
  varying vec3 vPos;
  varying float vWave;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  void main() {
    float t = clamp(vWave * 0.6 + 0.5, 0.0, 1.0);
    vec3 color = mix(uDeep, uShallow, t);
    // subtle specular glints on wave crests
    float glint = smoothstep(0.35, 0.9, vWave);
    color += glint * vec3(0.4, 0.7, 0.8);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function Ocean() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color('#020420') },
      uShallow: { value: new THREE.Color('#0c4d5c') },
    }),
    []
  );

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.4, 0]} receiveShadow>
      <planeGeometry args={[240, 400, 160, 200]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={oceanVertex}
        fragmentShader={oceanFragment}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
