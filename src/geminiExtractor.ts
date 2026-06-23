import { InvoiceRow, SalesAccountRow } from './types';

const uuid = () => Math.random().toString(36).substring(2, 9);

// Convert file to Base64
async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      // Fallback for file types if standard type is missing
      const mimeType = file.type || 'image/png';
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function extractWithGemini(
  file: File, 
  type: 'invoice' | 'sales_account', 
  apiKey: string
): Promise<{ rows: any[], usage: { promptTokens: number, completionTokens: number, totalTokens: number } }> {
  try {
    const imagePart = await fileToGenerativePart(file);

    let prompt = '';
    if (type === 'invoice') {
      prompt = `
You are an expert OCR and data extraction system. You must analyze the uploaded invoice image and return a JSON array containing the invoice items.
Extract every visible field in the invoice. Return exactly as written (do not correct spelling, do not reformat numbers, do not remove any punctuation like "-").

Create one row per invoice line item. All items must have the same invoice metadata fields (e.g. invoiceNo, companyName) copied over.

Return ONLY a JSON array, with no markdown code blocks or extra text. Each item must match this interface:
{
  "invoiceNo": "Invoice Number exactly as written (e.g. MS 2024-25 / 255)",
  "invoiceDate": "Invoice Date (e.g. 02/03/25)",
  "companyName": "Seller's Company name (e.g. M S INDUSTRIES)",
  "companyGSTIN": "GSTIN of seller (e.g. 36ABNFM1005B1ZT)",
  "companyAddress": "Address of seller",
  "customerName": "Receiver / Billed to Name (e.g. Sri Chakra Traders)",
  "customerAddress": "Receiver's Address",
  "customerGSTIN": "Receiver's GSTIN",
  "state": "Receiver State",
  "stateCode": "Receiver State Code",
  "transportationMode": "Transportation mode (e.g. TATA INDICA)",
  "vehicleNumber": "Vehicle Number",
  "dateOfSupply": "Date of supply",
  "placeOfSupply": "Place of supply",
  "productDescription": "Item description (e.g. Reprocessed Air Cooler Plastic Body)",
  "hsnCode": "HSN Code",
  "taxRate": "GST tax rate (e.g. 18%)",
  "quantity": "Quantity (e.g. 60 Nos)",
  "unit": "Unit (e.g. Nos)",
  "rate": "Unit Rate (e.g. 500/-)",
  "taxableValue": "Taxable value (e.g. 30,000=00)",
  "cgst": "CGST amount",
  "sgst": "SGST amount",
  "igst": "IGST amount",
  "totalAmount": "Total line amount",
  "amountInWords": "Amount in words",
  "bankName": "Bank Name",
  "branch": "Bank Branch",
  "accountNumber": "Account number",
  "ifscCode": "IFSC code",
  "termsAndConditions": "Terms & Conditions"
}
`;
    } else {
      prompt = `
You are an expert OCR and data extraction system. You must analyze the uploaded handwritten or printed sales account registry sheet and return a JSON array containing the items.
Extract every visible field in the document. Return exactly as written (use " or ditto marks if that's how it's written in the registry).
Create one row per item.

Return ONLY a JSON array, with no markdown code blocks or extra text. Each item must match this interface:
{
  "date": "Date field",
  "particulars": "Particulars/Details of the company or buyer",
  "dcNo": "DC No (Challan Number)",
  "productName": "Product Name/Details",
  "noOfBody": "Number of body/Quantity",
  "unitPrice": "Unit Price (e.g. 1300/-)",
  "totalAmount": "Total amount",
  "cgstSgst": "CGST/SGST total amount or reference"
}
`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              imagePart
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
    }

    const result = await response.json();
    const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Get usage statistics from Gemini response metadata
    const usageMetadata = result.usageMetadata || {};
    const usage = {
      promptTokens: usageMetadata.promptTokenCount || 0,
      completionTokens: usageMetadata.candidatesTokenCount || 0,
      totalTokens: usageMetadata.totalTokenCount || 0
    };

    // Clean markdown json fences if model returned them
    let cleanText = textOutput.trim();
    if (cleanText.startsWith("```")) {
      // Remove starting ```json or ```
      cleanText = cleanText.replace(/^```(json)?/, "");
      // Remove ending ```
      cleanText = cleanText.replace(/```$/, "");
    }
    const parsed = JSON.parse(cleanText.trim());
    const rows = Array.isArray(parsed) ? parsed.map(row => ({ ...row, id: uuid() })) : [];

    return { rows, usage };
  } catch (error: any) {
    console.error("Gemini Extraction Error: ", error);
    throw error;
  }
}
