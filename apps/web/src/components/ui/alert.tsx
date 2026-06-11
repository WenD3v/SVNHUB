import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3.5 [&>svg+div]:pl-7",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-foreground",
        destructive: "border-destructive/40 bg-destructive/5 text-destructive [&>svg]:text-destructive",
        success: "border-success/40 bg-success/5 text-success [&>svg]:text-success",
        warning: "border-warning/40 bg-warning/5 text-warning [&>svg]:text-warning",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Alert({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />;
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />;
}
