import z from "zod";

export const registerUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters"),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),

  password: z
    .string()
    .trim()
    .min(8, "Password must be at least 8 characters")
    .max(10, "Password must not exceed 10 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),

  role: z.enum(["TEACHER","STUDENT"],{
      message: "Role must be student and teacher",
    })
})
