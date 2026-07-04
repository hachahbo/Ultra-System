export function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto mb-8 max-w-xl text-center md:mb-12">
      <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          {subtitle}
        </p>
      )}
    </div>
  );
}
