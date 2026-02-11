'use client';

import React, { useState, useRef, useEffect } from 'react';
import { atom, useAtom, useSetAtom } from 'jotai';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { ChatHistory } from '@/components/ChatHistory';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage, SuccessMessage } from '@/components/ErrorMessage';
import { DocumentUpload } from '@/components/DocumentUpload';
import { api, type ChatMessage as ApiChatMessage } from '@/lib/api';

// Jotai atoms for state management
const messagesAtom = atom<ApiChatMessage[]>([]);
const isLoadingAtom = atom(false);
const errorAtom = atom<string | null>(null);
const successMessageAtom = atom<string | null>(null);
const showHistoryAtom = atom(false);
const documentsCountAtom = atom<number>(0);

export default function Home() {
  const [messages, setMessages] = useAtom(messagesAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [error, setError] = useAtom(errorAtom);
  const [successMessage, setSuccessMessage] = useAtom(successMessageAtom);
  const [showHistory, setShowHistory] = useAtom(showHistoryAtom);
  const [documentsCount, setDocumentsCount] = useAtom(documentsCountAtom);
  const [userId] = useState(() => `user-${Date.now()}`);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load documents count on mount
  useEffect(() => {
    loadDocumentsCount();
  }, []);

  const loadDocumentsCount = async () => {
    try {
      const result = await api.getDocumentsCount();
      setDocumentsCount(result.count);
    } catch (err) {
      console.error('Failed to load documents count:', err);
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    // Add user message
    const userMessage: ApiChatMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);

    // Create placeholder for AI response
    let aiContent = '';
    const updateAiMessage = (content: string) => {
      aiContent = content;
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.role === 'assistant') {
          lastMessage.content = content;
        }
        return newMessages;
      });
    };

    // Add empty AI message
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      await api.streamChat(
        messageText,
        userId,
        // onChunk
        (chunk) => {
          updateAiMessage(aiContent + chunk);
        },
        // onComplete
        (fullResponse, sources) => {
          setIsLoading(false);
          updateAiMessage(fullResponse);
          if (sources > 0) {
            setSuccessMessage(`Response based on ${sources} document(s)`);
            setTimeout(() => setSuccessMessage(null), 3000);
          }
        },
        // onError
        (errorMessage) => {
          setIsLoading(false);
          setError(errorMessage);
          // Remove the empty AI message on error
          setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
        }
      );
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to send message');
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
    }
  };

  const handleUploadComplete = (count: number) => {
    setSuccessMessage(`${count} document(s) uploaded successfully`);
    loadDocumentsCount();
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleUploadError = (err: string) => {
    setError(err);
    setTimeout(() => setError(null), 5000);
  };

  return (
    <main className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">RAG Chat</h1>
            <p className="text-sm text-muted-foreground">
              {documentsCount} document(s) in knowledge base
            </p>
          </div>
          <div className="flex gap-2">
            <DocumentUpload
              userId={userId}
              onUploadComplete={handleUploadComplete}
              onError={handleUploadError}
            />
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2"
            >
              📜 History
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden max-w-6xl mx-auto w-full">
        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${showHistory ? '' : 'w-full'}`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="text-6xl">🤖</div>
                <div>
                  <h2 className="text-2xl font-semibold">Welcome to RAG Chat</h2>
                  <p className="text-muted-foreground mt-2 max-w-md">
                    Ask questions about your documents. Upload documents to build your knowledge base.
                  </p>
                </div>
                {documentsCount === 0 && (
                  <div className="text-sm text-muted-foreground bg-muted rounded-lg p-4 max-w-md">
                    <p className="font-medium mb-2">Getting Started:</p>
                    <ol className="text-left space-y-1 list-decimal list-inside">
                      <li>Click "Upload Documents" to add your files</li>
                      <li>Supported formats: .txt, .md, .json</li>
                      <li>Start asking questions!</li>
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((msg, index) => (
                  <ChatMessage
                    key={index}
                    role={msg.role}
                    content={msg.content}
                    isStreaming={isLoading && index === messages.length - 1 && msg.role === 'assistant'}
                  />
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <LoadingSpinner size="sm" text="AI is thinking..." />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <aside className="w-80 border-l bg-card">
            <ChatHistory
              userId={userId}
              onClose={() => setShowHistory(false)}
            />
          </aside>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-md z-50">
          <ErrorMessage message={error} onDismiss={() => setError(null)} variant="destructive" />
        </div>
      )}

      {successMessage && (
        <div className="fixed bottom-4 right-4 max-w-md z-50">
          <SuccessMessage message={successMessage} onDismiss={() => setSuccessMessage(null)} />
        </div>
      )}
    </main>
  );
}
