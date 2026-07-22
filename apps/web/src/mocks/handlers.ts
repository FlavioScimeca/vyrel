/**
 * MSW (Mock Service Worker) request handlers
 *
 * Define your mock API handlers here. These handlers intercept network requests
 * and return mocked responses, useful for testing and development.
 *
 * @see https://mswjs.io/docs/basics/mocking-responses
 */
import { graphql, HttpResponse, http } from "msw";

import {
  mockOrganization,
  mockOrganizations,
  mockTask,
  mockTasks,
  mockUser,
} from "./graphql-fixtures";

export const handlers = [
  http.get("/api/user", () =>
    HttpResponse.json({
      email: "john@example.com",
      id: "1",
      name: "John Doe",
    })
  ),

  http.post("/api/login", async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    if (body.email === "test@example.com" && body.password === "password") {
      return HttpResponse.json({
        success: true,
        token: "mock-jwt-token",
      });
    }

    return HttpResponse.json(
      { message: "Invalid credentials", success: false },
      { status: 401 }
    );
  }),

  graphql.query("ListOrganizations", () =>
    HttpResponse.json({
      data: { organizations: mockOrganizations },
    })
  ),

  graphql.query("ListTasks", () =>
    HttpResponse.json({
      data: { tasks: mockTasks },
    })
  ),

  graphql.query("GetUser", () =>
    HttpResponse.json({
      data: { user: mockUser },
    })
  ),

  graphql.mutation("CreateTask", ({ variables }) => {
    const input = variables.input as {
      description?: string | null;
      title: string;
    };

    return HttpResponse.json({
      data: {
        createTask: {
          ...mockTask,
          description: input.description ?? null,
          id: "task_new",
          title: input.title,
        },
      },
    });
  }),

  graphql.mutation("UpdateTask", ({ variables }) => {
    const input = variables.input as {
      description?: string | null;
      taskId: string;
      title?: string;
    };

    return HttpResponse.json({
      data: {
        updateTask: {
          ...mockTask,
          description:
            input.description === undefined
              ? mockTask.description
              : input.description,
          id: input.taskId,
          title: input.title ?? mockTask.title,
        },
      },
    });
  }),

  graphql.mutation("DeleteTask", ({ variables }) => {
    const input = variables.input as { taskId: string };

    return HttpResponse.json({
      data: {
        deleteTask: input.taskId,
      },
    });
  }),

  graphql.mutation("UpdateOrganization", ({ variables }) => {
    const input = variables.input as {
      name?: string;
      organizationId: string;
      slug?: string;
    };

    return HttpResponse.json({
      data: {
        updateOrganization: {
          ...mockOrganization,
          id: input.organizationId,
          name: input.name ?? mockOrganization.name,
          slug: input.slug ?? mockOrganization.slug,
        },
      },
    });
  }),

  graphql.mutation("DeleteOrganization", ({ variables }) => {
    const input = variables.input as { organizationId: string };

    return HttpResponse.json({
      data: {
        deleteOrganization: input.organizationId,
      },
    });
  }),

  graphql.mutation("UpdateUser", ({ variables }) => {
    const input = variables.input as { name?: string };

    return HttpResponse.json({
      data: {
        updateUser: {
          ...mockUser,
          name: input.name ?? mockUser.name,
        },
      },
    });
  }),

  graphql.mutation("DeleteUser", () =>
    HttpResponse.json({
      data: {
        deleteUser: mockUser.email,
      },
    })
  ),
];
