import { Queue } from "bullmq";
import redisClient from "../databases/redis.databases.js";

const smsQueue = new Queue("smsQueue", {connection: redisClient}); 

export default smsQueue; 