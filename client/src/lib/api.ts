// API client for backend communication

async function fetchAPI(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export interface SignupData {
  ownerName: string;
  phone: string;
  password: string;
  name: string;
  gstin?: string;
  email?: string;
  address?: string;
  shopPhoto?: string;
}

export interface SigninData {
  phone: string;
  password: string;
}

export const api = {
  // Authentication
  auth: {
    signup: (data: SignupData) => fetchAPI('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    signin: (data: SigninData) => fetchAPI('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    signout: () => fetchAPI('/api/auth/signout', {
      method: 'POST',
    }),
    me: () => fetchAPI('/api/auth/me'),
  },

  // Store Profile
  store: {
    get: () => fetchAPI('/api/store'),
    update: (id: string, data: any) => fetchAPI(`/api/store/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    search: (query: string) => fetchAPI(`/api/stores/search?q=${encodeURIComponent(query)}`),
  },

  // Items
  items: {
    list: () => fetchAPI('/api/items'),
    get: (id: string) => fetchAPI(`/api/items/${id}`),
    create: (data: any) => fetchAPI('/api/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => fetchAPI(`/api/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => fetchAPI(`/api/items/${id}`, {
      method: 'DELETE',
    }),
  },

  // Invoices
  invoices: {
    list: () => fetchAPI('/api/invoices'),
    currentMonth: () => fetchAPI('/api/invoices/current-month'),
    create: (invoice: any, lineItems: any[]) => fetchAPI('/api/invoices', {
      method: 'POST',
      body: JSON.stringify({ invoice, lineItems }),
    }),
  },

  // Transfers
  transfers: {
    list: () => fetchAPI('/api/transfers'),
    create: (transfer: any, lineItems: any[]) => fetchAPI('/api/transfers', {
      method: 'POST',
      body: JSON.stringify({ transfer, lineItems }),
    }),
    update: (id: string, data: any) => fetchAPI(`/api/transfers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  },

  // Bill Scanning
  scanning: {
    scanBill: (image: string) => fetchAPI('/api/scan-bill', {
      method: 'POST',
      body: JSON.stringify({ image }),
    }),
    bulkCreateItems: (items: any[]) => fetchAPI('/api/items/bulk', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  },

  // Subscription
  subscription: {
    getPlans: () => fetchAPI('/api/subscription/plans'),
    checkout: (priceId: string) => fetchAPI('/api/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId }),
    }),
    portal: () => fetchAPI('/api/subscription/portal', {
      method: 'POST',
    }),
    current: () => fetchAPI('/api/subscription/current'),
  },
};
