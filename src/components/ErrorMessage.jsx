export default function ErrorMessage({ message }) {
  return (
    <div className="max-w-md mx-auto my-12 p-6 border border-red-500/50 bg-red-950/30 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.2)] backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="text-red-500 bg-red-500/10 p-3 rounded-full">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-red-400 font-semibold tracking-wider font-mono">SYSTEM FAILURE</h3>
          <p className="text-red-200/80 text-sm mt-1">{message || "Unable to establish connection to fleet database."}</p>
        </div>
      </div>
    </div>
  );
}
