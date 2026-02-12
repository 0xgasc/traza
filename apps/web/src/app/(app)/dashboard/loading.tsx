export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-8 w-48 bg-stone-200 animate-pulse" />
        <div className="h-4 w-64 bg-stone-100 animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card">
            <div className="h-3 w-24 bg-stone-200 animate-pulse mb-3" />
            <div className="h-10 w-16 bg-stone-200 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-6 w-40 bg-stone-200 animate-pulse mb-4" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card">
            <div className="h-4 w-3/4 bg-stone-200 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
