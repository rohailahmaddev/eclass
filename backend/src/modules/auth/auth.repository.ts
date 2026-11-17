import { prisma } from "../../db/prisma.js";
import { user } from "./auth.types.js";

export const registerUserRepo = async ({fullName, email, passwordHash, role, avatarUrl = null} : user) => {
  await prisma.user.create({
    data:{
      fullName:fullName,
      email:email,
      password:passwordHash,
      role:role,
      avatar_url:avatarUrl
    }
  })
}
