'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, Float } from '@react-three/drei'
import { TaskCard } from '@/components/TaskCard'
import { motion } from 'framer-motion'

export default function Dashboard() {
  const tasks = [
    { id: '1', title: 'Design UI System', points: 100 },
    { id: '2', title: 'API Integration', points: 150 },
    { id: '3', title: 'Testing Suite', points: 75 },
    { id: '4', title: 'Documentation', points: 50 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-6 border-b border-slate-700"
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-apex-primary">Apex Manager</h1>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-apex-primary/20 rounded-full text-apex-primary">
              Points: 2,450
            </div>
            <div className="w-10 h-10 bg-apex-secondary rounded-full" />
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Tasks Completed', value: '47' },
            { label: 'Streak', value: '12 days' },
            { label: 'Rank', value: '#3' },
            { label: 'Rewards', value: '8' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700"
            >
              <div className="text-2xl font-bold text-apex-primary">{stat.value}</div>
              <div className="text-slate-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Task Board */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Task Board</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-apex-primary/50 transition-colors"
              >
                <div className="text-lg font-semibold mb-2">{task.title}</div>
                <div className="flex justify-between items-center">
                  <span className="text-apex-primary font-bold">{task.points} pts</span>
                  <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">To Do</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 3D Scene */}
        <div className="h-96 bg-slate-800/30 rounded-2xl border border-slate-700 overflow-hidden">
          <Canvas camera={{ position: [0, 0, 8] }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <Stage environment="city">
              <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                <TaskCard title="Design UI" points={100} position={[-2, 0, 0]} />
              </Float>
              <Float speed={2.5} rotationIntensity={0.3} floatIntensity={0.5}>
                <TaskCard title="Backend" points={150} position={[0, 0, 0]} />
              </Float>
              <Float speed={3} rotationIntensity={0.2} floatIntensity={0.5}>
                <TaskCard title="Testing" points={75} position={[2, 0, 0]} />
              </Float>
            </Stage>
            <OrbitControls enableZoom={false} />
          </Canvas>
        </div>
      </div>
    </div>
  )
}
