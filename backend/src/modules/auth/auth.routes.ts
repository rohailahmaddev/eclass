import Router from "express"
import { registerController } from "./auth.controllers.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { registerUserSchema } from "./auth.validations.js";
import { avatarUpload } from "../../middlewares/upload.middleware.js";

const router = Router ();

router.route("/register").post(
  ...avatarUpload,
  validate(registerUserSchema),
  registerController
)

export default router;
