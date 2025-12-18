import { Item, Invoice, StoreProfile, SubscriptionPlan, TransferRequest } from "@/shared/schema";

const KEYS = {
  ITEMS: "salemate:items",
  INVOICES: "salemate:invoices",
  STORE: "salemate:store",
  TRANSFERS: "salemate:transfers",
};

// Seed data
const SEED_ITEMS: Item[] = [
  {
    id: "1",
    name: "Samsung Galaxy S24",
    brand: "Samsung",
    hsn: "8517",
    unit: "pcs",
    gstPercent: 18,
    costPrice: 70000,
    margin: 5000,
    sellingPrice: 75000,
    discount: 0,
    quantity: 10,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "iPhone 15 Case",
    brand: "Apple",
    hsn: "3926",
    unit: "pcs",
    gstPercent: 12,
    costPrice: 500,
    margin: 499,
    sellingPrice: 999,
    discount: 0,
    quantity: 50,
    updatedAt: new Date().toISOString(),
  },
];

const SEED_STORE: StoreProfile = {
  id: "store-1",
  name: "My Awesome Store",
  gstin: "29AAAAA0000A1Z5",
  address: "123 Market Road, Bangalore",
  phone: "9876543210",
  plan: SubscriptionPlan.FREE,
  templateId: "default",
};

class StorageService {
  private get<T>(key: string, defaultVal: T): T {
    const val = localStorage.getItem(key);
    if (!val) return defaultVal;
    try {
      return JSON.parse(val) as T;
    } catch (e) {
      console.error("Storage parse error", e);
      return defaultVal;
    }
  }

  private set<T>(key: string, val: T) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  // --- Items ---
  getItems(): Item[] {
    const items = this.get<Item[]>(KEYS.ITEMS, []);
    if (items.length === 0) {
      // Seed if empty
      this.set(KEYS.ITEMS, SEED_ITEMS);
      return SEED_ITEMS;
    }
    return items;
  }

  saveItem(item: Item): void {
    const items = this.getItems();
    const index = items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      items.push(item);
    }
    this.set(KEYS.ITEMS, items);
  }

  deleteItem(id: string): void {
    const items = this.getItems().filter((i) => i.id !== id);
    this.set(KEYS.ITEMS, items);
  }

  // --- Invoices ---
  getInvoices(): Invoice[] {
    return this.get<Invoice[]>(KEYS.INVOICES, []);
  }

  saveInvoice(invoice: Invoice): void {
    const invoices = this.getInvoices();
    invoices.push(invoice); // Invoices are immutable usually, but for draft we might edit.
    // For now, simple append
    this.set(KEYS.INVOICES, invoices);
  }

  // --- Store ---
  getStoreProfile(): StoreProfile {
    const store = this.get<StoreProfile>(KEYS.STORE, null as any);
    if (!store) {
      this.set(KEYS.STORE, SEED_STORE);
      return SEED_STORE;
    }
    return store;
  }

  updateStoreProfile(profile: StoreProfile): void {
    this.set(KEYS.STORE, profile);
  }

  // --- Transfers ---
  getTransfers(): TransferRequest[] {
    return this.get<TransferRequest[]>(KEYS.TRANSFERS, []);
  }
  
  saveTransfer(transfer: TransferRequest): void {
    const transfers = this.getTransfers();
    const index = transfers.findIndex(t => t.id === transfer.id);
    if (index >= 0) {
      transfers[index] = transfer;
    } else {
      transfers.push(transfer);
    }
    this.set(KEYS.TRANSFERS, transfers);
  }
}

export const db = new StorageService();
