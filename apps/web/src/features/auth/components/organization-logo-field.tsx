"use client";

import { IconBuilding, IconX } from "@tabler/icons-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  type Control,
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
import type { OnboardingFormValues } from "@/features/auth/onboarding-form.schema";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
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

function validateLogoFile(file: File): string | null {
  if (file.size === 0) {
    return "Logo image is empty.";
  }

  if (file.size > MAX_LOGO_BYTES) {
    return "Logo exceeds the 5 MB upload limit.";
  }

  if (file.type.length > 0 && !ALLOWED_MIME_TYPES.has(file.type)) {
    return "Upload a PNG, JPG, JPEG, WebP, or GIF logo.";
  }

  return null;
}

function renderAttachmentMedia({
  file,
  previewUrl,
  state,
}: {
  file?: File;
  previewUrl: string | null;
  state: "done" | "error" | "idle" | "uploading";
}) {
  if (state === "uploading") {
    return (
      <AttachmentMedia>
        <Spinner />
      </AttachmentMedia>
    );
  }

  if (file !== undefined && previewUrl !== null) {
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
      <IconBuilding />
    </AttachmentMedia>
  );
}

type OrganizationLogoFieldProps = {
  clearErrors: UseFormClearErrors<OnboardingFormValues>;
  control: Control<OnboardingFormValues>;
  error?: RhfFieldError;
  formId: string;
  isSubmitting: boolean;
  setError: UseFormSetError<OnboardingFormValues>;
};

function LogoAttachment({
  clearErrors,
  error,
  file,
  formId,
  inputId,
  isSubmitting,
  onChange,
  setError,
}: {
  clearErrors: UseFormClearErrors<OnboardingFormValues>;
  error?: RhfFieldError;
  file?: File;
  formId: string;
  inputId: string;
  isSubmitting: boolean;
  onChange: (value: File | undefined) => void;
  setError: UseFormSetError<OnboardingFormValues>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
        clearErrors("logo");
        onChange(undefined);
        return;
      }

      const message = validateLogoFile(nextFile);
      if (message !== null) {
        setError("logo", { message });
        return;
      }

      clearErrors("logo");
      onChange(nextFile);
    },
    [clearErrors, onChange, setError]
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

  return (
    <Field data-invalid={validationMessage !== undefined}>
      <FieldLabel htmlFor={inputId}>Logo</FieldLabel>
      <input
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        id={inputId}
        name={`${formId}-logo`}
        onChange={handleInputChange}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      <Attachment className="w-full" state={attachmentState}>
        {renderAttachmentMedia({ file, previewUrl, state: attachmentState })}
        <AttachmentContent>
          <AttachmentTitle>{hasFile ? file.name : "Add logo"}</AttachmentTitle>
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
              aria-label="Remove logo"
              onClick={handleClear}
              type="button"
            >
              <IconX />
            </AttachmentAction>
          </AttachmentActions>
        ) : null}
        <AttachmentTrigger
          aria-label="Choose logo"
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

type LogoAttachmentControllerProps = Omit<
  OrganizationLogoFieldProps,
  "control"
> & {
  inputId: string;
  onChange: (value: File | undefined) => void;
  value?: File;
};

function LogoAttachmentController({
  clearErrors,
  error,
  formId,
  inputId,
  isSubmitting,
  onChange,
  setError,
  value,
}: LogoAttachmentControllerProps) {
  return (
    <LogoAttachment
      clearErrors={clearErrors}
      error={error}
      file={value}
      formId={formId}
      inputId={inputId}
      isSubmitting={isSubmitting}
      onChange={onChange}
      setError={setError}
    />
  );
}

export function OrganizationLogoField({
  clearErrors,
  control,
  error,
  formId,
  isSubmitting,
  setError,
}: OrganizationLogoFieldProps) {
  const inputId = useId();
  const { field } = useController({ control, name: "logo" });

  return (
    <LogoAttachmentController
      clearErrors={clearErrors}
      error={error}
      formId={formId}
      inputId={inputId}
      isSubmitting={isSubmitting}
      onChange={field.onChange}
      setError={setError}
      value={field.value}
    />
  );
}
