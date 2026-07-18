import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_KEYS = [
  "task-skel-1",
  "task-skel-2",
  "task-skel-3",
  "task-skel-4",
  "task-skel-5",
  "task-skel-6",
] as const;

function TaskCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border p-6">
      <div className="flex flex-row items-start gap-4">
        <Skeleton className="size-12 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="flex shrink-0 gap-1">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function TasksListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {SKELETON_KEYS.map((key) => (
        <TaskCardSkeleton key={key} />
      ))}
    </div>
  );
}
