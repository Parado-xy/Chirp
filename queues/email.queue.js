import { Queue } from "bullmq";
import redisClient from "../databases/redis.databases.js";

// Create redis emailQueue. 
const emailQueue = new Queue("emailQueue", {
    connection: redisClient
});

export default emailQueue; 