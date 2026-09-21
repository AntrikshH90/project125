'use client'

import { motion } from 'framer-motion'

interface LeaderboardProps {
  rankings: { name: string; points: number; avatar: string; rank: number }[]
}

export function Leaderboard({ rankings }: LeaderboardProps) {
  return (
    <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>🏆</span> Leaderboard
      </h3>
      <div className="space-y-3">
        {rankings.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-4 p-3 bg-slate-700/50 rounded-xl"
          >
            <div className="w-8 h-8 flex items-center justify-center font-bold text-apex-primary">
              #{item.rank}
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-apex-primary to-apex-secondary flex items-center justify-center text-white font-bold">
              {item.name[0]}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{item.name}</div>
            </div>
            <div className="text-apex-primary font-bold">{item.points} pts</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
