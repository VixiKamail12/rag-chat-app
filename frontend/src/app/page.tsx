export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            RAG Chat
          </h1>
          <p className="text-muted-foreground">
            Ask questions about your company and services
          </p>
        </div>

        <div className="bg-card text-card-foreground rounded-lg p-6 border">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Chat interface coming soon...
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
