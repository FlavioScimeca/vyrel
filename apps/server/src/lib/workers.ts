import { type Job, Worker } from "bullmq";
import { DateTime, Effect } from "effect";

import {
  connection,
  type EmailJobData,
  type NotificationJobData,
} from "./queue.js";

/**
 * Email worker - processes email sending jobs
 * @see https://docs.bullmq.io/guide/workers
 */
export const emailWorker = new Worker<EmailJobData>(
  "email",
  (job: Job<EmailJobData>) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const { to } = job.data;

        yield* Effect.log(`Processing email job ${job.id}: sending to ${to}`);

        // TODO: Implement your email sending logic here
        // Simulate email sending
        yield* Effect.sleep("1 second");

        yield* Effect.log(`Email job ${job.id} completed: sent to ${to}`);

        return {
          sent: true,
          timestamp: DateTime.formatIso(DateTime.unsafeNow()),
          to,
        };
      })
    ),
  {
    concurrency: 5, // Process up to 5 jobs in parallel
    connection,
    limiter: {
      duration: 60_000, // Per minute (rate limiting)
      max: 100, // Max 100 jobs
    },
  }
);

/**
 * Notification worker - processes notification jobs
 */
export const notificationWorker = new Worker<NotificationJobData>(
  "notification",
  (job: Job<NotificationJobData>) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const { userId, type } = job.data;

        yield* Effect.log(
          `Processing notification job ${job.id}: ${type} to user ${userId}`
        );

        // TODO: Implement your notification logic here
        // Simulate notification processing
        yield* Effect.sleep("500 millis");

        yield* Effect.log(`Notification job ${job.id} completed`);

        return {
          sent: true,
          timestamp: DateTime.formatIso(DateTime.unsafeNow()),
          type,
          userId,
        };
      })
    ),
  {
    concurrency: 10,
    connection,
  }
);

// Event handlers for monitoring
emailWorker.on("completed", (job) => {
  Effect.runSync(Effect.log(`Email job ${job.id} has completed`));
});

emailWorker.on("failed", (job, err) => {
  Effect.runSync(
    Effect.logError(
      `Email job ${job?.id} has failed with error: ${err.message}`
    )
  );
});

notificationWorker.on("completed", (job) => {
  Effect.runSync(Effect.log(`Notification job ${job.id} has completed`));
});

notificationWorker.on("failed", (job, err) => {
  Effect.runSync(
    Effect.logError(
      `Notification job ${job?.id} has failed with error: ${err.message}`
    )
  );
});

/**
 * Gracefully close all workers
 * Call this during application shutdown
 */
export const closeWorkers = () =>
  Effect.runPromise(
    Effect.gen(function* () {
      yield* Effect.promise(() => emailWorker.close());
      yield* Effect.promise(() => notificationWorker.close());
    })
  );

/**
 * Start all workers
 * Workers start automatically when created, but this function can be used
 * to ensure they're running or to restart after being paused
 */
export function startWorkers() {
  Effect.runSync(Effect.log("BullMQ workers started"));
  Effect.runSync(Effect.log("- Email worker: processing 'email' queue"));
  Effect.runSync(
    Effect.log("- Notification worker: processing 'notification' queue")
  );
}
