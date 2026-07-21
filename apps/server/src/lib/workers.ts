import { createLogger, log } from "@vyrel/logging";
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
        const jobLog = createLogger({
          queue: "email",
          jobId: job.id,
          to,
        });

        jobLog.set({ event: "job.start" });

        // TODO: Implement your email sending logic here
        // Simulate email sending
        yield* Effect.sleep("1 second");

        jobLog.set({ event: "job.complete", sent: true });
        jobLog.emit();

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
        const jobLog = createLogger({
          queue: "notification",
          jobId: job.id,
          userId,
          type,
        });

        jobLog.set({ event: "job.start" });

        // TODO: Implement your notification logic here
        // Simulate notification processing
        yield* Effect.sleep("500 millis");

        jobLog.set({ event: "job.complete", sent: true });
        jobLog.emit();

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
  log.info({ event: "worker.completed", queue: "email", jobId: job.id });
});

emailWorker.on("failed", (job, err) => {
  log.error({
    event: "worker.failed",
    queue: "email",
    jobId: job?.id,
    error: err.message,
  });
});

notificationWorker.on("completed", (job) => {
  log.info({
    event: "worker.completed",
    queue: "notification",
    jobId: job.id,
  });
});

notificationWorker.on("failed", (job, err) => {
  log.error({
    event: "worker.failed",
    queue: "notification",
    jobId: job?.id,
    error: err.message,
  });
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
  log.info({
    event: "workers.started",
    queues: ["email", "notification"],
  });
}
