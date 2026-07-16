import { organizationCreateSchema } from "@vyrel/api/models/organization/types/base.types";
import type z from "zod/v4";

export const onboardingFormSchema = organizationCreateSchema;

export type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export const onboardingDefaultValues: OnboardingFormValues = {
  name: "",
  slug: "",
};

export function slugifyOrganizationName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
