import { getUncachableStripeClient } from './stripeClient';

const PLANS = [
  {
    name: 'Basic Plan',
    description: 'Unlimited bills, proforma invoices. Perfect for growing businesses.',
    metadata: { plan: 'BASIC' },
    monthlyPrice: 29900,
    yearlyPrice: 299000,
  },
  {
    name: 'Pro Plan',
    description: 'Multiple logins, unlimited templates. For established businesses.',
    metadata: { plan: 'PRO' },
    monthlyPrice: 79900,
    yearlyPrice: 799000,
  },
  {
    name: 'Enterprise Plan',
    description: 'GST filing support, priority support. For large operations.',
    metadata: { plan: 'ENTERPRISE' },
    monthlyPrice: 149900,
    yearlyPrice: 1499000,
  },
];

async function seedProducts() {
  console.log('Starting to seed Stripe products...');
  const stripe = await getUncachableStripeClient();

  for (const plan of PLANS) {
    const existingProducts = await stripe.products.search({
      query: `name:'${plan.name}'`,
    });

    if (existingProducts.data.length > 0) {
      console.log(`${plan.name} already exists, skipping...`);
      continue;
    }

    console.log(`Creating ${plan.name}...`);
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: plan.metadata,
    });

    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.monthlyPrice,
      currency: 'inr',
      recurring: { interval: 'month' },
      metadata: { plan: plan.metadata.plan, interval: 'monthly' },
    });

    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.yearlyPrice,
      currency: 'inr',
      recurring: { interval: 'year' },
      metadata: { plan: plan.metadata.plan, interval: 'yearly' },
    });

    console.log(`Created ${plan.name}:`);
    console.log(`  Product ID: ${product.id}`);
    console.log(`  Monthly Price ID: ${monthlyPrice.id} (₹${plan.monthlyPrice / 100}/mo)`);
    console.log(`  Yearly Price ID: ${yearlyPrice.id} (₹${plan.yearlyPrice / 100}/yr)`);
  }

  console.log('Done seeding products!');
}

seedProducts().catch(console.error);
