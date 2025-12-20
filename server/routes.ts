import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertStoreProfileSchema,
  insertItemSchema,
  insertInvoiceSchema,
  insertInvoiceLineItemSchema,
  insertTransferRequestSchema,
  insertTransferLineItemSchema,
  type InsertInvoiceLineItem,
  type InsertTransferLineItem,
} from "@shared/schema";
import { z } from "zod";
import { startOfMonth, endOfMonth } from "date-fns";
import { scanBillImage } from "./openai";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ============ STORE PROFILE ============
  
  // Get or create default store
  app.get("/api/store", async (req, res) => {
    try {
      const store = await storage.getOrCreateDefaultStore();
      res.json(store);
    } catch (error) {
      console.error("Error fetching store:", error);
      res.status(500).json({ error: "Failed to fetch store profile" });
    }
  });

  // Update store profile
  app.patch("/api/store/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validated = insertStoreProfileSchema.partial().parse(req.body);
      const updated = await storage.updateStoreProfile(id, validated);
      res.json(updated);
    } catch (error) {
      console.error("Error updating store:", error);
      res.status(400).json({ error: "Failed to update store profile" });
    }
  });

  // ============ ITEMS ============
  
  // Get all items for a store
  app.get("/api/items", async (req, res) => {
    try {
      const store = await storage.getOrCreateDefaultStore();
      const items = await storage.getItems(store.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  // Get single item
  app.get("/api/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.getItem(id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching item:", error);
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  // Create item
  app.post("/api/items", async (req, res) => {
    try {
      const store = await storage.getOrCreateDefaultStore();
      const validated = insertItemSchema.parse({ ...req.body, storeId: store.id });
      const item = await storage.createItem(validated);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating item:", error);
      res.status(400).json({ error: "Failed to create item" });
    }
  });

  // Update item
  app.patch("/api/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validated = insertItemSchema.partial().parse(req.body);
      const updated = await storage.updateItem(id, validated);
      res.json(updated);
    } catch (error) {
      console.error("Error updating item:", error);
      res.status(400).json({ error: "Failed to update item" });
    }
  });

  // Delete item
  app.delete("/api/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting item:", error);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // ============ INVOICES ============
  
  // Get all invoices for a store
  app.get("/api/invoices", async (req, res) => {
    try {
      const store = await storage.getOrCreateDefaultStore();
      const invoices = await storage.getInvoices(store.id);
      
      // Include line items for each invoice
      const invoicesWithItems = await Promise.all(
        invoices.map(async (invoice) => {
          const items = await storage.getInvoiceLineItems(invoice.id);
          return { ...invoice, items };
        })
      );
      
      res.json(invoicesWithItems);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // Get invoices for current month (for entitlement check)
  app.get("/api/invoices/current-month", async (req, res) => {
    try {
      const store = await storage.getOrCreateDefaultStore();
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const invoices = await storage.getInvoicesInDateRange(store.id, start, end);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching monthly invoices:", error);
      res.status(500).json({ error: "Failed to fetch monthly invoices" });
    }
  });

  // Create invoice
  const createInvoiceSchema = z.object({
    invoice: insertInvoiceSchema,
    lineItems: z.array(insertInvoiceLineItemSchema),
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const store = await storage.getOrCreateDefaultStore();
      const { invoice, lineItems } = createInvoiceSchema.parse(req.body);
      
      // Add storeId
      const invoiceData = { ...invoice, storeId: store.id };
      
      const created = await storage.createInvoice(invoiceData, lineItems);
      
      // Update stock quantities
      for (const item of lineItems) {
        if (item.itemId) {
          const stockItem = await storage.getItem(item.itemId);
          if (stockItem) {
            await storage.updateItem(item.itemId, {
              quantity: Number(stockItem.quantity) - item.quantity,
            });
          }
        }
      }
      
      // Fetch with line items
      const items = await storage.getInvoiceLineItems(created.id);
      res.status(201).json({ ...created, items });
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(400).json({ error: "Failed to create invoice" });
    }
  });

  // ============ TRANSFERS ============
  
  // Get all transfers for a store
  app.get("/api/transfers", async (req, res) => {
    try {
      const store = await storage.getOrCreateDefaultStore();
      const transfers = await storage.getTransfers(store.id);
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ error: "Failed to fetch transfers" });
    }
  });

  // Create transfer request
  const createTransferSchema = z.object({
    transfer: insertTransferRequestSchema,
    lineItems: z.array(insertTransferLineItemSchema),
  });

  app.post("/api/transfers", async (req, res) => {
    try {
      const { transfer, lineItems } = createTransferSchema.parse(req.body);
      const created = await storage.createTransfer(transfer, lineItems);
      
      // Reduce stock from sender
      for (const item of lineItems) {
        if (item.itemId) {
          const stockItem = await storage.getItem(item.itemId);
          if (stockItem) {
            await storage.updateItem(item.itemId, {
              quantity: Number(stockItem.quantity) - item.quantity,
            });
          }
        }
      }
      
      const items = await storage.getTransferLineItems(created.id);
      res.status(201).json({ ...created, items });
    } catch (error) {
      console.error("Error creating transfer:", error);
      res.status(400).json({ error: "Failed to create transfer" });
    }
  });

  // Update transfer status (accept/reject)
  app.patch("/api/transfers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const transfer = await storage.getTransfer(id);
      if (!transfer) {
        return res.status(404).json({ error: "Transfer not found" });
      }

      const updated = await storage.updateTransfer(id, { status });
      
      // If rejected, restore stock to sender
      if (status === "REJECTED") {
        const items = await storage.getTransferLineItems(id);
        for (const item of items) {
          if (item.itemId) {
            const stockItem = await storage.getItem(item.itemId);
            if (stockItem) {
              await storage.updateItem(item.itemId, {
                quantity: Number(stockItem.quantity) + item.quantity,
              });
            }
          }
        }
      }
      
      // If accepted by receiver, add items to their stock
      if (status === "ACCEPTED") {
        const store = await storage.getOrCreateDefaultStore();
        if (transfer.toStoreId === store.id) {
          const items = await storage.getTransferLineItems(id);
          for (const item of items) {
            // In a real multi-store system, we'd add to receiver's inventory
            // For now, we'll just log it
            console.log(`Accepted transfer: ${item.name} x${item.quantity}`);
          }
        }
      }
      
      const items = await storage.getTransferLineItems(id);
      res.json({ ...updated, items });
    } catch (error) {
      console.error("Error updating transfer:", error);
      res.status(400).json({ error: "Failed to update transfer" });
    }
  });

  // ============ BILL SCANNING ============
  
  // Scan bill image and extract items (supports single image or array of images)
  app.post("/api/scan-bill", async (req, res) => {
    try {
      const { image, images } = req.body;
      
      // Support both single image and array of images
      const imagesToScan = images && Array.isArray(images) ? images : (image ? [image] : []);
      
      if (imagesToScan.length === 0) {
        return res.status(400).json({ error: "Image data is required" });
      }

      // For now, scan the first image (primary page)
      // Future: could combine results from multiple pages
      const result = await scanBillImage(imagesToScan[0]);
      res.json(result);
    } catch (error: any) {
      console.error("Error scanning bill:", error);
      res.status(500).json({ error: error.message || "Failed to scan bill" });
    }
  });

  // Bulk create items from scanned bill
  app.post("/api/items/bulk", async (req, res) => {
    try {
      const store = await storage.getOrCreateDefaultStore();
      const { items } = req.body;
      
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Items array is required" });
      }

      const createdItems = [];
      for (const item of items) {
        const validated = insertItemSchema.parse({ ...item, storeId: store.id });
        const created = await storage.createItem(validated);
        createdItems.push(created);
      }

      res.status(201).json(createdItems);
    } catch (error) {
      console.error("Error bulk creating items:", error);
      res.status(400).json({ error: "Failed to create items" });
    }
  });

  return httpServer;
}
