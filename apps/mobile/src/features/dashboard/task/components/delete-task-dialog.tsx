import { readFragment } from "gql.tada";
import { Button, Dialog, Spinner } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { TaskListItemFragment } from "@/features/dashboard/task/graphql/fragments";
import type { TaskListItemRef } from "@/features/dashboard/task/graphql/types";
import { useDeleteTaskMutation } from "@/features/dashboard/task/hooks/use-task-mutations";

export function DeleteTaskDialog({ task }: { task: TaskListItemRef }) {
  const item = readFragment(TaskListItemFragment, task);
  const [open, setOpen] = useState(false);
  const [deleteTask, { loading }] = useDeleteTaskMutation();

  return (
    <Dialog isOpen={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm" variant="danger-soft">
          <Button.Label>Delete</Button.Label>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="gap-4">
          <Dialog.Close />
          <Dialog.Title>Delete task</Dialog.Title>
          <Dialog.Description>
            Delete “{item.title}”? This cannot be undone.
          </Dialog.Description>
          <View className="flex-row justify-end gap-2">
            <Button onPress={() => setOpen(false)} variant="ghost">
              <Button.Label>Cancel</Button.Label>
            </Button>
            <Button
              isDisabled={loading}
              onPress={async () => {
                await deleteTask({
                  variables: { input: { taskId: item.id } },
                });
                setOpen(false);
              }}
              variant="danger"
            >
              {loading ? <Spinner color="default" size="sm" /> : null}
              <Button.Label>Delete</Button.Label>
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
