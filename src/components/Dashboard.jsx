import { useState, useEffect } from 'react';
import SearchBar from './SearchBar';
import ShipCard from './ShipCard';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import { normalizeShip } from '../utils/normalize';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const [ships, setShips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchShips = async () => {
      try {
        const response = await fetch('https://task1-nsaic.vercel.app/api/ships');
        if (!response.ok) throw new Error('Failed to fetch fleet data');
        const data = await response.json();
        
        const normalizedData = data.map(normalizeShip);
        setShips(normalizedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchShips();
  }, []);

  const filteredShips = ships.filter(ship => {
    const query = searchQuery.toLowerCase();
    return (
      ship.name.toLowerCase().includes(query) ||
      ship.shipClass.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-space text-slate-200 p-6 md:p-12 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-12 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black mb-4 tracking-tighter"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
              INTERGALACTIC
            </span>
            <span className="text-slate-100 ml-3 font-mono tracking-widest font-light">FLEET</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 font-mono text-sm tracking-widest uppercase"
          >
            Command Database Uplink Active
          </motion.p>
        </header>

        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {loading ? (
          <Loader />
        ) : error ? (
          <ErrorMessage message={error} />
        ) : (
          <>
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              <AnimatePresence>
                {filteredShips.map(ship => (
                  <ShipCard key={ship.id} ship={ship} />
                ))}
              </AnimatePresence>
            </motion.div>

            {filteredShips.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 text-slate-500 font-mono tracking-widest uppercase"
              >
                No vessels matching designation found.
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
