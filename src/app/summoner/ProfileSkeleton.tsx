export function ProfileSkeleton() {
  return (
    <div className="profile-card">
      <div className="skeleton-header">
        <div className="skeleton-circle" />
        <div>
          <div className="skeleton-line w-200" />
          <div className="skeleton-line w-100" style={{ marginTop: 8 }} />
        </div>
      </div>
      <div className="skeleton-line w-120" style={{ marginTop: 20 }} />
      <div className="ranked-grid" style={{ marginTop: 12 }}>
        <div className="skeleton-block h-80" />
        <div className="skeleton-block h-80" />
      </div>
      <div className="skeleton-line w-160" style={{ marginTop: 24 }} />
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-block h-64" />
        ))}
      </div>
    </div>
  );
}
