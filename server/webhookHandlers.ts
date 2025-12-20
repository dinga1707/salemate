import { getStripeSync } from './stripeClient';
import { db } from './db';
import { storeProfiles } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }

  static async handleSubscriptionUpdate(subscriptionId: string, customerId: string, status: string, priceId: string) {
    const { sql } = await import('drizzle-orm');
    
    const customerResult = await db.execute(
      sql`SELECT metadata FROM stripe.customers WHERE id = ${customerId}`
    );
    
    const customer = customerResult.rows[0] as any;
    if (!customer?.metadata?.storeId) {
      console.log('No storeId in customer metadata');
      return;
    }

    const storeId = customer.metadata.storeId;

    const priceResult = await db.execute(
      sql`SELECT metadata FROM stripe.prices WHERE id = ${priceId}`
    );
    
    const price = priceResult.rows[0] as any;
    const planName = price?.metadata?.plan || 'FREE';

    if (status === 'active' || status === 'trialing') {
      await db.update(storeProfiles)
        .set({ plan: planName as any })
        .where(eq(storeProfiles.id, storeId));
      console.log(`Updated store ${storeId} to plan ${planName}`);
    } else if (status === 'canceled' || status === 'unpaid') {
      await db.update(storeProfiles)
        .set({ plan: 'FREE' })
        .where(eq(storeProfiles.id, storeId));
      console.log(`Downgraded store ${storeId} to FREE plan`);
    }
  }
}
