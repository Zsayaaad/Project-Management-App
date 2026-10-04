import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import { authController } from "./auth.controller.js";
import { apiLimiter } from "../../middlewares/rateLimiters.js";

const router = Router();

router.post(
  "/register",
  apiLimiter,
  validate(registerSchema),
  authController.register,
);
router.post("/login", apiLimiter, validate(loginSchema), authController.login);
router.post("/logout", authController.logout);

export default router;
