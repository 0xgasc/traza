export default function DocumentsLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-48 bg-stone-200 animate-pulse" />
          <div className="h-4 w-64 bg-stone-100 animate-pulse mt-2" />
        </div>
        <div className="h-12 w-40 bg-stone-200 animate-pulse" />
      </div>
      <div className="flex gap-4 mb-6">
        <div className="h-12 flex-1 bg-stone-200 animate-pulse" />
        <div className="h-12 w-40 bg-stone-200 animate-pulse" />
      </div>
      <div className="border-4 border-black bg-white">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="px-4 py-4 border-b-2 border-stone-200 flex gap-4"
          >
            <div className="h-4 w-1/3 bg-stone-200 animate-pulse" />
            <div className="h-4 w-20 bg-stone-200 animate-pulse" />
            <div className="h-4 w-24 bg-stone-200 animate-pulse" />
            <div className="h-4 w-8 bg-stone-200 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
