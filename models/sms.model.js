import mongoose from "mongoose";

import { Schema } from "mongoose";

const SmsSchema = new Schema(
    {
        from: String,
        to: String,
        subject: String,
        content: String,
        status: {
            type: String,
            enum: ["queued","sent","failed"],
            default: "queued"
        },
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }
)

const SMS = mongoose.model('SMS', SmsSchema);

export default SMS; 