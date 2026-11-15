export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative max-w-2xl mx-auto mb-10 group">
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-cyan-500 group-focus-within:text-cyan-300 transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 block pl-12 p-4 outline-none transition-all placeholder-slate-500 font-mono"
        placeholder="Search fleet by name or class..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
    </div>
  );
}
