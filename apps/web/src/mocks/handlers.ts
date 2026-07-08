/**
 * MSW (Mock Service Worker) request handlers
 *
 * Define your mock API handlers here. These handlers intercept network requests
 * and return mocked responses, useful for testing and development.
 *
 * @see https://mswjs.io/docs/basics/mocking-responses
 */
import { HttpResponse, http } from "msw";

export const handlers = [
  // Example: Mock a GET request to /api/user
  http.get("/api/user", () =>
    HttpResponse.json({
      email: "john@example.com",
      id: "1",
      name: "John Doe",
    })
  ),

  // Example: Mock a POST request to /api/login
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

  // Add more handlers as needed for your API endpoints
];
