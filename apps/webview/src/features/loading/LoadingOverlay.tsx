import './LoadingOverlay.css';

interface LoadingOverlayProps {
  show: boolean;
}

export function LoadingOverlay({ show }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-spinner" />
    </div>
  );
}
