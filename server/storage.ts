import {
  storeProfiles,
  items,
  invoices,
  invoiceLineItems,
  transferRequests,
  transferLineItems,
  type StoreProfile,
  type InsertStoreProfile,
  type Item,
  type InsertItem,
  type Invoice,
  type InsertInvoice,
  type InvoiceLineItem,
  type InsertInvoiceLineItem,
  type TransferRequest,
  type InsertTransferRequest,
  type TransferLineItem,
  type InsertTransferLineItem,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, or, ilike, ne } from "drizzle-orm";

export interface IStorage {
  // Authentication
  getStoreByPhone(phone: string): Promise<StoreProfile | undefined>;
  createStore(data: InsertStoreProfile): Promise<StoreProfile>;
  
  // Store Profile
  getStoreProfile(id: string): Promise<StoreProfile | undefined>;
  getOrCreateDefaultStore(): Promise<StoreProfile>;
  updateStoreProfile(id: string, data: Partial<InsertStoreProfile>): Promise<StoreProfile>;

  // Items
  getItems(storeId: string): Promise<Item[]>;
  getItem(id: string): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: string, data: Partial<InsertItem>): Promise<Item>;
  deleteItem(id: string): Promise<void>;

  // Invoices
  getInvoices(storeId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice, lineItems: InsertInvoiceLineItem[]): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>, lineItems?: InsertInvoiceLineItem[]): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;
  getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]>;
  getInvoicesInDateRange(storeId: string, start: Date, end: Date): Promise<Invoice[]>;

  // Transfer Requests
  getTransfers(storeId: string): Promise<(TransferRequest & { items: TransferLineItem[] })[]>;
  getTransfer(id: string): Promise<TransferRequest | undefined>;
  createTransfer(transfer: InsertTransferRequest, lineItems: InsertTransferLineItem[]): Promise<TransferRequest>;
  updateTransfer(id: string, data: Partial<InsertTransferRequest>): Promise<TransferRequest>;
  getTransferLineItems(transferId: string): Promise<TransferLineItem[]>;
  
  // Store Search
  searchStores(query: string, excludeStoreId: string): Promise<Pick<StoreProfile, 'id' | 'name' | 'phone' | 'address' | 'plan'>[]>;
}

export class DatabaseStorage implements IStorage {
  // Authentication
  async getStoreByPhone(phone: string): Promise<StoreProfile | undefined> {
    const [store] = await db.select().from(storeProfiles).where(eq(storeProfiles.phone, phone));
    return store || undefined;
  }

  async createStore(data: InsertStoreProfile): Promise<StoreProfile> {
    const [newStore] = await db.insert(storeProfiles).values(data).returning();
    return newStore;
  }

  // Store Profile
  async getStoreProfile(id: string): Promise<StoreProfile | undefined> {
    const [store] = await db.select().from(storeProfiles).where(eq(storeProfiles.id, id));
    return store || undefined;
  }

  async getOrCreateDefaultStore(): Promise<StoreProfile> {
    const stores = await db.select().from(storeProfiles).limit(1);
    if (stores.length > 0) {
      return stores[0];
    }
    
    // This shouldn't be called anymore as stores are created through signup
    throw new Error("No store found. Please sign up first.");
  }

  async updateStoreProfile(id: string, data: Partial<InsertStoreProfile>): Promise<StoreProfile> {
    const [updated] = await db
      .update(storeProfiles)
      .set(data)
      .where(eq(storeProfiles.id, id))
      .returning();
    return updated;
  }

  // Items
  async getItems(storeId: string): Promise<Item[]> {
    return db.select().from(items).where(eq(items.storeId, storeId));
  }

  async getItem(id: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item || undefined;
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await db.insert(items).values(item).returning();
    return newItem;
  }

  async updateItem(id: string, data: Partial<InsertItem>): Promise<Item> {
    const [updated] = await db
      .update(items)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();
    return updated;
  }

  async deleteItem(id: string): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }

  // Invoices
  async getInvoices(storeId: string): Promise<Invoice[]> {
    return db
      .select()
      .from(invoices)
      .where(eq(invoices.storeId, storeId))
      .orderBy(desc(invoices.date));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async createInvoice(invoice: InsertInvoice, lineItems: InsertInvoiceLineItem[]): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    
    // Insert line items
    if (lineItems.length > 0) {
      await db.insert(invoiceLineItems).values(
        lineItems.map(item => ({ ...item, invoiceId: newInvoice.id }))
      );
    }
    
    return newInvoice;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>, lineItems?: InsertInvoiceLineItem[]): Promise<Invoice> {
    const [updated] = await db
      .update(invoices)
      .set({ ...invoice, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    
    // If line items provided, replace existing ones
    if (lineItems) {
      await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id));
      if (lineItems.length > 0) {
        await db.insert(invoiceLineItems).values(
          lineItems.map(item => ({ ...item, invoiceId: id }))
        );
      }
    }
    
    return updated;
  }

  async deleteInvoice(id: string): Promise<void> {
    // Line items are deleted automatically via cascade
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
    return db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));
  }

  async getInvoicesInDateRange(storeId: string, start: Date, end: Date): Promise<Invoice[]> {
    return db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.storeId, storeId),
          gte(invoices.date, start),
          lte(invoices.date, end)
        )
      );
  }

  // Transfer Requests
  async getTransfers(storeId: string): Promise<(TransferRequest & { items: TransferLineItem[], fromStore?: { name: string; phone: string }, toStore?: { name: string; phone: string } })[]> {
    const transfers = await db
      .select()
      .from(transferRequests)
      .where(eq(transferRequests.fromStoreId, storeId))
      .orderBy(desc(transferRequests.createdAt));

    // Also get incoming transfers
    const incomingTransfers = await db
      .select()
      .from(transferRequests)
      .where(eq(transferRequests.toStoreId, storeId))
      .orderBy(desc(transferRequests.createdAt));

    const allTransfers = [...transfers, ...incomingTransfers];

    // Get line items and store info for each transfer
    const result = await Promise.all(
      allTransfers.map(async (transfer) => {
        const items = await this.getTransferLineItems(transfer.id);
        const fromStore = await this.getStoreProfile(transfer.fromStoreId);
        const toStore = await this.getStoreProfile(transfer.toStoreId);
        return { 
          ...transfer, 
          items,
          fromStore: fromStore ? { name: fromStore.name, phone: fromStore.phone } : undefined,
          toStore: toStore ? { name: toStore.name, phone: toStore.phone } : undefined,
        };
      })
    );

    return result;
  }

  async getTransfer(id: string): Promise<TransferRequest | undefined> {
    const [transfer] = await db.select().from(transferRequests).where(eq(transferRequests.id, id));
    return transfer || undefined;
  }

  async createTransfer(transfer: InsertTransferRequest, lineItems: InsertTransferLineItem[]): Promise<TransferRequest> {
    const [newTransfer] = await db.insert(transferRequests).values(transfer).returning();
    
    if (lineItems.length > 0) {
      await db.insert(transferLineItems).values(
        lineItems.map(item => ({ ...item, transferId: newTransfer.id }))
      );
    }
    
    return newTransfer;
  }

  async updateTransfer(id: string, data: Partial<InsertTransferRequest>): Promise<TransferRequest> {
    const [updated] = await db
      .update(transferRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(transferRequests.id, id))
      .returning();
    return updated;
  }

  async getTransferLineItems(transferId: string): Promise<TransferLineItem[]> {
    return db.select().from(transferLineItems).where(eq(transferLineItems.transferId, transferId));
  }

  async searchStores(query: string, excludeStoreId: string): Promise<Pick<StoreProfile, 'id' | 'name' | 'phone' | 'address' | 'plan'>[]> {
    const searchTerm = `%${query}%`;
    const stores = await db
      .select({
        id: storeProfiles.id,
        name: storeProfiles.name,
        phone: storeProfiles.phone,
        address: storeProfiles.address,
        plan: storeProfiles.plan,
      })
      .from(storeProfiles)
      .where(
        and(
          ne(storeProfiles.id, excludeStoreId),
          or(
            ilike(storeProfiles.name, searchTerm),
            ilike(storeProfiles.phone, searchTerm)
          )
        )
      )
      .limit(10);
    return stores;
  }
}

export const storage = new DatabaseStorage();
