import { Router } from "express";
import { validateApiKey } from "../middlewares/validateAPI.middlewares.js";
import { smsLimiter } from "../middlewares/rateLimiter.middlewares.js";
import smsHandler from "./handlers/sms.handlers.js";

const smsRouter = Router();

smsRouter.use(validateApiKey);

smsRouter.post(`/`, smsLimiter, smsHandler["send-sms"]);

export default smsRouter;
