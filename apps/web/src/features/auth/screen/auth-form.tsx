"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, LazyMotion, m } from "motion/react";
import { useEffect, useRef } from "react";
import {
  FormProvider,
  type UseFormRegister,
  type UseFormReturn,
  useForm,
  useFormState,
} from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authenticate } from "@/features/auth/authenticate";
import { SignUpAvatarField } from "@/features/auth/components/sign-up-avatar-field";
import {
  type AuthMode,
  type SignInFormValues,
  type SignUpFormValues,
  signInDefaultValues,
  signInFormSchema,
  signUpDefaultValues,
  signUpFormSchema,
} from "@/features/auth/form.schema";
import {
  type MotionTransition,
  useAuthMotion,
} from "@/features/auth/screen/auth-shared";
import { loadMotionDomAnimation } from "@/lib/motion-features";

const SIGN_IN_FORM_ID = "auth-form-signin";
const SIGN_UP_FORM_ID = "auth-form-signup";

type CredentialFields = Pick<SignInFormValues, "email" | "password">;

function useSyncCredentialsOnModeChange(
  mode: AuthMode,
  signInForm: UseFormReturn<SignInFormValues>,
  signUpForm: UseFormReturn<SignUpFormValues>
) {
  const prevMode = useRef<AuthMode | null>(null);

  useEffect(() => {
    if (prevMode.current === null) {
      prevMode.current = mode;
      return;
    }

    if (prevMode.current === mode) {
      return;
    }

    if (mode === "signup") {
      const { email, password } = signInForm.getValues();
      signUpForm.reset({ ...signUpDefaultValues, email, password });
    } else {
      const { email, password } = signUpForm.getValues();
      signInForm.reset({ ...signInDefaultValues, email, password });
    }

    prevMode.current = mode;
  }, [mode, signInForm, signUpForm]);
}

function createSubmitHandler<T extends SignInFormValues | SignUpFormValues>(
  mode: AuthMode,
  form: UseFormReturn<T>,
  onSuccess: () => Promise<void>,
  fallbackError: string
) {
  return form.handleSubmit(async (values) => {
    form.clearErrors("root");
    const result = await authenticate(values, mode);

    if (!result.ok) {
      form.setError("root", { message: result.message });
      return;
    }

    try {
      await onSuccess();
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : fallbackError,
      });
    }
  });
}

export function AuthForm({
  mode,
  onSuccessAction,
}: {
  mode: AuthMode;
  onSuccessAction: () => Promise<void>;
}) {
  const isSignUp = mode === "signup";
  const { fieldTransition, prefersReducedMotion } = useAuthMotion();

  const signInForm = useForm<SignInFormValues>({
    defaultValues: signInDefaultValues,
    resolver: zodResolver(signInFormSchema),
  });
  const signUpForm = useForm<SignUpFormValues>({
    defaultValues: signUpDefaultValues,
    resolver: zodResolver(signUpFormSchema),
  });

  useSyncCredentialsOnModeChange(mode, signInForm, signUpForm);

  const signInState = useFormState({ control: signInForm.control });
  const signUpState = useFormState({ control: signUpForm.control });

  const onSignInSubmit = createSubmitHandler(
    "signin",
    signInForm,
    onSuccessAction,
    "Unable to sign in."
  );
  const onSignUpSubmit = createSubmitHandler(
    "signup",
    signUpForm,
    onSuccessAction,
    "Unable to create account."
  );

  if (isSignUp) {
    return (
      <FormProvider {...signUpForm}>
        <form
          className="flex flex-col gap-4"
          id={SIGN_UP_FORM_ID}
          onSubmit={onSignUpSubmit}
        >
          <FieldGroup>
            <div className="flex flex-col gap-4">
              <SignUpAvatarField formId={SIGN_UP_FORM_ID} />
              <Field data-invalid={signUpState.errors.name !== undefined}>
                <FieldLabel htmlFor={`${SIGN_UP_FORM_ID}-name`}>
                  Name
                </FieldLabel>
                <Input
                  aria-invalid={signUpState.errors.name !== undefined}
                  aria-required={true}
                  autoComplete="name"
                  id={`${SIGN_UP_FORM_ID}-name`}
                  placeholder="John Doe"
                  type="text"
                  {...signUpForm.register("name")}
                />
                {signUpState.errors.name ? (
                  <FieldError errors={[signUpState.errors.name]} />
                ) : null}
              </Field>
            </div>

            <EmailPasswordFields
              emailError={signUpState.errors.email}
              formId={SIGN_UP_FORM_ID}
              passwordAutoComplete="new-password"
              passwordError={signUpState.errors.password}
              passwordPlaceholder="Create a password"
              register={signUpForm.register}
            />

            <Field
              data-invalid={signUpState.errors.confirmPassword !== undefined}
            >
              <FieldLabel htmlFor={`${SIGN_UP_FORM_ID}-confirm-password`}>
                Confirm password
              </FieldLabel>
              <Input
                aria-invalid={signUpState.errors.confirmPassword !== undefined}
                autoComplete="new-password"
                id={`${SIGN_UP_FORM_ID}-confirm-password`}
                placeholder="Repeat your password"
                type="password"
                {...signUpForm.register("confirmPassword")}
              />
              {signUpState.errors.confirmPassword ? (
                <FieldError errors={[signUpState.errors.confirmPassword]} />
              ) : null}
            </Field>
          </FieldGroup>

          <FormRootError message={signUpState.errors.root?.message} />

          <SubmitButton
            fieldTransition={fieldTransition}
            formId={SIGN_UP_FORM_ID}
            pending={signUpState.isSubmitting}
            prefersReducedMotion={prefersReducedMotion}
            submitLabel="Create account"
          />
        </form>
      </FormProvider>
    );
  }

  return (
    <FormProvider {...signInForm}>
      <form
        className="flex flex-col gap-4"
        id={SIGN_IN_FORM_ID}
        onSubmit={onSignInSubmit}
      >
        <FieldGroup>
          <EmailPasswordFields
            emailError={signInState.errors.email}
            formId={SIGN_IN_FORM_ID}
            passwordAutoComplete="current-password"
            passwordError={signInState.errors.password}
            passwordPlaceholder="Your password"
            register={signInForm.register}
          />
        </FieldGroup>

        <FormRootError message={signInState.errors.root?.message} />

        <SubmitButton
          fieldTransition={fieldTransition}
          formId={SIGN_IN_FORM_ID}
          pending={signInState.isSubmitting}
          prefersReducedMotion={prefersReducedMotion}
          submitLabel="Sign in"
        />
      </form>
    </FormProvider>
  );
}

function EmailPasswordFields({
  emailError,
  formId,
  passwordAutoComplete,
  passwordError,
  passwordPlaceholder,
  register,
}: {
  emailError?: { message?: string };
  formId: string;
  passwordAutoComplete: "current-password" | "new-password";
  passwordError?: { message?: string };
  passwordPlaceholder: string;
  register: UseFormRegister<CredentialFields>;
}) {
  return (
    <>
      <Field data-invalid={emailError !== undefined}>
        <FieldLabel htmlFor={`${formId}-email`}>Email</FieldLabel>
        <Input
          aria-invalid={emailError !== undefined}
          autoComplete="email"
          id={`${formId}-email`}
          placeholder="you@example.com"
          type="email"
          {...register("email")}
        />
        {emailError ? <FieldError errors={[emailError]} /> : null}
      </Field>

      <Field data-invalid={passwordError !== undefined}>
        <FieldLabel htmlFor={`${formId}-password`}>Password</FieldLabel>
        <Input
          aria-invalid={passwordError !== undefined}
          autoComplete={passwordAutoComplete}
          id={`${formId}-password`}
          placeholder={passwordPlaceholder}
          type="password"
          {...register("password")}
        />
        {passwordError ? <FieldError errors={[passwordError]} /> : null}
      </Field>
    </>
  );
}

function SubmitButton({
  fieldTransition,
  formId,
  pending,
  prefersReducedMotion,
  submitLabel,
}: {
  fieldTransition: MotionTransition;
  formId: string;
  pending: boolean;
  prefersReducedMotion: boolean;
  submitLabel: string;
}) {
  return (
    <Button disabled={pending} form={formId} size="lg" type="submit">
      {pending ? (
        <Spinner className="size-4" />
      ) : (
        <LazyMotion features={loadMotionDomAnimation} strict>
          <AnimatePresence initial={false} mode="wait">
            <m.span
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              key={submitLabel}
              transition={fieldTransition}
            >
              {submitLabel}
            </m.span>
          </AnimatePresence>
        </LazyMotion>
      )}
    </Button>
  );
}

function FormRootError({ message }: { message?: string }) {
  if (message === undefined || message.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
