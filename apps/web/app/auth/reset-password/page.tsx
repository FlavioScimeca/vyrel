import { AuthResetPasswordPage } from "@/features/auth/screen/reset-password";

type ResetPasswordSearchParams = Promise<{
  error?: string | string[];
  token?: string | string[];
}>;

const firstParam = (value: string | string[] | undefined): string | null => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: ResetPasswordSearchParams;
}) {
  const params = await searchParams;

  return (
    <AuthResetPasswordPage
      invalidToken={firstParam(params.error) !== null}
      token={firstParam(params.token)}
    />
  );
}
