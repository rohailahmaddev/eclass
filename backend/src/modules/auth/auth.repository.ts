import { prisma } from "../../db/prisma.js";
import { AuthDbClient, createAuthToken, CreateUserInput, publicUser } from "./auth.types.js";

export const registerUserRepo = async ({fullName, email, passwordHash, role, avatarUrl = null}: CreateUserInput, tx: AuthDbClient = prisma) : Promise<publicUser> => {
  return await tx.user.create({
    data:{
      fullName:fullName,
      email:email,
      password:passwordHash,
      role:role,
      avatar_url:avatarUrl
    },
    select:{
      id:true,
      email:true,
      fullName:true,
      role : true,
    }
  })
}

export const getUserByEmailRepo = async (email: string) => {
  return await prisma.user.findUnique({
    where: { email: email }
  })
}

export const setAuthTokenRepo = async ( { userId , type, hashedToken, tokenExpiry} : createAuthToken, tx: AuthDbClient = prisma) => {
  return await tx.authToken.create({
    data:{
      userId:userId,
      type:type,
      tokenHash:hashedToken,
      expiresAt:tokenExpiry
    }
  })
}
