import { useMutation } from "@apollo/client/react";
import { readFragment } from "gql.tada";
import { Button, Dialog, Spinner, useToast } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { TaskListItemFragment } from "@/features/dashboard/task/graphql/fragments";
import { DeleteTaskDocument } from "@/features/dashboard/task/graphql/mutations";
import {
  TaskConnectionDocument,
  TaskSummaryDocument,
} from "@/features/dashboard/task/graphql/queries";
import type { TaskListItemRef } from "@/features/dashboard/task/graphql/types";
import { haptics } from "@/lib/haptics";

export function DeleteTaskDialog({
  onDeleted,
  task,
}: {
  onDeleted?: () => void;
  task: TaskListItemRef;
}) {
  const item = readFragment(TaskListItemFragment, task);
  const [open, setOpen] = useState(false);
  const [deleteTask, { loading }] = useMutation(DeleteTaskDocument);
  const { toast } = useToast();

  return (
    <Dialog isOpen={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="danger-soft">
          <Button.Label>Delete task</Button.Label>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="gap-4">
          <Dialog.Close />
          <Dialog.Title>Delete task?</Dialog.Title>
          <Dialog.Description>
            “{item.title}” will be permanently removed. This action cannot
            currently be undone.
          </Dialog.Description>
          <View className="flex-row justify-end gap-2">
            <Button onPress={() => setOpen(false)} variant="secondary">
              <Button.Label>Keep task</Button.Label>
            </Button>
            <Button
              isDisabled={loading}
              onPress={async () => {
                try {
                  await deleteTask({
                    refetchQueries: [
                      TaskConnectionDocument,
                      TaskSummaryDocument,
                    ],
                    variables: { input: { taskId: item.id } },
                  });
                  haptics.success();
                  toast.show({ label: "Task deleted", variant: "success" });
                  setOpen(false);
                  onDeleted?.();
                } catch (error) {
                  haptics.danger();
                  toast.show({
                    label:
                      error instanceof Error
                        ? error.message
                        : "Unable to delete task.",
                    variant: "danger",
                  });
                }
              }}
              variant="danger"
            >
              {loading ? <Spinner color="default" size="sm" /> : null}
              <Button.Label>
                {loading ? "Deleting…" : "Delete task"}
              </Button.Label>
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
