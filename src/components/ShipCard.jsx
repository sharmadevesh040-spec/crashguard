import { motion } from 'framer-motion';

export default function ShipCard({ ship }) {
  const isAvailable = ship.status?.toLowerCase() === 'active' || ship.status?.toLowerCase() === 'operational';
  const statusColor = isAvailable ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' : 'text-slate-400 bg-slate-400/10 border-slate-400/20';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className="glass-card flex flex-col h-full border border-slate-800 hover:border-cyan-500/50 transition-colors duration-300"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-100 tracking-wide">{ship.name}</h3>
          <p className="text-sm font-mono text-cyan-500 uppercase tracking-widest mt-1">{ship.shipClass}</p>
        </div>
        <span className={`px-3 py-1 text-xs font-mono rounded-full border uppercase tracking-wider ${statusColor}`}>
          {ship.status}
        </span>
      </div>

      <div className="mt-auto space-y-3 pt-4 border-t border-slate-800/50">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Price</span>
          <span className="text-slate-200 font-mono">{ship.price}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Capacity</span>
          <span className="text-slate-200 font-mono">{ship.capacity}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Engine</span>
          <span className="text-slate-200 font-mono">{ship.engineType}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Manufactured</span>
          <span className="text-slate-200 font-mono">{ship.manufactureDate}</span>
        </div>
      </div>
      
      <div className="mt-6">
        <button className="w-full py-2 rounded bg-slate-800/50 hover:bg-cyan-500/20 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 transition-all font-mono text-sm uppercase tracking-widest">
          View Details
        </button>
      </div>
    </motion.div>
  );
}
