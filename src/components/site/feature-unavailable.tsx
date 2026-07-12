export function FeatureUnavailable({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
