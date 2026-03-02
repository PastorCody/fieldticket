import { Mic } from "lucide-react";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal header — just the logo */}
      <header className="flex items-center justify-center gap-2 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
          <Mic className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold text-foreground">FieldTicket</span>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-8">
        {children}
      </main>
    </div>
  );
}
