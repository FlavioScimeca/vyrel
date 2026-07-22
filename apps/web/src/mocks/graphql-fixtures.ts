const now = "2026-01-15T12:00:00.000Z";

export const mockOrganization = {
  __typename: "Organization" as const,
  createdAt: now,
  id: "org_1",
  imageFull: null,
  imageThumb: null,
  logo: null,
  name: "Acme Inc.",
  slug: "acme-inc",
};

export const mockOrganizations = [mockOrganization];

export const mockUser = {
  __typename: "User" as const,
  createdAt: now,
  email: "jane@example.com",
  emailVerified: true,
  imageFull: null,
  imageThumb: null,
  name: "Jane Doe",
  updatedAt: now,
};

export const mockTask = {
  __typename: "Task" as const,
  createdAt: now,
  description: "Ship the dashboard GraphQL migration",
  id: "task_1",
  imageFull: null,
  imageThumb: null,
  title: "Migrate GraphQL to RSC",
  updatedAt: now,
};

export const mockTasks = [mockTask];
