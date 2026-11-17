import { randomUUID } from "node:crypto";
import { logger } from "./logger.js";
import { pinoHttp } from "pino-http";

/** Accept a caller/proxy-supplied request ID only if it looks safe; otherwise generate one. */
const SAFE_REQUEST_ID = /^[\w-]{8,64}$/;

/** Drop the query string: it can contain tokens (?token=..., ?code=...). */
const stripQuery = (url?: string) => url?.split("?")[0];

export const httpLogger = pinoHttp({
  logger,

  // Correlate every log line of a request. Also returned to the client for support tickets.
  genReqId: (req, res) => {
    const incoming = req.headers["x-request-id"];
    const id =
      typeof incoming === "string" && SAFE_REQUEST_ID.test(incoming)
        ? incoming
        : randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },

  // 5xx -> error, 4xx -> warn, everything else -> info
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },

  customSuccessMessage: (req, res) =>
    `${req.method} ${stripQuery(req.url)} ${res.statusCode}`,
  customErrorMessage: (req, res) =>
    `${req.method} ${stripQuery(req.url)} ${res.statusCode} failed`,

  // Don't flood logs with health checks from load balancers / uptime monitors.
  autoLogging: {
    ignore: (req) => stripQuery(req.url) === "api/v1/health",
  },

  // Keep request/response logs small and free of headers and bodies.
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: stripQuery(req.url),
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
