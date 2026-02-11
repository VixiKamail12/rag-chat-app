import React from 'react';
import { api, type Conversation } from '@/lib/api';

export interface ChatHistoryProps {
  userId: string;
  onSelectConversation?: (conversation: Conversation) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ChatHistory({ userId, onSelectConversation, isOpen = true, onClose }: ChatHistoryProps) {
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadConversations = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getConversations(userId);
      setConversations(data.history);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    if (isOpen && userId) {
      loadConversations();
    }
  }, [isOpen, userId, loadConversations]);

  if (!isOpen) return null;

  return (
    <div className="border-l bg-card h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Chat History</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No conversations yet
          </div>
        )}

        {!loading && !error && conversations.length > 0 && (
          <div className="divide-y">
            {conversations.map((conv, index) => (
              <button
                key={index}
                onClick={() => onSelectConversation?.(conv)}
                className="w-full text-left p-4 hover:bg-accent transition-colors"
              >
                <div className="text-sm font-medium truncate">
                  {conv.messages[0]?.content?.slice(0, 50) || 'Empty conversation'}...
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(conv.created_at).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {conv.messages.length} messages
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        <button
          onClick={loadConversations}
          className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
