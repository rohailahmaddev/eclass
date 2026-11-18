import bcrypt from "bcrypt";
import crypto from "crypto";
import { env } from "../../config/env.js";

export const hashPassword = async (password:string):Promise<string> => {
  const hashedPassword = await bcrypt.hash(password,10)
  return hashedPassword;
}


export const getTemporaryToken = () => {

  const unHashedToken = crypto.randomBytes(20).toString("hex")

  const hashedToken = crypto.createHmac('sha256', env.TEMPORARY_TOKEN_SECRET)
               .update(unHashedToken)
               .digest('hex');

  const tokenExpiry = new Date(Date.now() + 20 * 60 * 1000); //20mins

  return { unHashedToken, hashedToken, tokenExpiry }

}

