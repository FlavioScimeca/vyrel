"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type TasksErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function TasksError({ reset }: TasksErrorProps) {
  return (
    <div className="flex flex-1 p-6">
      <Alert variant="destructive">
        <AlertTitle>Unable to load tasks</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>An unexpected error occurred. Please try again.</span>
          <Button onClick={reset} size="sm" variant="outline">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
