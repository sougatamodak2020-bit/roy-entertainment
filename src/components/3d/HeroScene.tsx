'use client'

import { useRef, Suspense, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  Float,
  Stars,
  PerspectiveCamera,
  MeshDistortMaterial,
  Environment,
} from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

/* ── Particles — amber/orange fire palette matching logo ── */
function ParticleField() {
  const count = 500
  const mesh = useRef<THREE.Points>(null)

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors    = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 50
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50

      // Fire gradient: deep orange → amber gold
      const t = Math.random()
      colors[i * 3]     = 1.0                       // R always high (fire)
      colors[i * 3 + 1] = 0.38 + t * 0.33           // G: 0.38 (orange) → 0.71 (gold)
      colors[i * 3 + 2] = 0.0                        // B always 0 (pure fire)
    }

    return { positions, colors }
  }, [])

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = state.clock.elapsedTime * 0.018
      mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.08
    }
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles.positions, 3]}
          count={count}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[particles.colors, 3]}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.09} vertexColors transparent opacity={0.75} sizeAttenuation />
    </points>
  )
}

function FloatingOrb({
  position, color, scale = 1,
}: { position: [number, number, number]; color: string; scale?: number }) {
  const mesh = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.3
    }
  })

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={mesh} position={position} scale={scale}>
        <sphereGeometry args={[1, 32, 32]} />
        <MeshDistortMaterial
          color={color}
          envMapIntensity={0.5}
          clearcoat={1}
          clearcoatRoughness={0}
          metalness={0.2}
          roughness={0.15}
          distort={0.3}
          speed={2}
        />
      </mesh>
    </Float>
  )
}

function CentralSphere() {
  const mesh = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = state.clock.elapsedTime * 0.1
      mesh.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.1
    }
  })

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[2, 64, 64]} />
      {/* Core brand color: deep orange */}
      <MeshDistortMaterial
        color="#FF6200"
        envMapIntensity={1}
        clearcoat={1}
        clearcoatRoughness={0}
        metalness={0.85}
        roughness={0.1}
        distort={0.38}
        speed={1.5}
      />
    </mesh>
  )
}

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={60} />
      <ambientLight intensity={0.15} />
      {/* Key light: brand orange */}
      <pointLight position={[10, 10, 10]}   intensity={1.2} color="#FF6200" />
      {/* Fill light: amber gold */}
      <pointLight position={[-10, -10, -10]} intensity={0.6} color="#FFB733" />
      {/* Rim: dark orange */}
      <spotLight   position={[0, 10, 0]}     intensity={0.4} color="#FF8C00" angle={0.3} />

      <Stars radius={100} depth={50} count={2500} factor={4} saturation={0} fade speed={0.8} />
      <ParticleField />
      <CentralSphere />

      {/* Floating orbs — fire tones */}
      <FloatingOrb position={[-4,  2, -2]} color="#FF8C00" scale={0.5} />
      <FloatingOrb position={[ 4, -1, -3]} color="#FFB733" scale={0.7} />
      <FloatingOrb position={[-3, -2,  1]} color="#FF4500" scale={0.4} />
      <FloatingOrb position={[ 3,  3, -1]} color="#FFD080" scale={0.3} />

      <Environment preset="night" />

      <EffectComposer>
        <Bloom luminanceThreshold={0.18} luminanceSmoothing={0.9} intensity={1.4} radius={0.8} />
        <ChromaticAberration offset={[0.0008, 0.0008]} />
        <Vignette darkness={0.55} offset={0.45} />
      </EffectComposer>
    </>
  )
}

export function HeroScene() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  )
}