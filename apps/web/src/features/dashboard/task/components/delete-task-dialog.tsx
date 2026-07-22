"use client";

import { IconTrash } from "@tabler/icons-react";
import { readFragment } from "gql.tada";
import { type MouseEvent, useState } from "react";

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
import { Spinner } from "@/components/ui/spinner";
import { useTaskListContext } from "@/features/dashboard/task/context/task-list-context";
import { TaskListItemFragment } from "@/features/dashboard/task/graphql/fragments";
import type { TaskListItemRef } from "@/features/dashboard/task/graphql/types";
import { useDeleteTaskMutation } from "@/features/dashboard/task/hooks/use-task-mutations";

type DeleteTaskDialogProps = {
  task: TaskListItemRef;
};

export function DeleteTaskDialog({ task }: DeleteTaskDialogProps) {
  const item = readFragment(TaskListItemFragment, task);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleteTask] = useDeleteTaskMutation();
  const { refreshTasks } = useTaskListContext();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
  };

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setPending(true);
    try {
      await deleteTask({
        variables: {
          input: {
            taskId: item.id,
          },
        },
      });
      handleOpenChange(false);
      refreshTasks();
    } catch {
      // The mutation hook reports the error and the dialog stays available.
    } finally {
      setPending(false);
    }
  };

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
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={handleDelete}
            variant="destructive"
          >
            {pending ? <Spinner className="size-4" /> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
