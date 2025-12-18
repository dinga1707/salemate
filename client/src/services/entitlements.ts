import { SubscriptionPlan, SubscriptionPlanType } from "@/shared/schema";
import { db } from "./storage";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

export const PLAN_LIMITS = {
  [SubscriptionPlan.FREE]: {
    billsPerMonth: 10,
    logins: 1,
    templates: 1,
    proforma: false,
    gstFiling: false,
  },
  [SubscriptionPlan.BASIC]: {
    billsPerMonth: Infinity,
    logins: 1,
    templates: 1, // + paid extras
    proforma: true,
    gstFiling: false,
  },
  [SubscriptionPlan.PRO]: {
    billsPerMonth: Infinity,
    logins: 4,
    templates: Infinity,
    proforma: true,
    gstFiling: false,
  },
  [SubscriptionPlan.ENTERPRISE]: {
    billsPerMonth: Infinity,
    logins: Infinity,
    templates: Infinity,
    proforma: true,
    gstFiling: true,
  },
};

export function checkEntitlement(feature: "create_invoice" | "create_proforma" | "add_template" | "gst_filing") {
  const store = db.getStoreProfile();
  const plan = store.plan as SubscriptionPlanType;
  const limits = PLAN_LIMITS[plan];

  if (feature === "create_invoice") {
    if (limits.billsPerMonth === Infinity) return { allowed: true };

    const invoices = db.getInvoices();
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const invoicesThisMonth = invoices.filter((inv) => {
      const d = parseISO(inv.date);
      return isWithinInterval(d, { start, end });
    });

    if (invoicesThisMonth.length >= limits.billsPerMonth) {
      return { 
        allowed: false, 
        reason: `Free plan limit reached (${limits.billsPerMonth} bills/month). Upgrade to create more.` 
      };
    }
    return { allowed: true };
  }

  if (feature === "create_proforma") {
    return { allowed: limits.proforma, reason: "Proforma invoices require Basic plan or higher." };
  }

  if (feature === "gst_filing") {
    return { allowed: limits.gstFiling, reason: "GST Filing requires Enterprise plan." };
  }

  return { allowed: true };
}
