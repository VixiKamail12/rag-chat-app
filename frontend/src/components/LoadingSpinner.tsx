import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const dotSize = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className={`relative ${sizeClasses[size]}`}>
        <span
          className={`absolute top-0 left-0 ${dotSize[size]} bg-primary rounded-full animate-bounce`}
          style={{ animationDelay: '0ms' }}
        />
        <span
          className={`absolute top-0 left-1/2 -translate-x-1/2 ${dotSize[size]} bg-primary rounded-full animate-bounce`}
          style={{ animationDelay: '150ms' }}
        />
        <span
          className={`absolute top-0 right-0 ${dotSize[size]} bg-primary rounded-full animate-bounce`}
          style={{ animationDelay: '300ms' }}
        />
      </div>
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );
}

// Typing indicator for chat
export function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center py-2 px-3 bg-muted rounded-lg w-fit">
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}
