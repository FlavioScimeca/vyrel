import { type ConnectionOptions, Queue } from "bullmq";
import { Config, Effect, Option } from "effect";

const redisConfig = Effect.runSync(
  Effect.all({
    host: Config.string("REDIS_HOST").pipe(Config.withDefault("localhost")),
    password: Config.option(Config.string("REDIS_PASSWORD")),
    port: Config.integer("REDIS_PORT").pipe(Config.withDefault(6379)),
  })
);

export const connection: ConnectionOptions = {
  host: redisConfig.host,
  maxRetriesPerRequest: null,
  password: Option.getOrUndefined(redisConfig.password),
  port: redisConfig.port,
};

/**
 * Example queue for background job processing
 * @see https://docs.bullmq.io/
 */
export const emailQueue = new Queue("email", { connection });
export const notificationQueue = new Queue("notification", { connection });

// Define job data types
export interface EmailJobData {
  body: string;
  subject: string;
  templateId?: string;
  to: string;
}

export interface NotificationJobData {
  data?: Record<string, unknown>;
  message: string;
  title: string;
  type: "push" | "in-app" | "sms";
  userId: string;
}

/**
 * Add an email job to the queue
 */
export function queueEmail(
  data: EmailJobData,
  options?: { delay?: number; priority?: number }
) {
  return emailQueue.add("send-email", data, {
    attempts: 3,
    backoff: {
      delay: 1000,
      type: "exponential",
    },
    delay: options?.delay,
    priority: options?.priority,
  });
}

/**
 * Add a notification job to the queue
 */
export function queueNotification(
  data: NotificationJobData,
  options?: { delay?: number }
) {
  return notificationQueue.add("send-notification", data, {
    attempts: 3,
    backoff: {
      delay: 1000,
      type: "exponential",
    },
    delay: options?.delay,
  });
}

/**
 * Schedule a recurring job (cron-style)
 * @example scheduleRecurringJob(emailQueue, "daily-report", { type: "report" }, "0 9 * * *")
 */
export function scheduleRecurringJob<T>(
  queue: Queue,
  name: string,
  data: T,
  pattern: string // Cron pattern
) {
  return queue.upsertJobScheduler(
    name,
    { pattern },
    { data: data as object, name }
  );
}

/**
 * Get queue statistics
 */
export const getQueueStats = (queue: Queue) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const [waiting, active, completed, failed, delayed] =
        yield* Effect.promise(() =>
          Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
          ])
        );

      return { active, completed, delayed, failed, waiting };
    })
  );

/**
 * Gracefully close all queues and connections
 * Call this during application shutdown
 */
export const closeQueues = () =>
  Effect.runPromise(
    Effect.gen(function* () {
      yield* Effect.promise(() => emailQueue.close());
      yield* Effect.promise(() => notificationQueue.close());
    })
  );
