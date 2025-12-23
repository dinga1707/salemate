import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["FREE", "BASIC", "PRO", "ENTERPRISE"]);
export const transitStatusEnum = pgEnum("transit_status", ["PENDING", "ACCEPTED", "REJECTED", "REVERTED", "RETURNED"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["DRAFT", "PAID", "CANCELLED"]);
export const invoiceTypeEnum = pgEnum("invoice_type", ["INVOICE", "PROFORMA"]);
export const paymentMethodEnum = pgEnum("payment_method", ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CREDIT", "PAY_LATER"]);

// Parties (Suppliers) Table
export const parties = pgTable("parties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull(),
  name: text("name").notNull(),
  gstin: text("gstin"),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Store Profile Table (with authentication fields)
export const storeProfiles = pgTable("store_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerName: text("owner_name").notNull(),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  gstin: text("gstin"),
  email: text("email"),
  address: text("address"),
  shopPhoto: text("shop_photo"),
  plan: subscriptionPlanEnum("plan").notNull().default("FREE"),
  templateId: text("template_id").notNull().default("default"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Items (Stock) Table
export const items = pgTable("items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => storeProfiles.id),
  partyId: varchar("party_id").references(() => parties.id),
  name: text("name").notNull(),
  brand: text("brand"),
  hsn: text("hsn"),
  unit: text("unit").notNull().default("pcs"),
  gstPercent: decimal("gst_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull(),
  margin: decimal("margin", { precision: 10, scale: 2 }).notNull().default("0"),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  quantity: integer("quantity").notNull().default(0),
  location: text("location"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Invoices Table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => storeProfiles.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),
  customerGstin: text("customer_gstin"),
  customerStoreId: varchar("customer_store_id"),
  transferId: varchar("transfer_id"),
  date: timestamp("date").notNull().defaultNow(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxTotal: decimal("tax_total", { precision: 10, scale: 2 }).notNull(),
  grandTotal: decimal("grand_total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").default("CASH"),
  status: invoiceStatusEnum("status").notNull().default("PAID"),
  type: invoiceTypeEnum("type").notNull().default("INVOICE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Invoice Line Items Table
export const invoiceLineItems = pgTable("invoice_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  itemId: varchar("item_id"),
  name: text("name").notNull(),
  hsn: text("hsn"),
  gstPercent: decimal("gst_percent", { precision: 5, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

// Transfer Requests Table
export const transferRequests = pgTable("transfer_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromStoreId: varchar("from_store_id").notNull(),
  toStoreId: varchar("to_store_id").notNull(),
  status: transitStatusEnum("status").notNull().default("PENDING"),
  invoiceId: varchar("invoice_id"),
  acceptedAt: timestamp("accepted_at"),
  revertedAt: timestamp("reverted_at"),
  returnedAt: timestamp("returned_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Transfer Line Items Table
export const transferLineItems = pgTable("transfer_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transferId: varchar("transfer_id").notNull().references(() => transferRequests.id, { onDelete: "cascade" }),
  itemId: varchar("item_id"),
  name: text("name").notNull(),
  hsn: text("hsn"),
  quantity: integer("quantity").notNull(),
  unit: text("unit").notNull().default("pcs"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  gstPercent: decimal("gst_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
});

// Zod Schemas for Insert/Validation
export const insertStoreProfileSchema = createInsertSchema(storeProfiles).omit({
  id: true,
  createdAt: true,
});

export const signupSchema = z.object({
  ownerName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Store name must be at least 2 characters"),
  gstin: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().optional(),
  shopPhoto: z.string().optional(),
});

export const signinSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  password: z.string().min(1, "Password is required"),
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).omit({
  id: true,
  invoiceId: true,
});

export const insertTransferRequestSchema = createInsertSchema(transferRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransferLineItemSchema = createInsertSchema(transferLineItems).omit({
  id: true,
  transferId: true,
});

export const insertPartySchema = createInsertSchema(parties).omit({
  id: true,
  createdAt: true,
});

// Types
export type Party = typeof parties.$inferSelect;
export type InsertParty = z.infer<typeof insertPartySchema>;
export type StoreProfile = typeof storeProfiles.$inferSelect;
export type InsertStoreProfile = z.infer<typeof insertStoreProfileSchema>;

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;

export type TransferRequest = typeof transferRequests.$inferSelect;
export type InsertTransferRequest = z.infer<typeof insertTransferRequestSchema>;

export type TransferLineItem = typeof transferLineItems.$inferSelect;
export type InsertTransferLineItem = z.infer<typeof insertTransferLineItemSchema>;
