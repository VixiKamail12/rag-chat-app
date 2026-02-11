import React from 'react';

export interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  variant?: 'default' | 'destructive';
}

export function ErrorMessage({ message, onDismiss, variant = 'default' }: ErrorMessageProps) {
  const bgClasses = variant === 'destructive'
    ? 'bg-destructive text-destructive-foreground'
    : 'bg-muted text-muted-foreground';

  return (
    <div className={`flex items-start gap-2 ${bgClasses} rounded-lg p-4`}>
      <span className="text-lg">⚠️</span>
      <div className="flex-1">
        <p className="text-sm font-medium">Error</p>
        <p className="text-sm mt-1">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-sm opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// Success message component
export function SuccessMessage({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="flex items-start gap-2 bg-green-600 text-green-50 rounded-lg p-4">
      <span className="text-lg">✓</span>
      <div className="flex-1">
        <p className="text-sm font-medium">Success</p>
        <p className="text-sm mt-1">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-sm opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
