import mongoose from "mongoose";

import { Schema } from "mongoose";

const EmailSchema = new Schema(
    {
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

const Email = mongoose.model('Email', EmailSchema);

export default Email; 