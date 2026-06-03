'use client';

import { useRef, useMemo, Suspense } from 'react';
import { useFrame, Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { AvatarConfig } from '../engine/avatar';

/* ── Inline 3D avatar for sidebar / small use ── */
export function Avatar3DInline({ config, mood, occupation, size = 36 }: {
  config: AvatarConfig; mood?: string; occupation?: string; size?: number;
}) {
  return (
    <div style={{ width: size, height: size }} className="rounded-lg overflow-hidden">
      <Canvas
        dpr={1}
        camera={{ position: [0, 0.3, 2.6], fov: 30 }}
        gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[2, 4, 3]} intensity={1} />
          <Character3D config={config} mood={mood} occupation={occupation} animated={false} />
        </Suspense>
      </Canvas>
    </div>
  );
}

interface Props {
  config: AvatarConfig;
  mood?: string;
  occupation?: string;
  animated?: boolean;
}

function darken(hex: string, amt = 30): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (n >> 16) - amt);
  const g = Math.max(0, ((n >> 8) & 0xff) - amt);
  const b = Math.max(0, (n & 0xff) - amt);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function getMoodPose(mood?: string) {
  switch (mood) {
    case 'happy': case 'excited': return { headTilt: 0.06, swaySpeed: 1.2, swayAmp: 0.1 };
    case 'sad': case 'anxious': return { headTilt: -0.1, swaySpeed: 0.5, swayAmp: 0.04 };
    case 'confident': return { headTilt: 0.08, swaySpeed: 0.9, swayAmp: 0.08 };
    case 'stressed': return { headTilt: -0.05, swaySpeed: 0.7, swayAmp: 0.05 };
    case 'angry': return { headTilt: -0.03, swaySpeed: 1.3, swayAmp: 0.06 };
    case 'bored': return { headTilt: -0.08, swaySpeed: 0.3, swayAmp: 0.03 };
    default: return { headTilt: 0, swaySpeed: 0.8, swayAmp: 0.07 };
  }
}

export default function Character3D({ config, mood, occupation, animated = true }: Props) {
  const groupRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Mesh>(null!);
  const eyeGrpRef = useRef<THREE.Group>(null!);
  const headGrpRef = useRef<THREE.Group>(null!);

  const pose = useMemo(() => getMoodPose(mood), [mood]);
  const blinkOff = useMemo(() => Math.random() * 5, []);

  useFrame((state) => {
    if (!animated) return;
    const t = state.clock.elapsedTime + blinkOff;
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * pose.swaySpeed) * pose.swayAmp;
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.018;
    }
    if (bodyRef.current) {
      bodyRef.current.scale.y = 1 + Math.sin(t * 2.5) * 0.015;
    }
    if (headGrpRef.current) {
      headGrpRef.current.rotation.x = pose.headTilt + Math.sin(t * 1.2) * 0.02;
    }
    if (eyeGrpRef.current) {
      const bc = (t * 1000) % 4000;
      eyeGrpRef.current.scale.y = (bc > 3600 && bc < 3750) ? 0.05 : 1;
    }
  });

  const skin = config.skinTone;
  const cloth = config.clothingColor;
  const hair = config.hairColor;
  const isTank = config.clothingStyle === 'tank';

  return (
    <group ref={groupRef} position={[0, -0.55, 0]}>
      {/* ── BODY ── */}
      <group position={[0, 0.3, 0]}>
        <mesh ref={bodyRef}>
          <capsuleGeometry args={[0.22, 0.35, 8, 16]} />
          <meshStandardMaterial color={cloth} roughness={0.5} metalness={0.05} />
        </mesh>
        <ClothingDetail style={config.clothingStyle} color={cloth} />

        {/* Arms */}
        {([-1, 1] as const).map(side => (
          <group key={side} position={[side * 0.32, 0.05, 0]} rotation={[0, 0, side * 0.15]}>
            <mesh>
              <capsuleGeometry args={[0.06, 0.25, 6, 8]} />
              <meshStandardMaterial color={isTank ? skin : cloth} roughness={0.6} />
            </mesh>
            <mesh position={[0, -0.2, 0]}>
              <sphereGeometry args={[0.065, 8, 8]} />
              <meshStandardMaterial color={skin} roughness={0.7} />
            </mesh>
          </group>
        ))}

        {/* Legs */}
        {([-1, 1] as const).map(side => (
          <group key={side}>
            <mesh position={[side * 0.1, -0.38, 0]}>
              <capsuleGeometry args={[0.07, 0.2, 6, 8]} />
              <meshStandardMaterial color={darken(cloth, 30)} roughness={0.5} />
            </mesh>
            <mesh position={[side * 0.1, -0.55, 0.03]}>
              <boxGeometry args={[0.12, 0.06, 0.16]} />
              <meshStandardMaterial color="#2d2d3d" roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── HEAD ── */}
      <group ref={headGrpRef} position={[0, 1.05, 0]}>
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.12, 8]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.38, 32, 32]} />
          <meshStandardMaterial color={skin} roughness={0.65} />
        </mesh>

        {/* Eyes */}
        <group ref={eyeGrpRef}>
          <Eye pos={[-0.12, 0.04, 0.32]} style={config.eyeStyle} />
          <Eye pos={[0.12, 0.04, 0.32]} style={config.eyeStyle} />
        </group>

        {/* Blush */}
        {([-1, 1] as const).map(s => (
          <mesh key={s} position={[s * 0.22, -0.02, 0.28]} rotation={[0, s * 0.3, 0]}>
            <planeGeometry args={[0.1, 0.05]} />
            <meshBasicMaterial color="#ff9999" transparent opacity={0.2} side={THREE.DoubleSide} />
          </mesh>
        ))}

        {/* Mouth */}
        <MouthMesh mood={mood} />
        <Hair3D style={config.hairStyle} color={hair} />
        <Accessory3D type={config.accessory} />
      </group>

      <ProfessionProp occupation={occupation} />
    </group>
  );
}

/* ── Eye ── */
function Eye({ pos, style }: { pos: [number, number, number]; style: string }) {
  const w = style === 'narrow' ? 0.05 : style === 'wide' ? 0.08 : 0.065;
  return (
    <group position={pos}>
      <mesh><sphereGeometry args={[w, 16, 16]} /><meshBasicMaterial color="white" /></mesh>
      <mesh position={[0, -0.005, 0.02]}>
        <sphereGeometry args={[w * 0.65, 12, 12]} /><meshBasicMaterial color="#4F6D7A" />
      </mesh>
      <mesh position={[0, -0.005, 0.035]}>
        <sphereGeometry args={[w * 0.35, 8, 8]} /><meshBasicMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[-w * 0.3, w * 0.25, 0.04]}>
        <sphereGeometry args={[w * 0.2, 6, 6]} /><meshBasicMaterial color="white" />
      </mesh>
    </group>
  );
}

/* ── Mouth ── */
function MouthMesh({ mood }: { mood?: string }) {
  const curve = useMemo(() => {
    if (mood === 'happy' || mood === 'excited') {
      return new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.06, 0, 0), new THREE.Vector3(0, -0.035, 0), new THREE.Vector3(0.06, 0, 0));
    }
    if (mood === 'sad' || mood === 'anxious') {
      return new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.04, -0.015, 0), new THREE.Vector3(0, 0.015, 0), new THREE.Vector3(0.04, -0.015, 0));
    }
    return null;
  }, [mood]);

  if (curve) {
    return (
      <mesh position={[0, -0.12, 0.36]}>
        <tubeGeometry args={[curve, 8, 0.007, 6, false]} />
        <meshBasicMaterial color={mood === 'happy' || mood === 'excited' ? '#e88090' : '#c0616b'} />
      </mesh>
    );
  }
  // Cat mouth :3
  return (
    <group position={[0, -0.12, 0.36]}>
      <mesh position={[-0.02, 0, 0]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[0.035, 0.007, 0.005]} /><meshBasicMaterial color="#c0616b" />
      </mesh>
      <mesh position={[0.02, 0, 0]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[0.035, 0.007, 0.005]} /><meshBasicMaterial color="#c0616b" />
      </mesh>
    </group>
  );
}

/* ── Hair ── */
function Hair3D({ style, color }: { style: string; color: string }) {
  if (style === 'bald') return null;
  const mat = { color, roughness: 0.6, metalness: 0.1 };

  if (style === 'buzz') return (
    <mesh position={[0, 0.1, 0]}>
      <sphereGeometry args={[0.39, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      <meshStandardMaterial {...mat} />
    </mesh>
  );

  if (style === 'short') return (
    <group>
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.41, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {[[0, 0.35, 0.2, -0.3], [-0.1, 0.33, 0.18, -0.4], [0.1, 0.33, 0.18, -0.4]].map(([x, y, z, rx], i) => (
        <mesh key={i} position={[x!, y!, z!]} rotation={[rx!, i === 1 ? 0.2 : i === 2 ? -0.2 : 0, 0]}>
          <coneGeometry args={[i === 0 ? 0.12 : 0.08, i === 0 ? 0.15 : 0.12, 4]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      ))}
    </group>
  );

  if (style === 'long') return (
    <group>
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.42, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, -0.15, -0.15]}>
        <boxGeometry args={[0.55, 0.7, 0.12]} /><meshStandardMaterial {...mat} />
      </mesh>
      {([-1, 1] as const).map(s => (
        <mesh key={s} position={[s * 0.3, -0.05, 0.05]}>
          <capsuleGeometry args={[0.06, 0.3, 6, 8]} /><meshStandardMaterial {...mat} />
        </mesh>
      ))}
    </group>
  );

  if (style === 'curly') {
    const P: [number, number, number][] = [
      [-0.22, 0.28, 0.15], [0, 0.36, 0.1], [0.22, 0.28, 0.15],
      [-0.32, 0.12, 0.05], [0.32, 0.12, 0.05],
      [-0.18, 0.34, -0.05], [0.18, 0.34, -0.05],
      [-0.28, 0.02, 0.15], [0.28, 0.02, 0.15],
    ];
    const R = [0.1, 0.11, 0.1, 0.09, 0.09, 0.1, 0.1, 0.11, 0.11];
    return (
      <group>{P.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[R[i], 8, 8]} /><meshStandardMaterial {...mat} />
        </mesh>
      ))}</group>
    );
  }

  if (style === 'ponytail') return (
    <group>
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.41, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <group position={[0, 0.15, -0.3]} rotation={[0.5, 0, 0]}>
        <mesh><capsuleGeometry args={[0.08, 0.35, 6, 8]} /><meshStandardMaterial {...mat} /></mesh>
        <mesh position={[0, 0.15, 0]}>
          <torusGeometry args={[0.09, 0.025, 8, 12]} />
          <meshStandardMaterial color="#E74C6F" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );

  if (style === 'mohawk') return (
    <group>
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.39, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color={darken(color, 20)} roughness={0.7} metalness={0.1} />
      </mesh>
      {[0, 1, 2, 3].map(i => (
        <mesh key={i} position={[0, 0.42 + i * 0.02, (i - 1.5) * 0.08]} rotation={[(i - 1.5) * 0.4, 0, 0]}>
          <coneGeometry args={[0.06, 0.2 + i * 0.02, 4]} /><meshStandardMaterial {...mat} />
        </mesh>
      ))}
    </group>
  );

  return null;
}

/* ── Clothing Details ── */
function ClothingDetail({ style, color }: { style: string; color: string }) {
  if (style === 'hoodie') return (
    <group>
      <mesh position={[0, 0.25, -0.08]}>
        <sphereGeometry args={[0.2, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color={darken(color, 15)} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.05, 0.23]}>
        <boxGeometry args={[0.25, 0.08, 0.01]} />
        <meshStandardMaterial color={darken(color, 20)} roughness={0.6} />
      </mesh>
    </group>
  );
  if (style === 'shirt') return (
    <group>
      {([-1, 1] as const).map(s => (
        <mesh key={s} position={[s * 0.06, 0.22, 0.15]} rotation={[0.3, s * 0.4, 0]}>
          <planeGeometry args={[0.1, 0.08]} />
          <meshStandardMaterial color={darken(color, -20)} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
  return null;
}

/* ── Profession Props ── */
function ProfessionProp({ occupation }: { occupation?: string }) {
  if (!occupation) return null;

  switch (occupation) {
    case 'programmer': return (
      <group position={[0.35, 0.15, 0.15]} rotation={[0.2, -0.5, 0]}>
        <mesh><boxGeometry args={[0.18, 0.01, 0.12]} /><meshStandardMaterial color="#374151" roughness={0.3} metalness={0.5} /></mesh>
        <mesh position={[0, 0.06, -0.055]} rotation={[-1.2, 0, 0]}>
          <boxGeometry args={[0.18, 0.12, 0.01]} /><meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.065, -0.06]} rotation={[-1.2, 0, 0]}>
          <planeGeometry args={[0.15, 0.09]} /><meshBasicMaterial color="#60a5fa" transparent opacity={0.6} />
        </mesh>
      </group>
    );
    case 'doctor': return (
      <group position={[0, 0.65, 0.2]}>
        <mesh><torusGeometry args={[0.12, 0.015, 8, 16, Math.PI]} /><meshStandardMaterial color="#64748b" roughness={0.3} metalness={0.7} /></mesh>
        <mesh position={[0, -0.12, 0.02]}>
          <cylinderGeometry args={[0.03, 0.025, 0.02, 12]} /><meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.8} />
        </mesh>
      </group>
    );
    case 'teacher': return (
      <group position={[-0.35, 0.1, 0.1]} rotation={[0.1, 0.5, -0.2]}>
        <mesh><boxGeometry args={[0.12, 0.15, 0.03]} /><meshStandardMaterial color="#dc2626" roughness={0.7} /></mesh>
      </group>
    );
    case 'artist': return (
      <group position={[-0.35, 0.15, 0.15]} rotation={[0.5, 0.3, 0]}>
        <mesh><cylinderGeometry args={[0.1, 0.1, 0.015, 16]} /><meshStandardMaterial color="#d4a373" roughness={0.7} /></mesh>
        <mesh position={[-0.03, 0.01, 0.03]}><sphereGeometry args={[0.015, 6, 6]} /><meshBasicMaterial color="#ef4444" /></mesh>
        <mesh position={[0.04, 0.01, -0.02]}><sphereGeometry args={[0.015, 6, 6]} /><meshBasicMaterial color="#3b82f6" /></mesh>
        <mesh position={[0, 0.01, -0.05]}><sphereGeometry args={[0.015, 6, 6]} /><meshBasicMaterial color="#eab308" /></mesh>
      </group>
    );
    case 'chef': return (
      <group position={[0, 0.48, 0]}>
        <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.18, 0.2, 0.2, 16]} /><meshStandardMaterial color="#f5f5f4" roughness={0.8} /></mesh>
        <mesh position={[0, 0.73, 0]}><sphereGeometry args={[0.19, 16, 16]} /><meshStandardMaterial color="#f5f5f4" roughness={0.8} /></mesh>
      </group>
    );
    case 'mechanic': return (
      <group position={[0.35, 0.1, 0.1]} rotation={[0, 0, -0.5]}>
        <mesh><boxGeometry args={[0.03, 0.25, 0.02]} /><meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.7} /></mesh>
        <mesh position={[0, 0.13, 0]}><torusGeometry args={[0.04, 0.015, 6, 12, Math.PI * 1.5]} /><meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.7} /></mesh>
      </group>
    );
    case 'entrepreneur': return (
      <group position={[0.33, -0.05, 0.1]}>
        <mesh><boxGeometry args={[0.15, 0.12, 0.04]} /><meshStandardMaterial color="#854d0e" roughness={0.6} /></mesh>
        <mesh position={[0, 0.08, 0]}><torusGeometry args={[0.04, 0.008, 6, 12, Math.PI]} /><meshStandardMaterial color="#92400e" roughness={0.4} metalness={0.3} /></mesh>
        <mesh position={[0, 0, 0.025]}><boxGeometry args={[0.03, 0.015, 0.005]} /><meshStandardMaterial color="#d4a520" roughness={0.2} metalness={0.8} /></mesh>
      </group>
    );
    case 'student': return (
      <group position={[0, 0.35, -0.25]}>
        <mesh><boxGeometry args={[0.25, 0.25, 0.1]} /><meshStandardMaterial color="#3b82f6" roughness={0.6} /></mesh>
        {([-1, 1] as const).map(s => (
          <mesh key={s} position={[s * 0.08, 0.15, 0.07]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.03, 0.15, 0.01]} /><meshStandardMaterial color={darken('#3b82f6', 20)} roughness={0.6} />
          </mesh>
        ))}
      </group>
    );
    case 'freelancer': return (
      <group position={[0.32, 0.2, 0.15]} rotation={[0.3, -0.4, 0]}>
        <mesh><boxGeometry args={[0.06, 0.1, 0.005]} /><meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.4} /></mesh>
        <mesh position={[0, 0, 0.004]}><planeGeometry args={[0.05, 0.08]} /><meshBasicMaterial color="#818cf8" transparent opacity={0.7} /></mesh>
      </group>
    );
    default: return null;
  }
}

/* ── Accessories ── */
function Accessory3D({ type }: { type: string }) {
  if (type === 'none') return null;

  if (type === 'glasses') return (
    <group position={[0, 0.04, 0.32]}>
      {([-1, 1] as const).map(s => (
        <group key={s}>
          <mesh position={[s * 0.12, 0, 0]}>
            <torusGeometry args={[0.06, 0.008, 8, 16]} /><meshStandardMaterial color="#64748b" roughness={0.3} metalness={0.5} />
          </mesh>
          <mesh position={[s * 0.12, 0, 0.005]}>
            <circleGeometry args={[0.055, 16]} /><meshStandardMaterial color="#e0f2fe" transparent opacity={0.25} roughness={0.1} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0, 0.02]}><boxGeometry args={[0.06, 0.008, 0.008]} /><meshStandardMaterial color="#64748b" roughness={0.3} metalness={0.5} /></mesh>
    </group>
  );

  if (type === 'sunglasses') return (
    <group position={[0, 0.04, 0.33]}>
      {([-1, 1] as const).map(s => (
        <mesh key={s} position={[s * 0.12, 0, 0]}>
          <boxGeometry args={[0.13, 0.06, 0.01]} /><meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.005]}><boxGeometry args={[0.04, 0.008, 0.008]} /><meshStandardMaterial color="#1e293b" roughness={0.3} /></mesh>
    </group>
  );

  if (type === 'earring') return (
    <group>{([-1, 1] as const).map(s => (
      <mesh key={s} position={[s * 0.36, -0.02, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} /><meshStandardMaterial color="#ffd700" roughness={0.2} metalness={0.8} />
      </mesh>
    ))}</group>
  );

  if (type === 'hat') return (
    <group position={[0, 0.35, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.45, 0.45, 0.02, 24]} /><meshStandardMaterial color="#334155" roughness={0.7} /></mesh>
      <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.28, 0.32, 0.22, 16]} /><meshStandardMaterial color="#334155" roughness={0.7} /></mesh>
      <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[0.33, 0.33, 0.04, 16]} /><meshStandardMaterial color="#475569" roughness={0.5} /></mesh>
    </group>
  );

  if (type === 'bandana') return (
    <group position={[0, 0.2, 0.22]}>
      <mesh rotation={[0.3, 0, 0]}><boxGeometry args={[0.6, 0.08, 0.01]} /><meshStandardMaterial color="#ef4444" roughness={0.7} /></mesh>
      <mesh position={[-0.32, -0.03, 0]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.04, 0.1, 0.01]} /><meshStandardMaterial color="#ef4444" roughness={0.7} />
      </mesh>
    </group>
  );

  return null;
}
