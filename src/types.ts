export interface InvoiceRow {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  companyName: string;
  companyGSTIN: string;
  companyAddress: string;
  customerName: string;
  customerAddress: string;
  customerGSTIN: string;
  state: string;
  stateCode: string;
  transportationMode: string;
  vehicleNumber: string;
  dateOfSupply: string;
  placeOfSupply: string;
  productDescription: string;
  hsnCode: string;
  taxRate: string;
  quantity: string;
  unit: string;
  rate: string;
  taxableValue: string;
  cgst: string;
  sgst: string;
  igst: string;
  totalAmount: string;
  amountInWords: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  ifscCode: string;
  termsAndConditions: string;
}

export interface SalesAccountRow {
  id: string;
  date: string;
  particulars: string;
  dcNo: string;
  productName: string;
  noOfBody: string;
  unitPrice: string;
  totalAmount: string;
  cgstSgst: string;
}

export type DocumentType = 'invoice' | 'sales_account';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: DocumentType;
  previewUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedData?: any[];
}
