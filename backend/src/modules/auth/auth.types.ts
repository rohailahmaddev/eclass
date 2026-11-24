import { PrismaClient } from "@prisma/client/extension"

type userRole = "ADMIN" | "TEACHER" | "STUDENT"

export type registerUserInput = {
  fullName : string,
  email : string,
  password : string,
  role : Exclude<userRole,"ADMIN">,
  fileBuffer : Buffer | undefined
}

export type CreateUserInput = {
  fullName: string;
  email: string;
  passwordHash: string;
  role: "TEACHER" | "STUDENT";
  avatarUrl?: string | null;
};

export type user = {
  fullName : string,
  email : string,
  passwordHash : string,
  role : userRole,
  emailVerifiedAt : Date | null,
  avatarUrl : string | null,
  createAt : Date,
  updatedAt : Date,
  DeletedAt : Date | null
}

export type loginInput = {
  fullName : string,
  email : string,
  password : string
}

export type publicUser = {
  id : string,
  fullName : string,
  email : string,
  role : userRole
}

export type AuthTokenType = "email_verification"|"password_reset";
export type AuthDbClient = Pick<PrismaClient, "user" | "authToken">;

export type createAuthToken = {
  userId:string,
  type:AuthTokenType,
  hashedToken:string,
  tokenExpiry:Date
}
