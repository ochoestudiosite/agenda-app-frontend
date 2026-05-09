export default function LandingSkeleton() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Navbar Skeleton */}
      <div className="h-16 md:h-20 border-b border-edge flex items-center justify-between px-6 md:px-12 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-raised animate-pulse" />
          <div className="w-32 h-5 rounded-md bg-raised animate-pulse" />
        </div>
        <div className="hidden md:flex gap-8">
          <div className="w-20 h-4 rounded bg-raised animate-pulse" />
          <div className="w-20 h-4 rounded bg-raised animate-pulse" />
          <div className="w-20 h-4 rounded bg-raised animate-pulse" />
        </div>
        <div className="w-32 h-10 rounded-full bg-raised animate-pulse" />
      </div>

      {/* Hero Skeleton */}
      <div className="pt-32 pb-20 md:pt-40 md:pb-32 px-6 flex flex-col items-center text-center max-w-4xl mx-auto">
        <div className="w-48 h-6 rounded-full bg-raised animate-pulse mb-8" />
        <div className="w-full h-16 md:h-24 rounded-2xl bg-raised animate-pulse mb-4" />
        <div className="w-3/4 h-16 md:h-24 rounded-2xl bg-raised animate-pulse mb-12" />
        <div className="w-full max-w-2xl h-6 rounded-md bg-raised animate-pulse mb-3" />
        <div className="w-2/3 max-w-xl h-6 rounded-md bg-raised animate-pulse mb-12" />
        <div className="w-48 h-14 rounded-full bg-raised animate-pulse" />
      </div>

      {/* Cards Skeleton (Services preview) */}
      <div className="px-6 pb-32 max-w-7xl mx-auto">
        <div className="w-40 h-6 rounded-md bg-raised animate-pulse mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-edge rounded-[2rem] p-6 h-80 flex flex-col">
              <div className="w-full h-40 bg-raised rounded-2xl animate-pulse mb-6" />
              <div className="w-3/4 h-6 bg-raised rounded-md animate-pulse mb-3" />
              <div className="w-full h-4 bg-raised rounded-md animate-pulse mb-2" />
              <div className="w-5/6 h-4 bg-raised rounded-md animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
