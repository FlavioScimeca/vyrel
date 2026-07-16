"use client";

import { useMutation } from "@apollo/client/react";
import { IconTrash } from "@tabler/icons-react";
import { readFragment } from "gql.tada";
import { useCallback, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { TaskListItemFragment } from "@/features/dashboard/task/graphql/fragments";
import { DeleteTaskDocument } from "@/features/dashboard/task/graphql/mutations";
import type { TaskListItemRef } from "@/features/dashboard/task/graphql/types";

type DeleteTaskDialogProps = {
  onDeleted?: () => void;
  task: TaskListItemRef;
};

export function DeleteTaskDialog({ onDeleted, task }: DeleteTaskDialogProps) {
  const item = readFragment(TaskListItemFragment, task);
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTask, { loading }] = useMutation(DeleteTaskDocument);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setErrorMessage(null);
    }
  }, []);

  const handleDelete = useCallback(async () => {
    setErrorMessage(null);

    try {
      const result = await deleteTask({
        variables: {
          input: {
            taskId: item.id,
          },
        },
      });

      if (result.error !== undefined) {
        setErrorMessage(result.error.message || "Unable to delete task.");
        return;
      }

      handleOpenChange(false);
      onDeleted?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete task."
      );
    }
  }, [deleteTask, handleOpenChange, item.id, onDeleted]);

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

        {errorMessage === null ? null : (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={handleDelete}
            variant="destructive"
          >
            {loading ? <Spinner className="size-4" /> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
