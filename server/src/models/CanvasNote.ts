import mongoose, { Schema, Document } from 'mongoose';

export interface ICanvasNote extends Document {
  userId: mongoose.Types.ObjectId;
  content: string;
  x: number;
  y: number;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const CanvasNoteSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '' },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    color: { type: String, default: '#fef9c3' },
  },
  { timestamps: true }
);

export default mongoose.model<ICanvasNote>('CanvasNote', CanvasNoteSchema);
