import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_STATUSES, PAYMENT_METHODS } from "./constants";

const paymentSchema = new Schema({
  amountMinor: { type: BigInt, required: true },
  paymentDate: { type: String, required: true },
  paidBy: { type: String, required: true, trim: true, maxlength: 120 },
  method: { type: String, enum: PAYMENT_METHODS, required: true },
  reference: { type: String, default: "", trim: true, maxlength: 160 },
  note: { type: String, default: "", trim: true, maxlength: 500 },
  createdBy: { type: Schema.Types.ObjectId, required: true },
}, { _id: true, timestamps: true, strict: "throw" });

const expenseSchema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  eventId: { type: Schema.Types.ObjectId, default: null },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  amountMinor: { type: BigInt, required: true },
  paidAmountMinor: { type: BigInt, required: true, default: () => BigInt(0) },
  currency: { type: String, enum: ["INR"], required: true, default: "INR" },
  category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
  expenseDate: { type: String, required: true },
  dueDate: { type: String, default: null },
  paidBy: { type: String, required: true, trim: true, maxlength: 120 },
  paymentStatus: { type: String, enum: EXPENSE_PAYMENT_STATUSES, required: true, default: "UNPAID" },
  vendorId: { type: Schema.Types.ObjectId, default: null },
  vendorName: { type: String, default: "", trim: true, maxlength: 160 },
  notes: { type: String, default: "", trim: true, maxlength: 2000 },
  payments: { type: [paymentSchema], default: [] },
  createdBy: { type: Schema.Types.ObjectId, required: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, strict: "throw" });

expenseSchema.index({ weddingId: 1, deletedAt: 1, expenseDate: -1, _id: 1 }, { name: "wedding_expense_recent" });
expenseSchema.index({ weddingId: 1, eventId: 1, deletedAt: 1, expenseDate: -1 }, { name: "wedding_event_expenses" });
expenseSchema.index({ weddingId: 1, deletedAt: 1, paymentStatus: 1, category: 1 }, { name: "wedding_expense_filters" });

export type WeddingExpense = InferSchemaType<typeof expenseSchema>;
export const ExpenseModel = (models.WeddingExpense as Model<WeddingExpense> | undefined)
  ?? model<WeddingExpense>("WeddingExpense", expenseSchema, "expenses");
