import type { NextFunction, Request, Response } from "express";
import type { ZodError, ZodType } from "zod";
import { cleanupUploadedFiles } from "../utils/cleanupUploadFile.js";

type Target = "body" | "query" | "params";

interface FieldError {
  field: string;
  message: string;
  code: string;
}

interface ValidationErrorBody {
  success: false;
  /** Short, human-readable summary: the first problem found. */
  message: string;
  errors: {
    /** Problems not tied to a single field (e.g. a refine() on the whole object). */
    formErrors: string[];
    /** field path -> all messages, e.g. { "password": ["Password must be at least 8 characters"] } */
    fieldErrors: Record<string, string[]>;
  };
  /** Flat list, handy for rendering a summary or for logging. */
  issues: FieldError[];
}

/** "address.0.city" for nested / array paths. Never throws on symbol keys. */
const pathToField = (path: ReadonlyArray<PropertyKey>): string =>
  path.map((segment) => String(segment)).join(".");

const formatZodError = (error: ZodError): ValidationErrorBody => {
  const issues: FieldError[] = [];
  const formErrors: string[] = [];
  const fieldErrors: Record<string, string[]> = Object.create(null);

  for (const issue of error.issues) {
    const field = pathToField(issue.path);

    issues.push({ field, message: issue.message, code: issue.code });

    if (!field) {
      formErrors.push(issue.message);
      continue;
    }

    // Deliberately do NOT echo the submitted value back (passwords, tokens, PII).
    (fieldErrors[field] ??= []).push(issue.message);
  }

  return {
    success: false,
    message: issues[0]?.message ?? "Validation failed",
    errors: { formErrors, fieldErrors },
    issues,
  };
};

/**
 * Express 5: req.query is a read-only getter, so it can't be reassigned.
 * Redefine it as an own property so downstream handlers read the parsed value.
 */
const assignParsed = (req: Request, target: Target, data: unknown): void => {
  if (target === "body") {
    req.body = data;
  } else {
    Object.defineProperty(req, target, {
      value: data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
};

/*
 * Validates part of the request against a Zod schema.
 */
export const validate = <T extends ZodType>(schema: T, target: Target = "body") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Express 5: req.body is undefined when nothing was sent
      const input = target === "body" ? req[target] ?? {} : req[target];

      // safeParseAsync so schemas with async refinements (e.g. "email already taken") work too
      const result = await schema.safeParseAsync(input);

      if (!result.success) {
        cleanupUploadedFiles(req);
        return res.status(400).json(formatZodError(result.error));
      }

      assignParsed(req, target, result.data);
      return next();
    } catch (err) {
      // Anything thrown here is a bug (e.g. a refinement that threw), not bad user input.
      cleanupUploadedFiles(req);
      return next(err);
    }
  };
};
