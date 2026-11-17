import pino, { type LoggerOptions } from "pino";
import { env } from "../config/env.js";

const nodeMode = env.NODE_ENV ?? "development";
const isProd = nodeMode === "production";
const isTest = nodeMode === "test";

// LOG_LEVEL overrides the environment-based default.
// Changing it requires the application to reload its configuration.
const level =
  env.LOG_LEVEL ?? (isTest ? "silent" : isProd ? "info" : "debug");

/**
 * Anything matching these paths is replaced with "[REDACTED]" before it is written.
 * Add every secret-bearing field your API handles. Wildcards cost a little
 * performance, so keep the list focused.
 */
const redactPaths = [
  // HTTP headers
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',

  // Credentials, top level and one level deep (e.g. { body: { password } })
  "password",
  "newPassword",
  "currentPassword",
  "confirmPassword",
  "token",
  "accessToken",
  "refreshToken",
  "*.password",
  "*.newPassword",
  "*.currentPassword",
  "*.confirmPassword",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
];

const options: LoggerOptions = {
  level,

  // Fields attached to every log line. Setting `base` drops the default pid/hostname.
  base: {
    service: env.SERVICE_NAME ?? "eclass-api",
    nodeMode,
  },

  // ISO timestamps are easy for log platforms (Railway, Datadog, Loki...) to parse.
  timestamp: pino.stdTimeFunctions.isoTime,

  // "level":"info" instead of "level":30, which is friendlier to log search.
  formatters: {
    level: (label) => ({ level: label }),
  },

  redact: {
    paths: redactPaths,
    censor: "[REDACTED]",
  },

  // Errors logged as { err } or { error } get message, type and stack serialized properly.
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },

  // Pretty output ONLY in local development.
  // In production, write plain JSON to stdout and let the platform collect it:
  // transports run in a worker thread and add overhead you don't need there.
  ...(isProd || isTest
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss.l",
            ignore: "service,env",
          },
        },
      }),
};

export const logger = pino(options);

/**
 * Per-module child logger so every line carries its origin:
 *   const log = createLogger("auth.service");
 *   log.info({ userId }, "user registered");
 */
export const createLogger = (module: string) => logger.child({ module });
