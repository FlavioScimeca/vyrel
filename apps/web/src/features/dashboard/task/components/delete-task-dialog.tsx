"use client";

import { IconTrash } from "@tabler/icons-react";
import { readFragment } from "gql.tada";
import { useCallback, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useRefreshTasks } from "@/features/dashboard/task/context/task-refresh-context";
import { TaskListItemFragment } from "@/features/dashboard/task/graphql/fragments";
import type { TaskListItemRef } from "@/features/dashboard/task/graphql/types";
import { useDeleteTaskMutation } from "@/features/dashboard/task/hooks/use-task-mutations";

type DeleteTaskDialogProps = {
  task: TaskListItemRef;
};

export function DeleteTaskDialog({ task }: DeleteTaskDialogProps) {
  const item = readFragment(TaskListItemFragment, task);
  const [open, setOpen] = useState(false);
  const [deleteTask] = useDeleteTaskMutation();
  const refreshTasks = useRefreshTasks();

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
  }, []);

  const handleDelete = useCallback(async () => {
    const mutation = deleteTask({
      variables: {
        input: {
          taskId: item.id,
        },
      },
    });
    handleOpenChange(false);

    try {
      await mutation;
      await refreshTasks();
    } catch {
      // Mutation errors use its toast; refetch errors surface via query state.
    }
  }, [deleteTask, handleOpenChange, item.id, refreshTasks]);

  return (
    <AlertDialog onOpenChange={handleOpenChange} open={open}>
      <AlertDialogTrigger
        render={
          <Button aria-label="Delete task" size="icon-sm" variant="ghost">
            <IconTrash className="size-4" />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete task</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete “{item.title}”. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} variant="destructive">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
