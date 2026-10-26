import { isValidObjectId, type ClientSession, type FilterQuery } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { AuthError } from "@/modules/auth/request-security";
import { EventModel } from "@/modules/events/models";
import { WeddingMemberModel, WeddingModel } from "@/modules/weddings/models";
import { canManageFinances, EXPENSES_PAGE_SIZE, EXPENSE_CATEGORIES } from "./constants";
import { ExpenseModel, VendorModel, type WeddingExpense } from "./models";
import type { CreateExpenseInput, ExpenseListQuery, RecordExpensePaymentInput, UpdateExpenseInput } from "./schemas";

export async function createExpense(userId: string, weddingId: string, input: CreateExpenseInput) {
  await connectToDatabase();
  const membership = await requireFinanceAccess(userId, weddingId);
  const event = await validateEvent(weddingId, input.eventId);
  const vendor = await validateVendor(weddingId, input.vendorId);
  const amountMinor = BigInt(input.amountMinor);
  const paidAmountMinor = BigInt(input.initialPaidAmountMinor);
  const paymentStatus = derivePaymentStatus(amountMinor, paidAmountMinor);
  const payments = paidAmountMinor > BigInt(0) ? [{
    amountMinor: paidAmountMinor,
    paymentDate: input.expenseDate,
    paidBy: input.paidBy,
    method: input.initialPaymentMethod,
    reference: input.initialPaymentReference,
    note: "Initial payment",
    createdBy: userId,
  }] : [];
  const expense = await ExpenseModel.create({
    weddingId,
    eventId: input.eventId,
    title: input.title,
    amountMinor,
    paidAmountMinor,
    currency: "INR",
    category: input.category,
    expenseDate: input.expenseDate,
    dueDate: input.dueDate,
    paidBy: input.paidBy,
    paymentStatus,
    vendorId: vendor?._id ?? null,
    vendorName: vendor?.name ?? input.vendorName,
    notes: input.notes,
    payments,
    createdBy: userId,
  });
  return { expense: serializeExpense(expense, event), canManage: canManageFinances(membership.role) };
}

export async function listExpenses(userId: string, weddingId: string, query: ExpenseListQuery) {
  await connectToDatabase();
  await requireFinanceAccess(userId, weddingId);
  const filter: FilterQuery<WeddingExpense> = { weddingId, deletedAt: null };
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.category) filter.category = query.category;
  if (query.eventId) filter.eventId = query.eventId;
  if (query.dateFrom || query.dateTo) filter.expenseDate = {
    ...(query.dateFrom ? { $gte: query.dateFrom } : {}),
    ...(query.dateTo ? { $lte: query.dateTo } : {}),
  };
  if (query.q) filter.$or = [
    { title: { $regex: escapeRegex(query.q), $options: "i" } },
    { vendorName: { $regex: escapeRegex(query.q), $options: "i" } },
    { notes: { $regex: escapeRegex(query.q), $options: "i" } },
  ];

  const [expenses, total, allExpenses, events, vendors] = await Promise.all([
    ExpenseModel.find(filter).sort({ expenseDate: -1, createdAt: -1, _id: 1 }).skip((query.page - 1) * EXPENSES_PAGE_SIZE).limit(EXPENSES_PAGE_SIZE).lean(),
    ExpenseModel.countDocuments(filter),
    ExpenseModel.find({ weddingId, deletedAt: null }).select("amountMinor paidAmountMinor category eventId paymentStatus expenseDate title vendorName").sort({ expenseDate: -1 }).lean(),
    EventModel.find({ weddingId, deletedAt: null }).sort({ startsAtUtc: 1, _id: 1 }).lean(),
    VendorModel.find({ weddingId, deletedAt: null }).select("name category").sort({ name: 1, _id: 1 }).lean(),
  ]);
  const eventById = new Map(events.map((event) => [String(event._id), event]));
  return {
    expenses: expenses.map((expense) => serializeExpense(expense, expense.eventId ? eventById.get(String(expense.eventId)) ?? null : null)),
    summary: summarizeExpenses(allExpenses),
    total,
    page: query.page,
    pageSize: EXPENSES_PAGE_SIZE,
    eventOptions: events.filter((event) => event.status !== "CANCELLED").map((event) => ({ id: String(event._id), name: event.name, localDate: event.localDate })),
    vendorOptions: vendors.map((vendor) => ({ id: String(vendor._id), name: vendor.name, category: vendor.category })),
  };
}

export async function getExpense(userId: string, weddingId: string, expenseId: string) {
  await connectToDatabase();
  await requireFinanceAccess(userId, weddingId);
  if (!isValidObjectId(expenseId)) return null;
  const expense = await ExpenseModel.findOne({ _id: expenseId, weddingId, deletedAt: null }).lean();
  if (!expense) return null;
  const event = expense.eventId ? await EventModel.findOne({ _id: expense.eventId, weddingId }).lean() : null;
  return serializeExpense(expense, event);
}

export async function updateExpense(userId: string, weddingId: string, expenseId: string, input: UpdateExpenseInput) {
  const database = await connectToDatabase();
  assertObjectId(expenseId, "Expense not found.");
  const session = await database.startSession();
  try {
    return await session.withTransaction(async () => {
      await lockFinanceWedding(userId, weddingId, session);
      const expense = await ExpenseModel.findOne({ _id: expenseId, weddingId, deletedAt: null }).session(session);
      if (!expense) throw new AuthError("NOT_FOUND", "Expense not found.", 404);
      const eventId = input.eventId !== undefined ? input.eventId : expense.eventId ? String(expense.eventId) : null;
      const event = await validateEvent(weddingId, eventId, session, input.eventId === undefined);
      const vendorId = input.vendorId !== undefined ? input.vendorId : expense.vendorId ? String(expense.vendorId) : null;
      const vendor = await validateVendor(weddingId, vendorId, session, input.vendorId === undefined);
      const nextAmount = input.amountMinor !== undefined ? BigInt(input.amountMinor) : expense.amountMinor;
      if (nextAmount < expense.paidAmountMinor) throw new AuthError("AMOUNT_BELOW_PAID", "Total amount cannot be less than payments already recorded.", 409);
      const expenseDate = input.expenseDate ?? expense.expenseDate;
      const dueDate = input.dueDate !== undefined ? input.dueDate : expense.dueDate;
      if (dueDate && dueDate < expenseDate) throw new AuthError("INVALID_DUE_DATE", "Due date cannot be before the expense date.", 400);
      expense.set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.amountMinor !== undefined ? { amountMinor: nextAmount } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.eventId !== undefined ? { eventId: input.eventId } : {}),
        ...(input.expenseDate !== undefined ? { expenseDate: input.expenseDate } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        ...(input.paidBy !== undefined ? { paidBy: input.paidBy } : {}),
        ...(input.vendorId !== undefined ? { vendorId: vendor?._id ?? null, vendorName: vendor?.name ?? input.vendorName ?? "" } : input.vendorName !== undefined ? { vendorName: input.vendorName } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        paymentStatus: derivePaymentStatus(nextAmount, expense.paidAmountMinor),
      });
      await expense.save({ session });
      return { expense: serializeExpense(expense, event) };
    });
  } finally {
    await session.endSession();
  }
}

export async function recordExpensePayment(userId: string, weddingId: string, expenseId: string, input: RecordExpensePaymentInput) {
  const database = await connectToDatabase();
  assertObjectId(expenseId, "Expense not found.");
  const session = await database.startSession();
  try {
    return await session.withTransaction(async () => {
      await lockFinanceWedding(userId, weddingId, session);
      const expense = await ExpenseModel.findOne({ _id: expenseId, weddingId, deletedAt: null }).session(session);
      if (!expense) throw new AuthError("NOT_FOUND", "Expense not found.", 404);
      const paymentAmount = BigInt(input.amountMinor);
      const outstanding = expense.amountMinor - expense.paidAmountMinor;
      if (paymentAmount > outstanding) throw new AuthError("PAYMENT_EXCEEDS_BALANCE", "Payment cannot exceed the outstanding balance.", 409);
      expense.payments.push({ ...input, amountMinor: paymentAmount, createdBy: userId } as never);
      expense.paidAmountMinor += paymentAmount;
      expense.paymentStatus = derivePaymentStatus(expense.amountMinor, expense.paidAmountMinor);
      await expense.save({ session });
      const event = expense.eventId ? await EventModel.findOne({ _id: expense.eventId, weddingId }).session(session).lean() : null;
      return { expense: serializeExpense(expense, event) };
    });
  } finally {
    await session.endSession();
  }
}

export async function removeExpense(userId: string, weddingId: string, expenseId: string) {
  await connectToDatabase();
  assertObjectId(expenseId, "Expense not found.");
  await requireFinanceAccess(userId, weddingId);
  const expense = await ExpenseModel.findOneAndUpdate(
    { _id: expenseId, weddingId, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true },
  );
  if (!expense) throw new AuthError("NOT_FOUND", "Expense not found.", 404);
  return { id: String(expense._id), removed: true as const };
}

export async function getExpenseDashboardSummary(userId: string, weddingId: string) {
  await connectToDatabase();
  await requireFinanceAccess(userId, weddingId);
  const expenses = await ExpenseModel.find({ weddingId, deletedAt: null }).sort({ expenseDate: -1, createdAt: -1 }).lean();
  const summary = summarizeExpenses(expenses);
  return {
    ...summary,
    recent: expenses.slice(0, 4).map((expense) => ({
      id: String(expense._id), title: expense.title, amountMinor: expense.amountMinor.toString(),
      paidAmountMinor: expense.paidAmountMinor.toString(), paymentStatus: expense.paymentStatus, expenseDate: expense.expenseDate,
    })),
  };
}

export async function requireFinanceAccess(userId: string, weddingId: string, session?: ClientSession) {
  if (!isValidObjectId(weddingId)) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  const membership = await WeddingMemberModel.findOne({ userId, weddingId, status: "ACTIVE" }).session(session ?? null).lean();
  if (!membership) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  if (!canManageFinances(membership.role)) throw new AuthError("FORBIDDEN", "Only Admins and Managers can access wedding finances.", 403);
  return membership;
}

async function lockFinanceWedding(userId: string, weddingId: string, session: ClientSession) {
  if (!isValidObjectId(weddingId)) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  const wedding = await WeddingModel.findOneAndUpdate({ _id: weddingId }, { $inc: { financeVersion: 1 } }, { new: true, session, timestamps: false });
  if (!wedding) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  await requireFinanceAccess(userId, weddingId, session);
  return wedding;
}

async function validateEvent(weddingId: string, eventId: string | null | undefined, session?: ClientSession, allowUnavailable = false) {
  if (!eventId) return null;
  const event = await EventModel.findOne({ _id: eventId, weddingId, ...(allowUnavailable ? {} : { deletedAt: null, status: { $ne: "CANCELLED" } }) }).session(session ?? null).lean();
  if (!event) throw new AuthError("INVALID_EVENT", "Choose an available ceremony from this wedding.", 409);
  return event;
}

async function validateVendor(weddingId: string, vendorId: string | null | undefined, session?: ClientSession, allowArchived = false) {
  if (!vendorId) return null;
  const vendor = await VendorModel.findOne({ _id: vendorId, weddingId, ...(allowArchived ? {} : { deletedAt: null }) }).session(session ?? null).lean();
  if (!vendor) throw new AuthError("INVALID_VENDOR", "Choose an active vendor from this wedding.", 409);
  return vendor;
}

function serializeExpense(expense: WeddingExpense & { _id: unknown; createdAt: Date; updatedAt: Date }, event: { _id: unknown; name: string; localDate: string; status: string } | null | undefined) {
  const amount = toBigInt(expense.amountMinor);
  const paid = toBigInt(expense.paidAmountMinor);
  const amountMinor = amount.toString();
  const paidAmountMinor = paid.toString();
  return {
    id: String(expense._id), title: expense.title, amountMinor, paidAmountMinor,
    balanceMinor: (amount - paid).toString(), currency: "INR" as const,
    category: expense.category, expenseDate: expense.expenseDate, dueDate: expense.dueDate ?? null,
    paidBy: expense.paidBy, paymentStatus: expense.paymentStatus, vendorId: expense.vendorId ? String(expense.vendorId) : null, vendorName: expense.vendorName ?? "", notes: expense.notes ?? "",
    eventId: expense.eventId ? String(expense.eventId) : null,
    event: event ? { id: String(event._id), name: event.name, localDate: event.localDate, status: event.status } : null,
    payments: expense.payments.map((payment) => ({
      id: String(payment._id), amountMinor: toBigInt(payment.amountMinor).toString(), paymentDate: payment.paymentDate,
      paidBy: payment.paidBy, method: payment.method, reference: payment.reference ?? "", note: payment.note ?? "",
      createdAt: payment.createdAt.toISOString(),
    })),
    createdBy: String(expense.createdBy), createdAt: expense.createdAt.toISOString(), updatedAt: expense.updatedAt.toISOString(),
  };
}

function summarizeExpenses(expenses: Array<{ amountMinor: unknown; paidAmountMinor: unknown; category: string; eventId?: unknown; paymentStatus: string }>) {
  let totalMinor = BigInt(0);
  let paidMinor = BigInt(0);
  const categoryTotals = new Map<string, bigint>();
  const eventTotals = new Map<string, bigint>();
  const statusCounts = { UNPAID: 0, PARTIAL: 0, PAID: 0 };
  for (const expense of expenses) {
    const amount = toBigInt(expense.amountMinor);
    const paid = toBigInt(expense.paidAmountMinor);
    totalMinor += amount;
    paidMinor += paid;
    categoryTotals.set(expense.category, (categoryTotals.get(expense.category) ?? BigInt(0)) + amount);
    const eventKey = expense.eventId ? String(expense.eventId) : "GENERAL";
    eventTotals.set(eventKey, (eventTotals.get(eventKey) ?? BigInt(0)) + amount);
    if (expense.paymentStatus in statusCounts) statusCounts[expense.paymentStatus as keyof typeof statusCounts] += 1;
  }
  return {
    count: expenses.length,
    totalMinor: totalMinor.toString(),
    paidMinor: paidMinor.toString(),
    outstandingMinor: (totalMinor - paidMinor).toString(),
    statusCounts,
    categoryTotals: EXPENSE_CATEGORIES.map((category) => ({ category, amountMinor: (categoryTotals.get(category) ?? BigInt(0)).toString() })).filter((item) => item.amountMinor !== "0"),
    eventTotals: [...eventTotals.entries()].map(([eventId, amount]) => ({ eventId: eventId === "GENERAL" ? null : eventId, amountMinor: amount.toString() })),
  };
}

function derivePaymentStatus(amount: bigint, paid: bigint): "UNPAID" | "PARTIAL" | "PAID" { return paid === BigInt(0) ? "UNPAID" : paid >= amount ? "PAID" : "PARTIAL"; }
function toBigInt(value: unknown) { return BigInt(String(value)); }
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function assertObjectId(value: string, message: string) { if (!isValidObjectId(value)) throw new AuthError("NOT_FOUND", message, 404); }

export type ExpenseView = ReturnType<typeof serializeExpense>;
export type ExpenseListView = Awaited<ReturnType<typeof listExpenses>>;
