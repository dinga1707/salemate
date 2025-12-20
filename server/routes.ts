import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { db } from "./db";
import { 
  insertStoreProfileSchema,
  insertItemSchema,
  insertInvoiceSchema,
  insertInvoiceLineItemSchema,
  insertTransferRequestSchema,
  insertTransferLineItemSchema,
  signupSchema,
  signinSchema,
  type InsertInvoiceLineItem,
  type InsertTransferLineItem,
} from "@shared/schema";
import { z } from "zod";
import { startOfMonth, endOfMonth } from "date-fns";
import { scanBillImage } from "./openai";

declare module "express-session" {
  interface SessionData {
    storeId?: string;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Session middleware
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }
  
  app.use(session({
    secret: sessionSecret || "dev-session-secret-only",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }
  }));

  // ============ AUTHENTICATION ============

  // Sign up
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const data = signupSchema.parse(req.body);
      
      // Check if phone already exists
      const existing = await storage.getStoreByPhone(data.phone);
      if (existing) {
        return res.status(400).json({ error: "This mobile number is already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create store
      const store = await storage.createStore({
        ...data,
        password: hashedPassword,
        plan: "FREE",
        templateId: "default",
      });

      // Set session
      req.session.storeId = store.id;
      
      // Return store without password
      const { password: _, ...storeWithoutPassword } = store;
      res.status(201).json(storeWithoutPassword);
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.errors) {
        return res.status(400).json({ error: error.errors[0]?.message || "Validation failed" });
      }
      res.status(400).json({ error: error.message || "Failed to create account" });
    }
  });

  // Sign in
  app.post("/api/auth/signin", async (req, res) => {
    try {
      const data = signinSchema.parse(req.body);
      
      // Find store by phone
      const store = await storage.getStoreByPhone(data.phone);
      if (!store) {
        return res.status(401).json({ error: "Invalid mobile number or password" });
      }

      // Verify password
      const valid = await bcrypt.compare(data.password, store.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid mobile number or password" });
      }

      // Set session
      req.session.storeId = store.id;
      
      // Return store without password
      const { password: _, ...storeWithoutPassword } = store;
      res.json(storeWithoutPassword);
    } catch (error: any) {
      console.error("Signin error:", error);
      res.status(400).json({ error: error.message || "Failed to sign in" });
    }
  });

  // Sign out
  app.post("/api/auth/signout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to sign out" });
      }
      res.json({ success: true });
    });
  });

  // Get current session
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.storeId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const store = await storage.getStoreProfile(req.session.storeId);
      if (!store) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "Session expired" });
      }

      const { password: _, ...storeWithoutPassword } = store;
      res.json(storeWithoutPassword);
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ error: "Failed to check authentication" });
    }
  });
  
  // ============ STORE PROFILE ============
  
  // Get current store
  app.get("/api/store", async (req, res) => {
    try {
      if (!req.session.storeId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const store = await storage.getStoreProfile(req.session.storeId);
      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }
      const { password: _, ...storeWithoutPassword } = store;
      res.json(storeWithoutPassword);
    } catch (error) {
      console.error("Error fetching store:", error);
      res.status(500).json({ error: "Failed to fetch store profile" });
    }
  });

  // Helper to get store from session
  const getSessionStore = async (req: Request) => {
    if (!req.session.storeId) return null;
    return storage.getStoreProfile(req.session.storeId);
  };

  // Update store profile (current user only)
  app.patch("/api/store/:id", async (req, res) => {
    try {
      const store = await getSessionStore(req);
      if (!store) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { id } = req.params;
      
      // Only allow updating own store
      if (store.id !== id) {
        return res.status(403).json({ error: "You can only update your own store profile" });
      }
      
      // Exclude password from updates (require separate password change flow)
      const { password, ...updateData } = req.body;
      
      const updateSchema = insertStoreProfileSchema.partial().omit({ password: true });
      const validated = updateSchema.parse(updateData);
      
      const updated = await storage.updateStoreProfile(id, validated);
      const { password: _, ...storeWithoutPassword } = updated;
      res.json(storeWithoutPassword);
    } catch (error) {
      console.error("Error updating store:", error);
      res.status(400).json({ error: "Failed to update store profile" });
    }
  });

  // Search for stores by name or phone (for transfers)
  app.get("/api/stores/search", async (req, res) => {
    try {
      const store = await getSessionStore(req);
      if (!store) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        return res.json([]);
      }
      
      const stores = await storage.searchStores(query.trim(), store.id);
      res.json(stores);
    } catch (error) {
      console.error("Error searching stores:", error);
      res.status(500).json({ error: "Failed to search stores" });
    }
  });

  // ============ ITEMS ============
  
  // Get all items for a store
  app.get("/api/items", async (req, res) => {
    try {
      const store = await getSessionStore(req);
      if (!store) {
        return res.status(401).json({ error: "Not authenticated" });
      }
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
      const store = await getSessionStore(req);
      if (!store) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      // Convert decimal fields to strings for database storage (quantity is integer, stays as number)
      const body = {
        ...req.body,
        storeId: store.id,
        gstPercent: String(req.body.gstPercent ?? "0"),
        costPrice: String(req.body.costPrice ?? "0"),
        margin: String(req.body.margin ?? "0"),
        sellingPrice: String(req.body.sellingPrice ?? "0"),
        quantity: Number(req.body.quantity ?? 0),
      };
      const validated = insertItemSchema.parse(body);
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
      // Convert decimal fields to strings for database storage (quantity is integer, stays as number)
      const body = { ...req.body };
      if (body.gstPercent !== undefined) body.gstPercent = String(body.gstPercent);
      if (body.costPrice !== undefined) body.costPrice = String(body.costPrice);
      if (body.margin !== undefined) body.margin = String(body.margin);
      if (body.sellingPrice !== undefined) body.sellingPrice = String(body.sellingPrice);
      if (body.quantity !== undefined) body.quantity = Number(body.quantity);
      
      const validated = insertItemSchema.partial().parse(body);
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
      const store = await getSessionStore(req);
      if (!store) {
        return res.status(401).json({ error: "Not authenticated" });
      }
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
      const store = await getSessionStore(req);
      if (!store) {
        return res.status(401).json({ error: "Not authenticated" });
      }
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
      const store = await getSessionStore(req);
      if (!store) {
        return res.status(401).json({ error: "Not authenticated" });
      }
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
      const store = await getSessionStore(req);
      if (!store) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const transfers = await storage.getTransfers(store.id);
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ error: "Failed to fetch transfers" });
    }
  });

  // Create transfer request
  const createTransferSchema = z.object({
    transfer: z.object({
      toStoreId: z.string().min(1, "Recipient store is required"),
    }),
    lineItems: z.array(z.object({
      itemId: z.string().min(1),
      name: z.string().min(1),
      quantity: z.number().int().positive(),
      unit: z.string().optional(),
      sellingPrice: z.string().optional(),
    })).min(1, "At least one item is required"),
  });

  app.post("/api/transfers", async (req, res) => {
    try {
      // Require authentication
      const store = await getSessionStore(req);
      if (!store) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { transfer, lineItems } = createTransferSchema.parse(req.body);
      
      // Prevent self-transfer
      if (transfer.toStoreId === store.id) {
        return res.status(400).json({ error: "Cannot transfer to your own store" });
      }
      
      // Verify recipient store exists
      const recipientStore = await storage.getStoreProfile(transfer.toStoreId);
      if (!recipientStore) {
        return res.status(400).json({ error: "Recipient store not found" });
      }
      
      // Validate items belong to sender and have sufficient stock
      for (const item of lineItems) {
        const stockItem = await storage.getItem(item.itemId);
        if (!stockItem) {
          return res.status(400).json({ error: `Item ${item.name} not found` });
        }
        if (stockItem.storeId !== store.id) {
          return res.status(403).json({ error: `Item ${item.name} does not belong to your store` });
        }
        if (Number(stockItem.quantity) < item.quantity) {
          return res.status(400).json({ error: `Insufficient stock for ${item.name}` });
        }
      }
      
      // Create transfer with session store as sender
      const transferData = {
        fromStoreId: store.id,
        toStoreId: transfer.toStoreId,
        status: "PENDING" as const,
      };
      
      const created = await storage.createTransfer(transferData, lineItems);
      
      // Reduce stock from sender
      for (const item of lineItems) {
        const stockItem = await storage.getItem(item.itemId);
        if (stockItem) {
          await storage.updateItem(item.itemId, {
            quantity: Number(stockItem.quantity) - item.quantity,
          });
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
        const store = await getSessionStore(req);
        if (store && transfer.toStoreId === store.id) {
          const transferItems = await storage.getTransferLineItems(id);
          for (const item of transferItems) {
            // Check if the item already exists in receiver's inventory by name
            const existingItems = await storage.getItems(store.id);
            const existingItem = existingItems.find((i: any) => i.name === item.name);
            
            if (existingItem) {
              // Update quantity of existing item
              await storage.updateItem(existingItem.id, {
                quantity: Number(existingItem.quantity) + item.quantity,
              });
            } else {
              // Create new item in receiver's inventory
              // Get source item details if available
              let sourceItem = null;
              if (item.itemId) {
                sourceItem = await storage.getItem(item.itemId);
              }
              
              await storage.createItem({
                storeId: store.id,
                name: item.name,
                brand: sourceItem?.brand || null,
                hsn: sourceItem?.hsn || null,
                unit: sourceItem?.unit || "pcs",
                gstPercent: sourceItem?.gstPercent || "0",
                costPrice: sourceItem?.costPrice || "0",
                margin: sourceItem?.margin || "0",
                sellingPrice: sourceItem?.sellingPrice || "0",
                discount: sourceItem?.discount || "0",
                quantity: item.quantity,
                location: null,
              });
            }
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
      const store = await getSessionStore(req);
      if (!store) {
        return res.status(401).json({ error: "Not authenticated" });
      }
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

  // ============ SUBSCRIPTION ============
  
  // Get subscription plans
  app.get("/api/subscription/plans", async (req, res) => {
    try {
      const { sql } = await import('drizzle-orm');
      
      const result = await db.execute(sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.metadata as price_metadata
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY pr.unit_amount ASC
      `);
      
      const productsMap = new Map();
      for (const row of result.rows as any[]) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            metadata: row.price_metadata,
          });
        }
      }
      
      res.json(Array.from(productsMap.values()));
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  // Create checkout session
  app.post("/api/subscription/checkout", async (req, res) => {
    try {
      const store = await getSessionStore(req);
      if (!store) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { priceId } = req.body;
      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${req.protocol}://${req.get('host')}/subscription?success=true`,
        cancel_url: `${req.protocol}://${req.get('host')}/subscription?canceled=true`,
        metadata: { storeId: store.id },
        customer_email: store.email || undefined,
        subscription_data: {
          metadata: { storeId: store.id },
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Customer portal session
  app.post("/api/subscription/portal", async (req, res) => {
    try {
      const store = await getSessionStore(req);
      if (!store) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const { sql } = await import('drizzle-orm');
      const customerResult = await db.execute(sql`
        SELECT id FROM stripe.customers 
        WHERE metadata->>'storeId' = ${store.id}
        LIMIT 1
      `);

      if (customerResult.rows.length === 0) {
        return res.status(404).json({ error: "No subscription found" });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: (customerResult.rows[0] as any).id,
        return_url: `${req.protocol}://${req.get('host')}/subscription`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // Get current subscription
  app.get("/api/subscription/current", async (req, res) => {
    try {
      const store = await getSessionStore(req);
      if (!store) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { sql } = await import('drizzle-orm');
      const subscriptionResult = await db.execute(sql`
        SELECT s.*, p.name as product_name, pr.unit_amount, pr.recurring
        FROM stripe.subscriptions s
        LEFT JOIN stripe.prices pr ON pr.id = s.items->0->>'price'
        LEFT JOIN stripe.products p ON p.id = pr.product
        WHERE s.metadata->>'storeId' = ${store.id}
        AND s.status IN ('active', 'trialing')
        LIMIT 1
      `);

      if (subscriptionResult.rows.length === 0) {
        return res.json({ subscription: null, plan: store.plan });
      }

      res.json({ 
        subscription: subscriptionResult.rows[0],
        plan: store.plan 
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  return httpServer;
}
