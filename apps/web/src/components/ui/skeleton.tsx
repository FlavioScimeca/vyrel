"use client";

import { cn } from "@vyrel/shared/lib/utils";
import { Skeleton as SkeletonShared } from "@vyrel/shared/ui";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <SkeletonShared className={cn("bg-muted", className)} {...props} />;
}
