import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

// Page backdrop stays dark navy (brand token, same as the landing page —
// decoupled from the light content theme, same technique as Sidebar), with
// the actual form living in a white card on top of it.
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base p-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-white/10 bg-white p-8 shadow-2xl shadow-black/20">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
        {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}
