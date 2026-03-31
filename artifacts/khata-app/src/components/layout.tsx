import { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col max-w-md mx-auto relative shadow-2xl sm:border-x sm:border-border overflow-x-hidden">
      {children}
    </div>
  );
}
