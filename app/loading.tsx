export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0f0f0f]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
        <span className="text-[#FFD700] text-xs font-bold uppercase tracking-widest">Loading...</span>
      </div>
    </div>
  );
}
