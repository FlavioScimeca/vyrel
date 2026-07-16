"use client";

import { IconPhoto, IconX } from "@tabler/icons-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  type Control,
  type FieldPath,
  type FieldValues,
  type PathValue,
  type FieldError as RhfFieldError,
  type UseFormClearErrors,
  type UseFormSetError,
  useController,
} from "react-hook-form";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const PREVIEW_IMAGE_SIZE = 40;

function formatFileMeta(file: File): string {
  const extension = file.name.split(".").pop()?.toUpperCase() ?? "IMAGE";
  const sizeKb = file.size / 1024;
  const size =
    sizeKb >= 1024
      ? `${(sizeKb / 1024).toFixed(1)} MB`
      : `${Math.round(sizeKb)} KB`;
  return `${extension} · ${size}`;
}

function validateImageFile(file: File): string | null {
  if (file.size === 0) {
    return "Image is empty.";
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return "Image exceeds the 5 MB upload limit.";
  }

  if (file.type.length > 0 && !ALLOWED_MIME_TYPES.has(file.type)) {
    return "Upload a PNG, JPG, JPEG, WebP, or GIF image.";
  }

  return null;
}

type TaskImageFormValues = FieldValues & {
  image?: File;
};

type TaskImageFieldProps<T extends TaskImageFormValues> = {
  clearErrors: UseFormClearErrors<T>;
  control: Control<T>;
  error?: RhfFieldError;
  formId: string;
  isSubmitting: boolean;
  setError: UseFormSetError<T>;
};

export function TaskImageField<T extends TaskImageFormValues>({
  clearErrors,
  control,
  error,
  formId,
  isSubmitting,
  setError,
}: TaskImageFieldProps<T>) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldName = "image" as FieldPath<T>;
  const { field } = useController({ control, name: fieldName });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const file = field.value as File | undefined;
  const validationMessage = error?.message;
  const hasFile = file !== undefined;

  useEffect(() => {
    if (file === undefined) {
      setPreviewUrl((current) => {
        if (current !== null) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current !== null) {
        URL.revokeObjectURL(current);
      }
      return nextPreviewUrl;
    });

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [file]);

  const attachmentState = (() => {
    if (isSubmitting) {
      return "uploading" as const;
    }
    if (validationMessage !== undefined) {
      return "error" as const;
    }
    if (hasFile) {
      return "done" as const;
    }
    return "idle" as const;
  })();

  const handleFileChange = useCallback(
    (nextFile: File | undefined) => {
      if (nextFile === undefined) {
        clearErrors(fieldName);
        field.onChange(undefined as PathValue<T, FieldPath<T>>);
        return;
      }

      const message = validateImageFile(nextFile);
      if (message !== null) {
        setError(fieldName, { message });
        return;
      }

      clearErrors(fieldName);
      field.onChange(nextFile as PathValue<T, FieldPath<T>>);
    },
    [clearErrors, field, fieldName, setError]
  );

  const handleClear = useCallback(() => {
    handleFileChange(undefined);
  }, [handleFileChange]);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0];
      handleFileChange(nextFile);
      event.target.value = "";
    },
    [handleFileChange]
  );

  const handleOpenFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const media = (() => {
    if (attachmentState === "uploading") {
      return (
        <AttachmentMedia>
          <Spinner />
        </AttachmentMedia>
      );
    }

    if (hasFile && previewUrl !== null) {
      return (
        <AttachmentMedia variant="image">
          <Image
            alt={file.name}
            className="aspect-square size-full object-cover"
            height={PREVIEW_IMAGE_SIZE}
            src={previewUrl}
            unoptimized
            width={PREVIEW_IMAGE_SIZE}
          />
        </AttachmentMedia>
      );
    }

    return (
      <AttachmentMedia>
        <IconPhoto />
      </AttachmentMedia>
    );
  })();

  return (
    <Field data-invalid={validationMessage !== undefined}>
      <FieldLabel htmlFor={inputId}>Image</FieldLabel>
      <input
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        id={inputId}
        name={`${formId}-image`}
        onChange={handleInputChange}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      <Attachment className="w-full" state={attachmentState}>
        {media}
        <AttachmentContent>
          <AttachmentTitle>{hasFile ? file.name : "Add image"}</AttachmentTitle>
          <AttachmentDescription>
            {validationMessage ??
              (hasFile
                ? formatFileMeta(file)
                : "Optional · PNG, JPG, WebP, or GIF up to 5 MB")}
          </AttachmentDescription>
        </AttachmentContent>
        {hasFile ? (
          <AttachmentActions>
            <AttachmentAction
              aria-label="Remove image"
              onClick={handleClear}
              type="button"
            >
              <IconX />
            </AttachmentAction>
          </AttachmentActions>
        ) : null}
        <AttachmentTrigger
          aria-label="Choose image"
          className="cursor-pointer"
          onClick={handleOpenFilePicker}
          type="button"
        />
      </Attachment>
      {validationMessage === undefined ? null : (
        <FieldError errors={[{ message: validationMessage }]} />
      )}
    </Field>
  );
}
