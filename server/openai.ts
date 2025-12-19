import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
// Using gpt-4o for vision capabilities
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ExtractedItem {
  name: string;
  brand?: string;
  hsn?: string;
  quantity: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  gstPercent: number;
}

export interface BillScanResult {
  items: ExtractedItem[];
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: number;
}

export async function scanBillImage(base64Image: string): Promise<BillScanResult> {
  const prompt = `You are an expert at reading Indian supplier/purchase bills and invoices. 
Analyze this bill image and extract all product/item details.

For each item, extract:
- name: Product name
- brand: Brand name if visible
- hsn: HSN/SAC code if present
- quantity: Number of units purchased
- unit: Unit of measurement (pcs, kg, box, etc.)
- costPrice: Per-unit cost price (purchase price)
- sellingPrice: Suggested selling price if shown, otherwise estimate as costPrice * 1.2
- gstPercent: GST percentage if shown (0, 5, 12, 18, or 28)

Also extract:
- vendorName: Supplier/vendor name
- invoiceNumber: Bill/invoice number
- invoiceDate: Date on the bill
- totalAmount: Total bill amount

Return JSON in this exact format:
{
  "items": [
    {
      "name": "string",
      "brand": "string or null",
      "hsn": "string or null", 
      "quantity": number,
      "unit": "string",
      "costPrice": number,
      "sellingPrice": number,
      "gstPercent": number
    }
  ],
  "vendorName": "string or null",
  "invoiceNumber": "string or null",
  "invoiceDate": "string or null",
  "totalAmount": number or null
}

If you cannot read certain values, make reasonable assumptions based on visible information.
Parse amounts in Indian Rupees (₹). Remove any currency symbols and commas from numbers.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: base64Image.startsWith("data:") 
                  ? base64Image 
                  : `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content) as BillScanResult;
    
    // Ensure items array exists and has valid data
    if (!result.items || !Array.isArray(result.items)) {
      result.items = [];
    }

    // Clean up and validate each item
    result.items = result.items.map((item) => ({
      name: item.name || "Unknown Item",
      brand: item.brand || undefined,
      hsn: item.hsn || undefined,
      quantity: Math.max(1, Number(item.quantity) || 1),
      unit: item.unit || "pcs",
      costPrice: Math.max(0, Number(item.costPrice) || 0),
      sellingPrice: Math.max(0, Number(item.sellingPrice) || Number(item.costPrice) * 1.2 || 0),
      gstPercent: [0, 5, 12, 18, 28].includes(Number(item.gstPercent)) ? Number(item.gstPercent) : 18,
    }));

    return result;
  } catch (error) {
    console.error("Error scanning bill:", error);
    throw new Error("Failed to scan bill image. Please try again with a clearer image.");
  }
}
