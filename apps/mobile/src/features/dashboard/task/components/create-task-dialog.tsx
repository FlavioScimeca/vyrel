import { useMutation, useQuery } from "@apollo/client/react";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  BottomSheet,
  Button,
  Chip,
  FieldError,
  Input,
  Label,
  Spinner,
  TextField,
  Typography,
  useBottomSheetAwareHandlers,
  useToast,
} from "heroui-native";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Platform, View } from "react-native";

import {
  type PickedImage,
  TaskImagePicker,
  toUploadFile,
} from "@/features/dashboard/task/components/task-image-picker";
import {
  type CreateTaskFormValues,
  createTaskFormSchema,
} from "@/features/dashboard/task/form.schema";
import {
  CreateTaskDocument,
  CreateTaskLabelDocument,
} from "@/features/dashboard/task/graphql/mutations";
import {
  TaskConnectionDocument,
  TaskLabelsDocument,
  TaskSummaryDocument,
} from "@/features/dashboard/task/graphql/queries";
import { authClient } from "@/lib/auth-client";
import { haptics } from "@/lib/haptics";

type MemberOption = {
  id: string;
  name: string;
};

const STATUS_OPTIONS = [
  { label: "Todo", value: "TODO" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Done", value: "DONE" },
] as const;
const PRIORITY_OPTIONS = [
  { label: "None", value: "NONE" },
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
] as const;

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function ComposerForm({
  onCreated,
  organizationId,
}: {
  onCreated: () => void;
  organizationId: string;
}) {
  const awareHandlers = useBottomSheetAwareHandlers();
  const { toast } = useToast();
  const [image, setImage] = useState<PickedImage>();
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [createTask, { loading }] = useMutation(CreateTaskDocument);
  const [createLabel, { loading: creatingLabel }] = useMutation(
    CreateTaskLabelDocument
  );
  const labelsQuery = useQuery(TaskLabelsDocument, {
    variables: { organizationId },
  });
  const form = useForm<CreateTaskFormValues>({
    defaultValues: {
      assigneeId: "",
      description: "",
      dueDate: "",
      labelIds: [],
      priority: "NONE",
      status: "TODO",
      title: "",
    },
    resolver: zodResolver(createTaskFormSchema),
  });

  useEffect(() => {
    let active = true;
    authClient.organization
      .listMembers({ query: { limit: 100, organizationId } })
      .then(({ data }) => {
        if (!active) {
          return;
        }
        setMembers(
          (data?.members ?? []).map((member) => ({
            id: member.userId,
            name: member.user.name,
          }))
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [organizationId]);

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    try {
      await createTask({
        awaitRefetchQueries: true,
        refetchQueries: [TaskConnectionDocument, TaskSummaryDocument],
        variables: {
          input: {
            assigneeId: values.assigneeId || undefined,
            description: values.description || undefined,
            dueDate: values.dueDate || undefined,
            image: image === undefined ? undefined : toUploadFile(image),
            labelIds: values.labelIds,
            organizationId,
            priority: values.priority,
            status: values.status,
            title: values.title,
          },
        },
      });
      haptics.success();
      toast.show({ label: "Task created", variant: "success" });
      form.reset();
      setImage(undefined);
      onCreated();
    } catch (error) {
      haptics.danger();
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Unable to create task.",
      });
    }
  });

  const selectedLabels = form.watch("labelIds");
  const selectedStatus = form.watch("status");
  const selectedPriority = form.watch("priority");
  const selectedAssignee = form.watch("assigneeId");
  const dueDate = form.watch("dueDate");

  return (
    <>
      <BottomSheetScrollView
        contentContainerClassName="gap-5 px-5 pb-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-1 pr-10">
          <BottomSheet.Title>New task</BottomSheet.Title>
          <BottomSheet.Description>
            Capture the next step. You can refine it at any time.
          </BottomSheet.Description>
        </View>

        <Controller
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <TextField isInvalid={fieldState.error !== undefined} isRequired>
              <Label>Title</Label>
              <Input
                autoFocus
                onBlur={(event) => {
                  awareHandlers.onBlur(event);
                  field.onBlur();
                }}
                onChangeText={field.onChange}
                onFocus={awareHandlers.onFocus}
                placeholder="What needs to happen?"
                returnKeyType="next"
                value={field.value}
              />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />

        <Controller
          control={form.control}
          name="description"
          render={({ field }) => (
            <TextField>
              <Label>Description</Label>
              <Input
                multiline
                numberOfLines={4}
                onBlur={(event) => {
                  awareHandlers.onBlur(event);
                  field.onBlur();
                }}
                onChangeText={field.onChange}
                onFocus={awareHandlers.onFocus}
                placeholder="Add context, links, or a definition of done…"
                textAlignVertical="top"
                value={field.value ?? ""}
              />
            </TextField>
          )}
        />

        <ChoiceGroup
          label="Status"
          onSelect={(value) => form.setValue("status", value)}
          options={STATUS_OPTIONS}
          selected={selectedStatus}
        />
        <ChoiceGroup
          label="Priority"
          onSelect={(value) => form.setValue("priority", value)}
          options={PRIORITY_OPTIONS}
          selected={selectedPriority}
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
                onPress={() => form.setValue("dueDate", "")}
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
              minimumDate={new Date()}
              mode="date"
              onChange={(_event, date) => {
                if (Platform.OS === "android") {
                  setShowDatePicker(false);
                }
                if (date !== undefined) {
                  form.setValue("dueDate", formatLocalDate(date), {
                    shouldDirty: true,
                  });
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
              color={selectedAssignee ? "default" : "accent"}
              onPress={() => form.setValue("assigneeId", "")}
              variant="soft"
            >
              <Chip.Label>Unassigned</Chip.Label>
            </Chip>
            {members.map((member) => (
              <Chip
                color={selectedAssignee === member.id ? "accent" : "default"}
                key={member.id}
                onPress={() => form.setValue("assigneeId", member.id)}
                variant="soft"
              >
                <Chip.Label>{member.name}</Chip.Label>
              </Chip>
            ))}
          </View>
        </View>

        <View className="gap-3">
          <Typography className="font-medium">Labels</Typography>
          <View className="flex-row flex-wrap gap-2">
            {(labelsQuery.data?.taskLabels ?? []).map((label) => {
              const selected = selectedLabels.includes(label.id);
              return (
                <Chip
                  color={selected ? "accent" : "default"}
                  key={label.id}
                  onPress={() =>
                    form.setValue(
                      "labelIds",
                      selected
                        ? selectedLabels.filter((id) => id !== label.id)
                        : [...selectedLabels, label.id],
                      { shouldDirty: true }
                    )
                  }
                  variant="soft"
                >
                  <Chip.Label>{label.name}</Chip.Label>
                </Chip>
              );
            })}
          </View>
          <View className="flex-row items-end gap-2">
            <TextField className="flex-1">
              <Label>New label</Label>
              <Input
                onBlur={awareHandlers.onBlur}
                onChangeText={setNewLabel}
                onFocus={awareHandlers.onFocus}
                placeholder="e.g. Launch"
                value={newLabel}
              />
            </TextField>
            <Button
              isDisabled={creatingLabel || newLabel.trim().length === 0}
              onPress={async () => {
                const result = await createLabel({
                  refetchQueries: [TaskLabelsDocument],
                  variables: {
                    input: {
                      color: "accent",
                      name: newLabel.trim(),
                      organizationId,
                    },
                  },
                });
                const createdId = result.data?.createTaskLabel?.id;
                if (createdId !== undefined) {
                  form.setValue("labelIds", [...selectedLabels, createdId], {
                    shouldDirty: true,
                  });
                  setNewLabel("");
                }
              }}
              size="sm"
              variant="secondary"
            >
              <Button.Label>Add</Button.Label>
            </Button>
          </View>
        </View>

        <TaskImagePicker onChange={setImage} value={image} />

        {form.formState.errors.root?.message ? (
          <View
            accessibilityRole="alert"
            className="rounded-2xl bg-danger-soft p-4"
          >
            <Typography className="text-danger-soft-foreground">
              {form.formState.errors.root.message}
            </Typography>
          </View>
        ) : null}
      </BottomSheetScrollView>

      <View className="border-separator border-t bg-surface px-5 pt-3 pb-safe-offset-3">
        <Button isDisabled={loading} onPress={onSubmit} size="lg">
          {loading ? <Spinner color="default" size="sm" /> : null}
          <Button.Label>
            {loading ? "Creating task…" : "Create task"}
          </Button.Label>
        </Button>
      </View>
    </>
  );
}

function ChoiceGroup<T extends string>({
  label,
  onSelect,
  options,
  selected,
}: {
  label: string;
  onSelect: (value: T) => void;
  options: readonly { label: string; value: T }[];
  selected: T;
}) {
  return (
    <View className="gap-2">
      <Typography className="font-medium">{label}</Typography>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            accessibilityState={{ selected: selected === option.value }}
            color={selected === option.value ? "accent" : "default"}
            key={option.value}
            onPress={() => onSelect(option.value)}
            variant="soft"
          >
            <Chip.Label>{option.label}</Chip.Label>
          </Chip>
        ))}
      </View>
    </View>
  );
}

export function CreateTaskDialog({
  organizationId,
}: {
  organizationId: string;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const close = () => {
    setOpen(false);
    setFormKey((key) => key + 1);
  };

  return (
    <BottomSheet
      isOpen={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setOpen(true);
          return;
        }
        Alert.alert(
          "Discard task draft?",
          "Any details you entered will be lost.",
          [
            { style: "cancel", text: "Keep editing" },
            { onPress: close, style: "destructive", text: "Discard" },
          ]
        );
      }}
    >
      <BottomSheet.Trigger asChild>
        <Button onPress={() => setOpen(true)}>
          <Button.Label>New task</Button.Label>
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
          <ComposerForm
            key={formKey}
            onCreated={close}
            organizationId={organizationId}
          />
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
