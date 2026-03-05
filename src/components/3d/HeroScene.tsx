'use client'

import { useRef, Suspense, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Float,
  Stars,
  PerspectiveCamera,
  useTexture,
  MeshDistortMaterial,
  Sphere,
  Environment,
} from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

function ParticleField() {
  const count = 500
  const mesh = useRef<THREE.Points>(null)

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50

      // Purple to gold gradient
      const t = Math.random()
      colors[i * 3] = 0.55 + t * 0.4           // R: more red/gold
      colors[i * 3 + 1] = 0.36 * (1 - t) + 0.62 * t  // G
      colors[i * 3 + 2] = 0.96 * (1 - t) + 0.04 * t  // B: more purple/blue
    }

    return { positions, colors }
  }, [])

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = state.clock.elapsedTime * 0.02
      mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1
    }
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles.positions, 3]}  // ← Fix: args required for TS
          count={count}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[particles.colors, 3]}      // ← Fix: args required for TS
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  )
}

function FloatingOrb({
  position,
  color,
  scale = 1,
}: {
  position: [number, number, number]
  color: string
  scale?: number
}) {
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
          metalness={0.1}
          roughness={0.2}
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
      <MeshDistortMaterial
        color="#8b5cf6"
        envMapIntensity={1}
        clearcoat={1}
        clearcoatRoughness={0}
        metalness={0.9}
        roughness={0.1}
        distort={0.4}
        speed={1.5}
      />
    </mesh>
  )
}

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={60} />
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#8b5cf6" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#f59e0b" />
      <spotLight position={[0, 10, 0]} intensity={0.5} color="#00d4ff" angle={0.3} />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

      <ParticleField />

      <CentralSphere />

      <FloatingOrb position={[-4, 2, -2]} color="#f59e0b" scale={0.5} />
      <FloatingOrb position={[4, -1, -3]} color="#00d4ff" scale={0.7} />
      <FloatingOrb position={[-3, -2, 1]} color="#bf00ff" scale={0.4} />
      <FloatingOrb position={[3, 3, -1]} color="#ff00aa" scale={0.3} />

      <Environment preset="night" />

      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={1.5} radius={0.8} />
        <ChromaticAberration offset={[0.001, 0.001]} />
        <Vignette darkness={0.5} offset={0.5} />
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