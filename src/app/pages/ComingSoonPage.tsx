interface ComingSoonPageProps {
  title: string;
}

export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">This module is being built out.</p>
    </div>
  );
}
