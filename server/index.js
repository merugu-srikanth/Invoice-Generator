import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: "uploads/" });

// Initialize OpenAI client if API key is provided
let openaiClient = null;
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Prompts matching the frontend expectation
const invoicePrompt = `
You are an expert OCR and data extraction system. You must analyze the uploaded invoice image and return a JSON array containing the invoice items.
Extract every visible field in the invoice. Return exactly as written (do not correct spelling, do not reformat numbers, do not remove any punctuation like "-").

Create one row per invoice line item. All items must have the same invoice metadata fields (e.g. invoiceNo, companyName) copied over.

Return ONLY a JSON array, with no markdown code blocks or extra text. Each item must match this interface structure:
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

const salesAccountPrompt = `
You are an expert OCR and data extraction system. You must analyze the uploaded handwritten or printed sales account registry sheet and return a JSON array containing the items.
Extract every visible field in the document. Return exactly as written (use " or ditto marks if that's how it's written in the registry).
Create one row per item.

Return ONLY a JSON array, with no markdown code blocks or extra text. Each item must match this interface structure:
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

app.post("/api/extract-invoice", upload.single("image"), async (req, res) => {
  let imagePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded." });
    }

    imagePath = req.file.path;
    const type = req.body.type || "invoice"; // 'invoice' or 'sales_account'
    const imageBase64 = fs.readFileSync(imagePath, "base64");
    const mimeType = req.file.mimetype || "image/png";

    const promptText = type === "invoice" ? invoicePrompt : salesAccountPrompt;

    let responseText = "";
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    // 1. Try OpenAI if API key exists
    if (openaiClient) {
      console.log(`Processing extraction via OpenAI using model gpt-4o-mini...`);
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      });

      responseText = response.choices[0].message.content;
      usage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      };
    } 
    // 2. Fallback to Gemini if Gemini Key is available
    else if (req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) {
      const apiKey = req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      console.log(`Processing extraction via Gemini 2.5 Flash API...`);

      const fetchWithRetry = async (url, options, retries = 3, delay = 2000) => {
        for (let attempt = 1; attempt <= retries + 1; attempt++) {
          try {
            const response = await fetch(url, options);
            if (response.status === 503 && attempt <= retries) {
              console.warn(`Gemini API returned 503 (High Demand). Retrying attempt ${attempt}/${retries} in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            return response;
          } catch (err) {
            if (attempt <= retries) {
              console.warn(`Fetch error. Retrying attempt ${attempt}/${retries} in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw err;
          }
        }
      };

      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inlineData: {
                      data: imageBase64,
                      mimeType: mimeType,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response || !response.ok) {
        const errText = response ? await response.text() : "Network error";
        let message = errText;
        try {
          const parsedErr = JSON.parse(errText);
          if (parsedErr?.error?.message) {
            message = parsedErr.error.message;
          }
        } catch (_) {}

        if (response && response.status === 429) {
          throw new Error(`API Quota Exceeded (429): ${message}`);
        }
        throw new Error(`Gemini API Error (${response ? response.status : "Failed"}): ${message}`);
      }

      const result = await response.json();
      responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      
      const usageMetadata = result.usageMetadata || {};
      usage = {
        promptTokens: usageMetadata.promptTokenCount || 0,
        completionTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
      };
    } else {
      throw new Error("No API key configured (neither OPENAI_API_KEY nor GEMINI_API_KEY/VITE_GEMINI_API_KEY was found on the server).");
    }

    // Clean up temp file
    fs.unlinkSync(imagePath);
    imagePath = null;

    // Parse JSON
    let cleanText = responseText.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(json)?/, "");
      cleanText = cleanText.replace(/```$/, "");
    }

    let data = JSON.parse(cleanText.trim());
    
    // Ensure array format
    if (!Array.isArray(data)) {
      if (data && typeof data === "object") {
        // If it extracted a wrapper object containing an array
        const key = Object.keys(data).find(k => Array.isArray(data[k]));
        if (key) {
          data = data[key];
        } else {
          data = [data];
        }
      } else {
        data = [];
      }
    }

    res.json({
      rows: data,
      usage: usage
    });

  } catch (err) {
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    console.error("Extraction error:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
