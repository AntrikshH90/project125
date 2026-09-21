'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'

interface Reward {
  id: string
  name: string
  cost: number
  icon: string
}

interface MarketplaceProps {
  userPoints: number
}

export function Marketplace({ userPoints }: MarketplaceProps) {
  const rewards: Reward[] = [
    { id: '1', name: 'API Credits ($50)', cost: 500, icon: '🔑' },
    { id: '2', name: 'Premium Tool', cost: 750, icon: '🛠' },
    { id: '3', name: 'Extra Vacation Day', cost: 1000, icon: '🏖' },
    { id: '4', name: 'Merch Pack', cost: 1500, icon: '👕' },
  ]

  const redeem = (reward: Reward) => {
    if (userPoints >= reward.cost) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      alert(`Redeemed ${reward.name} for ${reward.cost} points!`)
    } else {
      alert(`Need ${reward.cost - userPoints} more points!`)
    }
  }

  return (
    <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span>🛒</span> Rewards Store
        </h3>
        <div className="text-apex-primary font-bold">Your Points: {userPoints}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rewards.map((reward, i) => (
          <motion.button
            key={reward.id}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => redeem(reward)}
            disabled={userPoints < reward.cost}
            className="p-4 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl border border-slate-600 hover:border-apex-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <div className="text-3xl mb-2">{reward.icon}</div>
            <div className="font-semibold mb-1">{reward.name}</div>
            <div className="text-sm text-apex-primary">{reward.cost} points</div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
