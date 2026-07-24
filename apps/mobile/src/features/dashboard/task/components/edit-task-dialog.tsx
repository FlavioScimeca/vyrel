import { useMutation, useQuery } from "@apollo/client/react";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { readFragment } from "gql.tada";
import {
  BottomSheet,
  Button,
  Chip,
  Input,
  Label,
  Spinner,
  TextField,
  Typography,
  useBottomSheetAwareHandlers,
  useToast,
} from "heroui-native";
import { useEffect, useState } from "react";
import { Alert, Platform, View } from "react-native";

import {
  type PickedImage,
  TaskImagePicker,
  toUploadFile,
} from "@/features/dashboard/task/components/task-image-picker";
import { TaskListItemFragment } from "@/features/dashboard/task/graphql/fragments";
import { UpdateTaskDocument } from "@/features/dashboard/task/graphql/mutations";
import {
  TaskConnectionDocument,
  TaskDetailsDocument,
  TaskLabelsDocument,
  TaskSummaryDocument,
} from "@/features/dashboard/task/graphql/queries";
import type { TaskListItemRef } from "@/features/dashboard/task/graphql/types";
import { authClient } from "@/lib/auth-client";
import { haptics } from "@/lib/haptics";

type MemberOption = { id: string; name: string };
type TaskPriority = "HIGH" | "LOW" | "MEDIUM" | "NONE";
type TaskStatus = "DONE" | "IN_PROGRESS" | "TODO";

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function EditTaskDialog({ task }: { task: TaskListItemRef }) {
  const item = readFragment(TaskListItemFragment, task);
  const awareHandlers = useBottomSheetAwareHandlers();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(item.status);
  const [priority, setPriority] = useState<TaskPriority>(item.priority);
  const [dueDate, setDueDate] = useState(item.dueDate ?? "");
  const [assigneeId, setAssigneeId] = useState(item.assignee?.id ?? "");
  const [labelIds, setLabelIds] = useState(
    item.labels.map((label) => label.id)
  );
  const [image, setImage] = useState<PickedImage>();
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [updateTask, { loading }] = useMutation(UpdateTaskDocument);
  const labels = useQuery(TaskLabelsDocument, {
    variables: { organizationId: item.organizationId },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    authClient.organization
      .listMembers({
        query: { limit: 100, organizationId: item.organizationId },
      })
      .then(({ data }) =>
        setMembers(
          (data?.members ?? []).map((member) => ({
            id: member.userId,
            name: member.user.name,
          }))
        )
      )
      .catch(() => undefined);
  }, [item.organizationId, open]);

  const isDirty =
    title !== item.title ||
    description !== (item.description ?? "") ||
    status !== item.status ||
    priority !== item.priority ||
    dueDate !== (item.dueDate ?? "") ||
    assigneeId !== (item.assignee?.id ?? "") ||
    image !== undefined ||
    labelIds.join(",") !== item.labels.map((label) => label.id).join(",");

  const reset = () => {
    setTitle(item.title);
    setDescription(item.description ?? "");
    setStatus(item.status);
    setPriority(item.priority);
    setDueDate(item.dueDate ?? "");
    setAssigneeId(item.assignee?.id ?? "");
    setLabelIds(item.labels.map((label) => label.id));
    setImage(undefined);
    setOpen(false);
  };

  const requestClose = () => {
    if (!isDirty) {
      setOpen(false);
      return;
    }
    Alert.alert("Discard changes?", "Your unsaved changes will be lost.", [
      { style: "cancel", text: "Keep editing" },
      { onPress: reset, style: "destructive", text: "Discard" },
    ]);
  };

  return (
    <BottomSheet
      isOpen={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setOpen(true);
        } else {
          requestClose();
        }
      }}
    >
      <BottomSheet.Trigger asChild>
        <Button onPress={() => setOpen(true)}>
          <Button.Label>Edit task</Button.Label>
        </Button>
      </BottomSheet.Trigger>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          contentContainerClassName="h-full"
          enableDynamicSizing={false}
          enableOverDrag={false}
          keyboardBehavior="extend"
          snapPoints={["92%"]}
        >
          <BottomSheet.Close />
          <BottomSheetScrollView
            contentContainerClassName="gap-5 px-5 pb-6"
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-1 pr-10">
              <BottomSheet.Title>Edit task</BottomSheet.Title>
              <BottomSheet.Description>
                Update the work, ownership, or timing.
              </BottomSheet.Description>
            </View>
            <TextField isInvalid={title.trim().length === 0} isRequired>
              <Label>Title</Label>
              <Input
                onBlur={awareHandlers.onBlur}
                onChangeText={setTitle}
                onFocus={awareHandlers.onFocus}
                value={title}
              />
            </TextField>
            <TextField>
              <Label>Description</Label>
              <Input
                multiline
                numberOfLines={4}
                onBlur={awareHandlers.onBlur}
                onChangeText={setDescription}
                onFocus={awareHandlers.onFocus}
                textAlignVertical="top"
                value={description}
              />
            </TextField>
            <OptionChips
              label="Status"
              onSelect={setStatus}
              options={[
                ["Todo", "TODO"],
                ["In progress", "IN_PROGRESS"],
                ["Done", "DONE"],
              ]}
              selected={status}
            />
            <OptionChips
              label="Priority"
              onSelect={setPriority}
              options={[
                ["None", "NONE"],
                ["Low", "LOW"],
                ["Medium", "MEDIUM"],
                ["High", "HIGH"],
              ]}
              selected={priority}
            />
            <View className="gap-2">
              <Typography className="font-medium">Due date</Typography>
              <View className="flex-row gap-2">
                <Button
                  onPress={() => setShowDatePicker((current) => !current)}
                  size="sm"
                  variant="secondary"
                >
                  <Button.Label>{dueDate || "Choose date"}</Button.Label>
                </Button>
                {dueDate ? (
                  <Button
                    onPress={() => setDueDate("")}
                    size="sm"
                    variant="tertiary"
                  >
                    <Button.Label>Clear</Button.Label>
                  </Button>
                ) : null}
              </View>
              {showDatePicker ? (
                <DateTimePicker
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  mode="date"
                  onChange={(_event, date) => {
                    if (Platform.OS === "android") {
                      setShowDatePicker(false);
                    }
                    if (date !== undefined) {
                      setDueDate(formatLocalDate(date));
                    }
                  }}
                  value={dueDate ? new Date(`${dueDate}T12:00:00`) : new Date()}
                />
              ) : null}
            </View>
            <View className="gap-2">
              <Typography className="font-medium">Assignee</Typography>
              <View className="flex-row flex-wrap gap-2">
                <Chip
                  color={assigneeId ? "default" : "accent"}
                  onPress={() => setAssigneeId("")}
                  variant="soft"
                >
                  <Chip.Label>Unassigned</Chip.Label>
                </Chip>
                {members.map((member) => (
                  <Chip
                    color={assigneeId === member.id ? "accent" : "default"}
                    key={member.id}
                    onPress={() => setAssigneeId(member.id)}
                    variant="soft"
                  >
                    <Chip.Label>{member.name}</Chip.Label>
                  </Chip>
                ))}
              </View>
            </View>
            <View className="gap-2">
              <Typography className="font-medium">Labels</Typography>
              <View className="flex-row flex-wrap gap-2">
                {(labels.data?.taskLabels ?? []).map((label) => {
                  const selected = labelIds.includes(label.id);
                  return (
                    <Chip
                      color={selected ? "accent" : "default"}
                      key={label.id}
                      onPress={() =>
                        setLabelIds((current) =>
                          selected
                            ? current.filter((id) => id !== label.id)
                            : [...current, label.id]
                        )
                      }
                      variant="soft"
                    >
                      <Chip.Label>{label.name}</Chip.Label>
                    </Chip>
                  );
                })}
              </View>
            </View>
            <TaskImagePicker onChange={setImage} value={image} />
          </BottomSheetScrollView>
          <View className="border-separator border-t bg-surface px-5 pt-3 pb-safe-offset-3">
            <Button
              isDisabled={loading || title.trim().length === 0}
              onPress={async () => {
                try {
                  await updateTask({
                    awaitRefetchQueries: true,
                    refetchQueries: [
                      TaskConnectionDocument,
                      TaskDetailsDocument,
                      TaskSummaryDocument,
                    ],
                    variables: {
                      input: {
                        assigneeId: assigneeId || null,
                        description,
                        dueDate: dueDate || null,
                        image:
                          image === undefined ? undefined : toUploadFile(image),
                        labelIds,
                        priority,
                        status,
                        taskId: item.id,
                        title: title.trim(),
                      },
                    },
                  });
                  haptics.success();
                  toast.show({ label: "Task updated", variant: "success" });
                  setOpen(false);
                } catch (error) {
                  haptics.danger();
                  toast.show({
                    label:
                      error instanceof Error
                        ? error.message
                        : "Unable to update task.",
                    variant: "danger",
                  });
                }
              }}
              size="lg"
            >
              {loading ? <Spinner color="default" size="sm" /> : null}
              <Button.Label>
                {loading ? "Saving changes…" : "Save changes"}
              </Button.Label>
            </Button>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

function OptionChips<T extends string>({
  label,
  onSelect,
  options,
  selected,
}: {
  label: string;
  onSelect: (value: T) => void;
  options: readonly (readonly [string, T])[];
  selected: T;
}) {
  return (
    <View className="gap-2">
      <Typography className="font-medium">{label}</Typography>
      <View className="flex-row flex-wrap gap-2">
        {options.map(([optionLabel, value]) => (
          <Chip
            accessibilityState={{ selected: selected === value }}
            color={selected === value ? "accent" : "default"}
            key={value}
            onPress={() => onSelect(value)}
            variant="soft"
          >
            <Chip.Label>{optionLabel}</Chip.Label>
          </Chip>
        ))}
      </View>
    </View>
  );
}
