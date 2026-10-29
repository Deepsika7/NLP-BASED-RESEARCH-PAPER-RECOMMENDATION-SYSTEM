export default function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line w-1/3 h-4" />
      <div className="skeleton-line w-full h-6" />
      <div className="skeleton-line w-3/4 h-4" />
      <div className="skeleton-line w-full" />
      <div className="skeleton-line w-full" />
      <div className="skeleton-line w-1/2" />
    </div>
  );
}
