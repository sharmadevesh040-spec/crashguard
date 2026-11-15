import { motion } from 'framer-motion';

export default function Loader() {
  return (
    <div className="flex flex-col items-center justify-center py-20 h-full">
      <motion.div
        className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <motion.p
        className="mt-6 text-cyan-400 font-mono tracking-widest uppercase text-sm"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        Establishing Uplink...
      </motion.p>
    </div>
  );
}
