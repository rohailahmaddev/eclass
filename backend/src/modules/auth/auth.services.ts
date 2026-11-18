import { ApiError } from "../../error/apiError.js";
import { uploadAvatar } from "../../integrations/cloudinary/cloudinary.services.js";
import { createLogger } from "../../logger/logger.js";
import { getUserByEmailRepo, registerUserRepo, setAuthTokenRepo } from "./auth.repository.js";
import { publicUser, registerUserInput } from "./auth.types.js";
import { UploadApiResponse } from "cloudinary";
import { getTemporaryToken, hashPassword } from "./auth.utils.js";
import { StoredImage } from "../../integrations/cloudinary/cloudinary.type.js";
import { prisma } from "../../db/prisma.js";


const logger = createLogger("authServices")

export const registerUserService = async ({
  fullName,
  email,
  password,
  role,
  fileBuffer
}:registerUserInput) => {


  let existingUser = await getUserByEmailRepo(email);

  if(existingUser) {
    if(existingUser?.emailVerifiedAt){
      throw new ApiError(409, "User already exist. Please login.")
    }
    if(!existingUser?.emailVerifiedAt){
      //email service
      throw new ApiError(409, "User already. Please check your email for verification link.")
    }
  }

  let avatarImage : StoredImage | null = null;
  if(fileBuffer){
    avatarImage = await uploadAvatar(fileBuffer);
  }

  const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()
  const avatarUrl = avatarImage?.url ?? null;
  const passwordHash = await hashPassword(password)

  let user:publicUser|null;
  try {
    user = await prisma.$transaction(async (tx) => {
    const newUser = await registerUserRepo(
      {
        fullName,
        email,
        passwordHash,
        role,
        avatarUrl,
      },
      tx
    );
    await setAuthTokenRepo(
      {
        userId: newUser.id,
        type: "email_verification",
        hashedToken,
        tokenExpiry,
      },
      tx
    );
    return newUser;
  });

  logger.info({userId:user?.id} ,"User register successfully.")

  } catch (error) {
    logger.info({error} ,"User registration fail.")
    throw new ApiError(500,"Something went wrong.");
  }


}
