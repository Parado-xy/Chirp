import { Router } from "express";
import { validateApiKey } from "../middlewares/validateAPI.middlewares.js";

const smsRouter = Router(); 

smsRouter.use(validateApiKey); 

import smsHandler from "./handlers/sms.handlers.js";

smsRouter.post(`/`, smsHandler['send-sms']); 

export default smsRouter; 

