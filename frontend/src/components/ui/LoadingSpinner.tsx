export function LoadingSpinner() {
  return (
    <span
      aria-label="Loading"
      className="inline-block size-5 animate-spin rounded-full border-2 border-slate-300 border-t-primary"
      role="status"
    />
  );
}
