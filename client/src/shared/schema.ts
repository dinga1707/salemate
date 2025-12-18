import { z } from "zod";

// --- Enums & Constants ---

export const SubscriptionPlan = {
  FREE: "FREE",
  BASIC: "BASIC", // 99
  PRO: "PRO",     // 249
  ENTERPRISE: "ENTERPRISE" // 399
} as const;

export type SubscriptionPlanType = keyof typeof SubscriptionPlan;

export const TransitStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
} as const;

export type TransitStatusType = keyof typeof TransitStatus;

// --- Schema Definitions ---

export const itemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  brand: z.string().optional(),
  hsn: z.string().optional(), // HSN/SAC
  unit: z.string().default("pcs"),
  gstPercent: z.number().min(0).max(100).default(0),
  costPrice: z.number().min(0),
  margin: z.number().min(0).default(0),
  sellingPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  quantity: z.number().int().default(0),
  location: z.string().optional(), // Shelf/Rack location
  updatedAt: z.string(), // ISO string for easy serialization
});

export type Item = z.infer<typeof itemSchema>;

export const invoiceLineItemSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string(),
  name: z.string(),
  hsn: z.string().optional(),
  gstPercent: z.number(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0), // Final selling price after item-level overrides
  discount: z.number().default(0),
  total: z.number(), // (unitPrice * quantity) - discount
});

export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;

export const invoiceSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  date: z.string(), // ISO
  items: z.array(invoiceLineItemSchema),
  subtotal: z.number(),
  taxTotal: z.number(),
  grandTotal: z.number(),
  status: z.enum(["DRAFT", "PAID", "CANCELLED"]).default("PAID"),
  type: z.enum(["INVOICE", "PROFORMA"]).default("INVOICE"),
});

export type Invoice = z.infer<typeof invoiceSchema>;

export const transferRequestSchema = z.object({
  id: z.string().uuid(),
  fromStoreId: z.string(),
  toStoreId: z.string(),
  items: z.array(z.object({
    itemId: z.string(),
    name: z.string(),
    quantity: z.number(),
  })),
  status: z.nativeEnum(TransitStatus),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TransferRequest = z.infer<typeof transferRequestSchema>;

export const storeProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  gstin: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  plan: z.nativeEnum(SubscriptionPlan).default(SubscriptionPlan.FREE),
  templateId: z.string().default("default"),
});

export type StoreProfile = z.infer<typeof storeProfileSchema>;
