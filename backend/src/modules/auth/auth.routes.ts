import Router from "express"
import { registerController } from "./auth.controllers.js";

const router = Router ();

router.route("/register").post(
  registerController
)

export default router;
