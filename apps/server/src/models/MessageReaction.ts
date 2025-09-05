import mongoose, { Document, Schema } from 'mongoose';

export interface IMessageReaction extends Document {
  _id: mongoose.Types.ObjectId;
  message: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  emoji: string;
  createdAt: Date;
}

const messageReactionSchema = new Schema<IMessageReaction>(
  {
    message: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      required: true,
      maxlength: 10,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index to ensure one reaction per user per message per emoji
messageReactionSchema.index({ message: 1, user: 1, emoji: 1 }, { unique: true });
messageReactionSchema.index({ message: 1 });

export const MessageReaction = mongoose.model<IMessageReaction>('MessageReaction', messageReactionSchema);
