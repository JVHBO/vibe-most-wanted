"use client";
import { useCachedCollections } from "@/lib/convex-cache";

export function CollectionFilter({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  // 🚀 BANDWIDTH FIX: Collections are static - use cached hook (1h refresh)
  const { collections } = useCachedCollections();
  if (!collections || collections.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {collections.map((col: any) => (
        <button
          key={col.collectionId}
          onClick={() => {
            const isSelected = selected.includes(col.collectionId);
            onChange(isSelected ? selected.filter((id) => id !== col.collectionId) : [...selected, col.collectionId]);
          }}
          className={`px-3 py-2 min-h-[44px] rounded text-sm font-bold transition-colors ${selected.includes(col.collectionId) ? "bg-vintage-gold text-vintage-black" : "bg-vintage-charcoal/50 text-vintage-ice border border-vintage-gold/30"}`}
        >
          {col.shortName}
        </button>
      ))}
    </div>
  );
}
