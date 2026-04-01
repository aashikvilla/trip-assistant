export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
      <div className="text-center text-white">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
        <p className="text-lg font-semibold">Loading your trip...</p>
        <p className="mt-1 text-sm text-white/80">Preparing the next page</p>
      </div>
    </div>
  );
}
