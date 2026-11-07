import type { ComponentProps } from "react";

export function DefaultLayout({
  children,
  title,
  description,
  ...props
}: ComponentProps<"div"> & { title: string; description?: string }) {
  return (
    <div className="container mx-auto py-6" {...props}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description} </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
