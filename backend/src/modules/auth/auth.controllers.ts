import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { registerUserService } from "./auth.services.js";

export const registerController = asyncHandler(async( req, res ) => {
  const user = await registerUserService({
    fullName: req.body?.fullName as string,
    email: req.body?.email as string,
    password: req.body?.password as string,
    role: req.body?.role, // e.g., req.body?.role as UserRole
    fileBuffer: req.file?.buffer,
  })

  return res
  .status(201)
  .json(new ApiResponse(201, user, "User register successfully."));
})
