import { api } from "@/lib/api";

export const PLAN_LIMITS = {
  FREE: {
    billsPerMonth: 10,
    logins: 1,
    templates: 1,
    proforma: false,
    gstFiling: false,
  },
  BASIC: {
    billsPerMonth: Infinity,
    logins: 1,
    templates: 1,
    proforma: true,
    gstFiling: false,
  },
  PRO: {
    billsPerMonth: Infinity,
    logins: 4,
    templates: Infinity,
    proforma: true,
    gstFiling: false,
  },
  ENTERPRISE: {
    billsPerMonth: Infinity,
    logins: Infinity,
    templates: Infinity,
    proforma: true,
    gstFiling: true,
  },
};

export async function checkEntitlement(feature: "create_invoice" | "create_proforma" | "add_template" | "gst_filing") {
  const store = await api.store.get();
  const plan = store.plan as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan];

  if (feature === "create_invoice") {
    if (limits.billsPerMonth === Infinity) return { allowed: true };

    const invoicesThisMonth = await api.invoices.currentMonth();

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
