import { isValidObjectId, type ClientSession, type FilterQuery } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { AuthError } from "@/modules/auth/request-security";
import { EventModel } from "@/modules/events/models";
import { WeddingMemberModel, WeddingModel } from "@/modules/weddings/models";
import { VENDORS_PAGE_SIZE, canManageFinances } from "./constants";
import { ExpenseModel, VendorModel, type WeddingVendor } from "./models";
import type { CreateVendorInput, UpdateVendorInput, VendorListQuery } from "./vendor-schemas";

export async function createVendor(userId: string, weddingId: string, input: CreateVendorInput) {
  await connectToDatabase();
  await requireVendorAccess(userId, weddingId);
  const events = await validateEvents(weddingId, input.eventIds);
  const vendor = await VendorModel.create({
    weddingId,
    name: input.name,
    category: input.category,
    contactName: input.contactName,
    email: input.email.toLowerCase(),
    phone: input.phone,
    address: input.address,
    eventIds: input.eventIds,
    quotedAmountMinor: input.quotedAmountMinor === null ? null : BigInt(input.quotedAmountMinor),
    paidAmountMinor: BigInt(input.paidAmountMinor),
    currency: "INR",
    notes: input.notes,
    createdBy: userId,
  });
  return { vendor: serializeVendor(vendor, events, []) };
}

export async function listVendors(userId: string, weddingId: string, query: VendorListQuery) {
  await connectToDatabase();
  await requireVendorAccess(userId, weddingId);
  const filter: FilterQuery<WeddingVendor> = { weddingId, deletedAt: null };
  if (query.category) filter.category = query.category;
  if (query.eventId) filter.eventIds = query.eventId;
  if (query.q) filter.$or = [
    { name: { $regex: escapeRegex(query.q), $options: "i" } },
    { contactName: { $regex: escapeRegex(query.q), $options: "i" } },
    { notes: { $regex: escapeRegex(query.q), $options: "i" } },
  ];

  const [matching, allVendors, events] = await Promise.all([
    VendorModel.find(filter).lean(),
    VendorModel.find({ weddingId, deletedAt: null }).lean(),
    EventModel.find({ weddingId, deletedAt: null }).sort({ startsAtUtc: 1, _id: 1 }).lean(),
  ]);
  const eventById = new Map(events.map((event) => [String(event._id), event]));
  let filtered = matching.filter((vendor) => !query.paymentStatus || deriveVendorPaymentStatus(vendor.quotedAmountMinor, vendor.paidAmountMinor) === query.paymentStatus);
  filtered = filtered.sort((left, right) => {
    if (query.sort === "NAME") return left.name.localeCompare(right.name, "en-IN");
    if (query.sort === "PENDING") return compareBigInt(pendingAmount(right), pendingAmount(left)) || left.name.localeCompare(right.name, "en-IN");
    return right.createdAt.getTime() - left.createdAt.getTime() || String(right._id).localeCompare(String(left._id));
  });
  const total = filtered.length;
  const pageStart = (query.page - 1) * VENDORS_PAGE_SIZE;
  const page = filtered.slice(pageStart, pageStart + VENDORS_PAGE_SIZE);

  return {
    vendors: page.map((vendor) => serializeVendor(vendor, vendor.eventIds.map((id) => eventById.get(String(id))).filter(Boolean) as EventSummary[], [])),
    summary: summarizeVendors(allVendors),
    total,
    page: query.page,
    pageSize: VENDORS_PAGE_SIZE,
    eventOptions: events.filter((event) => event.status !== "CANCELLED").map((event) => ({ id: String(event._id), name: event.name, localDate: event.localDate })),
  };
}

export async function getVendor(userId: string, weddingId: string, vendorId: string) {
  await connectToDatabase();
  await requireVendorAccess(userId, weddingId);
  if (!isValidObjectId(vendorId)) return null;
  const vendor = await VendorModel.findOne({ _id: vendorId, weddingId, deletedAt: null }).lean();
  if (!vendor) return null;
  const [events, expenses] = await Promise.all([
    EventModel.find({ _id: { $in: vendor.eventIds }, weddingId }).sort({ startsAtUtc: 1, _id: 1 }).lean(),
    ExpenseModel.find({ weddingId, vendorId: vendor._id, deletedAt: null }).sort({ expenseDate: -1, createdAt: -1 }).lean(),
  ]);
  return serializeVendor(vendor, events, expenses);
}

export async function updateVendor(userId: string, weddingId: string, vendorId: string, input: UpdateVendorInput) {
  const database = await connectToDatabase();
  assertObjectId(vendorId);
  const session = await database.startSession();
  try {
    return await session.withTransaction(async () => {
      await lockFinanceWedding(userId, weddingId, session);
      const vendor = await VendorModel.findOne({ _id: vendorId, weddingId, deletedAt: null }).session(session);
      if (!vendor) throw new AuthError("NOT_FOUND", "Vendor not found.", 404);
      const eventIds = input.eventIds ?? vendor.eventIds.map(String);
      const events = input.eventIds ? await validateEvents(weddingId, eventIds, session) : await EventModel.find({ _id: { $in: eventIds }, weddingId }).session(session).lean();
      vendor.set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
        ...(input.email !== undefined ? { email: input.email.toLowerCase() } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.eventIds !== undefined ? { eventIds: input.eventIds } : {}),
        ...(input.quotedAmountMinor !== undefined ? { quotedAmountMinor: input.quotedAmountMinor === null ? null : BigInt(input.quotedAmountMinor) } : {}),
        ...(input.paidAmountMinor !== undefined ? { paidAmountMinor: BigInt(input.paidAmountMinor) } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      });
      await vendor.save({ session });
      if (input.name !== undefined) await ExpenseModel.updateMany({ weddingId, vendorId: vendor._id, deletedAt: null }, { $set: { vendorName: vendor.name } }, { session });
      const expenses = await ExpenseModel.find({ weddingId, vendorId: vendor._id, deletedAt: null }).sort({ expenseDate: -1 }).session(session).lean();
      return { vendor: serializeVendor(vendor, events, expenses) };
    });
  } finally {
    await session.endSession();
  }
}

export async function archiveVendor(userId: string, weddingId: string, vendorId: string) {
  await connectToDatabase();
  await requireVendorAccess(userId, weddingId);
  assertObjectId(vendorId);
  const vendor = await VendorModel.findOneAndUpdate({ _id: vendorId, weddingId, deletedAt: null }, { $set: { deletedAt: new Date() } }, { new: true });
  if (!vendor) throw new AuthError("NOT_FOUND", "Vendor not found.", 404);
  return { id: String(vendor._id), archived: true as const };
}

async function requireVendorAccess(userId: string, weddingId: string, session?: ClientSession) {
  if (!isValidObjectId(weddingId)) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  const membership = await WeddingMemberModel.findOne({ userId, weddingId, status: "ACTIVE" }).session(session ?? null).lean();
  if (!membership) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  if (!canManageFinances(membership.role)) throw new AuthError("FORBIDDEN", "Only Admins and Managers can access wedding vendors.", 403);
  return membership;
}

async function lockFinanceWedding(userId: string, weddingId: string, session: ClientSession) {
  const wedding = await WeddingModel.findOneAndUpdate({ _id: weddingId }, { $inc: { financeVersion: 1 } }, { new: true, session, timestamps: false });
  if (!wedding) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  await requireVendorAccess(userId, weddingId, session);
}

async function validateEvents(weddingId: string, eventIds: string[], session?: ClientSession) {
  if (!eventIds.length) return [];
  const events = await EventModel.find({ _id: { $in: eventIds }, weddingId, deletedAt: null, status: { $ne: "CANCELLED" } }).session(session ?? null).lean();
  if (events.length !== eventIds.length) throw new AuthError("INVALID_EVENTS", "Choose available ceremonies from this wedding.", 409);
  const byId = new Map(events.map((event) => [String(event._id), event]));
  return eventIds.map((id) => byId.get(id)!);
}

type EventSummary = { _id: unknown; name: string; localDate: string; venueName?: string; status: string };
type ExpenseSummary = { _id: unknown; title: string; amountMinor: unknown; paidAmountMinor: unknown; paymentStatus: string; expenseDate: string; eventId?: unknown };

function serializeVendor(vendor: WeddingVendor & { _id: unknown; createdAt: Date; updatedAt: Date }, events: EventSummary[], expenses: ExpenseSummary[]) {
  const quoted = vendor.quotedAmountMinor === null || vendor.quotedAmountMinor === undefined ? null : toBigInt(vendor.quotedAmountMinor);
  const paid = toBigInt(vendor.paidAmountMinor);
  const pending = quoted === null ? null : quoted > paid ? quoted - paid : BigInt(0);
  const overpaid = quoted === null || paid <= quoted ? BigInt(0) : paid - quoted;
  const eventById = new Map(events.map((event) => [String(event._id), event]));
  return {
    id: String(vendor._id), name: vendor.name, category: vendor.category,
    contactName: vendor.contactName ?? "", email: vendor.email ?? "", phone: vendor.phone ?? "", address: vendor.address ?? "",
    eventIds: vendor.eventIds.map(String),
    events: vendor.eventIds.map((id) => eventById.get(String(id))).filter(Boolean).map((event) => ({ id: String(event!._id), name: event!.name, localDate: event!.localDate, venueName: event!.venueName ?? "", status: event!.status })),
    quotedAmountMinor: quoted?.toString() ?? null, paidAmountMinor: paid.toString(), pendingAmountMinor: pending?.toString() ?? null,
    overpaidAmountMinor: overpaid.toString(), paymentStatus: deriveVendorPaymentStatus(quoted, paid), currency: "INR" as const,
    notes: vendor.notes ?? "",
    expenses: expenses.map((expense) => ({
      id: String(expense._id), title: expense.title, amountMinor: toBigInt(expense.amountMinor).toString(),
      paidAmountMinor: toBigInt(expense.paidAmountMinor).toString(), paymentStatus: expense.paymentStatus,
      expenseDate: expense.expenseDate, eventId: expense.eventId ? String(expense.eventId) : null,
    })),
    linkedExpenseTotalMinor: expenses.reduce((sum, expense) => sum + toBigInt(expense.amountMinor), BigInt(0)).toString(),
    createdAt: vendor.createdAt.toISOString(), updatedAt: vendor.updatedAt.toISOString(),
  };
}

export function summarizeVendors(vendors: Array<{ quotedAmountMinor?: unknown; paidAmountMinor: unknown }>) {
  let quoted = BigInt(0);
  let paid = BigInt(0);
  let pending = BigInt(0);
  let overpaid = BigInt(0);
  const statusCounts = { NO_QUOTE: 0, UNPAID: 0, PARTIAL: 0, PAID: 0, OVERPAID: 0 };
  for (const vendor of vendors) {
    const vendorPaid = toBigInt(vendor.paidAmountMinor);
    const vendorQuoted = vendor.quotedAmountMinor === null || vendor.quotedAmountMinor === undefined ? null : toBigInt(vendor.quotedAmountMinor);
    paid += vendorPaid;
    if (vendorQuoted !== null) {
      quoted += vendorQuoted;
      if (vendorQuoted > vendorPaid) pending += vendorQuoted - vendorPaid;
      if (vendorPaid > vendorQuoted) overpaid += vendorPaid - vendorQuoted;
    }
    statusCounts[deriveVendorPaymentStatus(vendorQuoted, vendorPaid)] += 1;
  }
  return { count: vendors.length, quotedMinor: quoted.toString(), paidMinor: paid.toString(), pendingMinor: pending.toString(), overpaidMinor: overpaid.toString(), statusCounts };
}

export function deriveVendorPaymentStatus(quotedValue: unknown, paidValue: unknown): "NO_QUOTE" | "UNPAID" | "PARTIAL" | "PAID" | "OVERPAID" {
  if (quotedValue === null || quotedValue === undefined) return "NO_QUOTE";
  const quoted = toBigInt(quotedValue);
  const paid = toBigInt(paidValue);
  if (paid > quoted) return "OVERPAID";
  if (paid === quoted) return "PAID";
  if (paid === BigInt(0)) return "UNPAID";
  return "PARTIAL";
}

function pendingAmount(vendor: { quotedAmountMinor?: unknown; paidAmountMinor: unknown }) {
  if (vendor.quotedAmountMinor === null || vendor.quotedAmountMinor === undefined) return BigInt(0);
  const quoted = toBigInt(vendor.quotedAmountMinor);
  const paid = toBigInt(vendor.paidAmountMinor);
  return quoted > paid ? quoted - paid : BigInt(0);
}
function compareBigInt(left: bigint, right: bigint) { return left === right ? 0 : left > right ? 1 : -1; }
function toBigInt(value: unknown) { return BigInt(String(value)); }
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function assertObjectId(value: string) { if (!isValidObjectId(value)) throw new AuthError("NOT_FOUND", "Vendor not found.", 404); }

export type VendorView = ReturnType<typeof serializeVendor>;
export type VendorListView = Awaited<ReturnType<typeof listVendors>>;
