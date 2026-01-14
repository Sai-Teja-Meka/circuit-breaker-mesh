import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';
import { api } from '../services/api';

const AGENT_IDS = ['coordinator', 'researcher', 'coder'];

// Individual Agent Node Component
const AgentNode = ({ position, name, status, failureCount }) => {
  // Determine color based on circuit state
  const color = useMemo(() => {
    switch (status) {
      case 'open': return '#ef4444'; // Red-500
      case 'half_open': return '#eab308'; // Yellow-500
      case 'closed': 
      default: return '#22c55e'; // Green-500
    }
  }, [status]);

  // Size varies slightly based on failures (visual feedback for instability)
  const size = 0.5 + (failureCount * 0.1);

  return (
    <group position={position}>
      {/* Agent Sphere */}
      <Sphere args={[size, 32, 32]}>
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
      
      {/* Label */}
      <Text
        position={[0, size + 0.5, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {name.toUpperCase()}
      </Text>
    </group>
  );
};

// Connection Line Component
const Connection = ({ start, end, status }) => {
  const color = status === 'closed' ? '#22c55e' : status === 'half_open' ? '#eab308' : '#ef4444';
  
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ], [start, end]);

  return (
    <Line 
      points={points} 
      color={color} 
      lineWidth={2} 
      transparent 
      opacity={0.6} 
    />
  );
};

// Main Scene Content (Handles Animation)
const SceneContent = ({ agents }) => {
  const groupRef = useRef();

  // Rotate the entire graph slowly
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  // Layout Logic: Coordinator at center, others in orbit
  const coordinator = agents.find(a => a.id === 'coordinator') || { status: 'closed', failureCount: 0 };
  const others = agents.filter(a => a.id !== 'coordinator');
  
  const radius = 5;
  const centerPos = [0, 0, 0];

  return (
    <group ref={groupRef}>
      {/* Center Node (Coordinator) */}
      <AgentNode 
        position={centerPos} 
        name="Coordinator" 
        status={coordinator.status} 
        failureCount={coordinator.failureCount} 
      />

      {/* Orbiting Nodes */}
      {others.map((agent, index) => {
        const angle = (index / others.length) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const pos = [x, 0, z];

        return (
          <group key={agent.id}>
            <AgentNode 
              position={pos} 
              name={agent.id} 
              status={agent.status} 
              failureCount={agent.failureCount} 
            />
            {/* Connection to Center */}
            <Connection start={centerPos} end={pos} status={agent.status} />
          </group>
        );
      })}
    </group>
  );
};

const CircuitMesh3D = () => {
  const [agents, setAgents] = useState([]);

  // Fetch Loop
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const promises = AGENT_IDS.map(async (id) => {
          const status = await api.getAgentStatus(id);
          return {
            id,
            status: status.status, // closed, open, half_open
            failureCount: status.failure_count || 0
          };
        });
        const results = await Promise.all(promises);
        setAgents(results);
      } catch (err) {
        console.error("Failed to fetch 3D mesh data", err);
      }
    };

    fetchStates(); // Initial
    const interval = setInterval(fetchStates, 2000); // Loop
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden shadow-inner border border-gray-800">
      <Canvas camera={{ position: [0, 6, 10], fov: 50 }}>
        {/* Environment */}
        <color attach="background" args={['#050505']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        {/* Controls */}
        <OrbitControls 
          enablePan={false} 
          minDistance={5} 
          maxDistance={20}
          autoRotate={false}
        />

        {/* 3D Content */}
        <SceneContent agents={agents} />
      </Canvas>
    </div>
  );
};

export default CircuitMesh3D;