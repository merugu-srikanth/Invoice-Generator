import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Copy,
  FileText,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  FileImage,
  CheckCircle2,
  Eye,
  Columns,
  SquareCheck,
  Square,
  Cpu,
  X,
  Camera,
  Key
} from 'lucide-react';
import axios from 'axios';

export default function App() {
  const [activeTab, setActiveTab] = useState<'invoice' | 'sales_account'>('invoice');
  const [invoices, setInvoices] = useState<any[]>(() => {
    const saved = localStorage.getItem('sf_invoices');
    return saved ? JSON.parse(saved) : [];
  });
  const [salesAccounts, setSalesAccounts] = useState<any[]>(() => {
    const saved = localStorage.getItem('sf_sales_accounts');
    return saved ? JSON.parse(saved) : [];
  });

  const [invoiceCols, setInvoiceCols] = useState<{ key: string, label: string }[]>(() => {
    const saved = localStorage.getItem('sf_invoice_cols');
    return saved ? JSON.parse(saved) : [
      { key: 'invoiceNo', label: 'Invoice No' },
      { key: 'invoiceDate', label: 'Invoice Date' },
      { key: 'companyName', label: 'Company Name' },
      { key: 'companyGSTIN', label: 'Company GSTIN' },
      { key: 'companyAddress', label: 'Company Address' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'customerAddress', label: 'Customer Address' },
      { key: 'customerGSTIN', label: 'Customer GSTIN' },
      { key: 'state', label: 'State' },
      { key: 'stateCode', label: 'State Code' },
      { key: 'transportationMode', label: 'Transportation Mode' },
      { key: 'vehicleNumber', label: 'Vehicle Number' },
      { key: 'dateOfSupply', label: 'Date Of Supply' },
      { key: 'placeOfSupply', label: 'Place Of Supply' },
      { key: 'productDescription', label: 'Product Description' },
      { key: 'hsnCode', label: 'HSN Code' },
      { key: 'taxRate', label: 'Tax Rate' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'unit', label: 'Unit' },
      { key: 'rate', label: 'Rate' },
      { key: 'taxableValue', label: 'Taxable Value' },
      { key: 'cgst', label: 'CGST' },
      { key: 'sgst', label: 'SGST' },
      { key: 'igst', label: 'IGST' },
      { key: 'totalAmount', label: 'Total Amount' },
      { key: 'amountInWords', label: 'Amount In Words' },
      { key: 'bankName', label: 'Bank Name' },
      { key: 'branch', label: 'Branch' },
      { key: 'accountNumber', label: 'Account Number' },
      { key: 'ifscCode', label: 'IFSC Code' },
      { key: 'termsAndConditions', label: 'Terms And Conditions' }
    ];
  });

  const [salesCols, setSalesCols] = useState<{ key: string, label: string }[]>(() => {
    const saved = localStorage.getItem('sf_sales_cols');
    return saved ? JSON.parse(saved) : [
      { key: 'date', label: 'Date' },
      { key: 'particulars', label: 'Particulars (Details)' },
      { key: 'dcNo', label: 'DC No' },
      { key: 'productName', label: 'Product Name' },
      { key: 'noOfBody', label: 'No Of Body' },
      { key: 'unitPrice', label: 'Unit Price' },
      { key: 'totalAmount', label: 'Total Amount' },
      { key: 'cgstSgst', label: 'CGST / SGST' }
    ];
  });

  const [selectedInvoiceRowIds, setSelectedInvoiceRowIds] = useState<string[]>([]);
  const [selectedSalesRowIds, setSelectedSalesRowIds] = useState<string[]>([]);

  const [showColEditor, setShowColEditor] = useState<boolean>(false);
  const [newColLabel, setNewColLabel] = useState<string>('');

  const [files, setFiles] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [showCodePreview, setShowCodePreview] = useState<boolean>(false);

  // Preview Modal overlay State
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<boolean>(false);
  const [passwordValue, setPasswordValue] = useState<string>('');

  const [tokenStats, setTokenStats] = useState<{ used: number; remaining: number }>(() => {
    const saved = localStorage.getItem('sf_token_stats');
    return saved ? JSON.parse(saved) : { used: 0, remaining: 1048576 };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const singleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('sf_invoices', JSON.stringify(invoices));
    const currentIds = invoices.map(r => r.id);
    setSelectedInvoiceRowIds(prev => prev.filter(id => currentIds.includes(id)));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('sf_sales_accounts', JSON.stringify(salesAccounts));
    const currentIds = salesAccounts.map(r => r.id);
    setSelectedSalesRowIds(prev => prev.filter(id => currentIds.includes(id)));
  }, [salesAccounts]);

  useEffect(() => {
    localStorage.setItem('sf_invoice_cols', JSON.stringify(invoiceCols));
  }, [invoiceCols]);

  useEffect(() => {
    localStorage.setItem('sf_sales_cols', JSON.stringify(salesCols));
  }, [salesCols]);

  useEffect(() => {
    localStorage.setItem('sf_token_stats', JSON.stringify(tokenStats));
  }, [tokenStats]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const addColumn = () => {
    if (!newColLabel.trim()) return;
    const key = newColLabel.trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    if (activeTab === 'invoice') {
      if (invoiceCols.some(c => c.key === key)) {
        showNotification('error', 'Column key already exists!');
        return;
      }
      setInvoiceCols(prev => [...prev, { key, label: newColLabel.trim() }]);
    } else {
      if (salesCols.some(c => c.key === key)) {
        showNotification('error', 'Column key already exists!');
        return;
      }
      setSalesCols(prev => [...prev, { key, label: newColLabel.trim() }]);
    }

    setNewColLabel('');
    showNotification('success', `Column "${newColLabel}" added.`);
  };

  const deleteColumn = (keyToDelete: string) => {
    if (activeTab === 'invoice') {
      setInvoiceCols(prev => prev.filter(c => c.key !== keyToDelete));
    } else {
      setSalesCols(prev => prev.filter(c => c.key !== keyToDelete));
    }
    showNotification('info', 'Column removed.');
  };

  const editColumnLabel = (key: string, newLabel: string) => {
    if (activeTab === 'invoice') {
      setInvoiceCols(prev => prev.map(c => c.key === key ? { ...c, label: newLabel } : c));
    } else {
      setSalesCols(prev => prev.map(c => c.key === key ? { ...c, label: newLabel } : c));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFiles(Array.from(e.target.files));
    if (e.target) e.target.value = '';
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFiles(Array.from(e.target.files));
    if (e.target) e.target.value = '';
  };

  const handleSingleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    addFiles([e.target.files[0]]);
    if (e.target) e.target.value = '';
  };

  const addFiles = (selectedFiles: File[]) => {
    const newFiles = selectedFiles.map(file => {
      const nameLower = file.name.toLowerCase();
      let type: 'invoice' | 'sales_account' = 'invoice';
      if (nameLower.includes('sales') || nameLower.includes('account') || nameLower.includes('ledger') || nameLower.includes('sheet2') || nameLower.includes('body')) {
        type = 'sales_account';
      }

      return {
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size,
        type,
        previewUrl: URL.createObjectURL(file),
        status: 'pending'
      };
    });

    setFiles(prev => [...prev, ...newFiles]);
    showNotification('success', `Added ${newFiles.length} file(s) to queue.`);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const toggleFileType = (id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, type: f.type === 'invoice' ? 'sales_account' : 'invoice' } : f));
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const filtered = prev.filter(f => f.id !== id);
      const target = prev.find(f => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return filtered;
    });
  };

  const processQueue = async () => {
    if (files.length === 0) {
      showNotification('error', 'No files in the upload queue!');
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    const filesToProcess = [...files];

    for (let i = 0; i < filesToProcess.length; i++) {
      const fileItem = filesToProcess[i];
      if (fileItem.status === 'completed') continue;

      setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'processing' } : f));

      try {
        const formData = new FormData();
        formData.append("image", fileItem.file);
        formData.append("type", fileItem.type);

        const response = await axios.post("/api/extract-invoice", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        const uuid = () => Math.random().toString(36).substring(2, 9);
        const rowsWithId = response.data.rows.map((row: any) => ({ ...row, id: uuid() }));

        const tokensSpent = response.data.usage?.totalTokens || 0;
        setTokenStats(prev => {
          const nextUsed = prev.used + tokensSpent;
          const nextRemaining = Math.max(0, prev.remaining - tokensSpent);
          return { used: nextUsed, remaining: nextRemaining };
        });

        if (fileItem.type === 'invoice') {
          setInvoices(prev => [...prev, ...rowsWithId]);
          setActiveTab('invoice');
        } else {
          setSalesAccounts(prev => [...prev, ...rowsWithId]);
          setActiveTab('sales_account');
        }

        // Remove from queue since it was successfully converted
        setFiles(prev => {
          const target = prev.find(f => f.id === fileItem.id);
          if (target) URL.revokeObjectURL(target.previewUrl);
          return prev.filter(f => f.id !== fileItem.id);
        });

        successCount++;
        showNotification('success', `Successfully converted and extracted data from ${fileItem.name}!`);
      } catch (err: any) {
        console.error(err);
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'error' } : f));
        showNotification('error', `Failed to parse ${fileItem.name}: ${err.response?.data?.error || err.message || err}`);
      }
    }

    setIsProcessing(false);
    if (successCount > 0) {
      showNotification('success', `Successfully processed ${successCount} file(s).`);
    }
  };

  const handleCellEdit = (tab: 'invoice' | 'sales_account', index: number, key: string, val: string) => {
    if (tab === 'invoice') {
      setInvoices(prev => prev.map((row, idx) => idx === index ? { ...row, [key]: val } : row));
    } else {
      setSalesAccounts(prev => prev.map((row, idx) => idx === index ? { ...row, [key]: val } : row));
    }
  };

  const addBlankRow = () => {
    const id = Math.random().toString(36).substring(2, 9);
    const cols = activeTab === 'invoice' ? invoiceCols : salesCols;
    const newRow = cols.reduce((acc, col) => ({ ...acc, [col.key]: '' }), { id });
    if (activeTab === 'invoice') {
      setInvoices(prev => [...prev, newRow]);
    } else {
      setSalesAccounts(prev => [...prev, newRow]);
    }
    showNotification('success', 'Blank row added successfully.');
  };

  const toggleRowSelect = (id: string) => {
    if (activeTab === 'invoice') {
      setSelectedInvoiceRowIds(prev =>
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
    } else {
      setSelectedSalesRowIds(prev =>
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
    }
  };

  const toggleSelectAll = () => {
    const rows = activeTab === 'invoice' ? invoices : salesAccounts;
    const selectedIds = activeTab === 'invoice' ? selectedInvoiceRowIds : selectedSalesRowIds;

    if (selectedIds.length === rows.length) {
      if (activeTab === 'invoice') setSelectedInvoiceRowIds([]);
      else setSelectedSalesRowIds([]);
    } else {
      const allIds = rows.map(r => r.id);
      if (activeTab === 'invoice') setSelectedInvoiceRowIds(allIds);
      else setSelectedSalesRowIds(allIds);
    }
  };

  const deleteRow = (index: number) => {
    setConfirmDialog({
      message: 'Are you sure you want to delete this row?',
      onConfirm: () => {
        if (activeTab === 'invoice') {
          setInvoices(prev => prev.filter((_, idx) => idx !== index));
        } else {
          setSalesAccounts(prev => prev.filter((_, idx) => idx !== index));
        }
        showNotification('success', 'Row deleted successfully.');
        setConfirmDialog(null);
      }
    });
  };

  const deleteSelectedRows = () => {
    const selectedIds = activeTab === 'invoice' ? selectedInvoiceRowIds : selectedSalesRowIds;
    if (selectedIds.length === 0) return;

    setConfirmDialog({
      message: `Are you sure you want to delete the ${selectedIds.length} selected row(s)?`,
      onConfirm: () => {
        if (activeTab === 'invoice') {
          setInvoices(prev => prev.filter(row => !selectedIds.includes(row.id)));
          setSelectedInvoiceRowIds([]);
        } else {
          setSalesAccounts(prev => prev.filter(row => !selectedIds.includes(row.id)));
          setSelectedSalesRowIds([]);
        }
        showNotification('success', `Deleted ${selectedIds.length} selected row(s).`);
        setConfirmDialog(null);
      }
    });
  };

  const clearDatabase = () => {
    setConfirmDialog({
      message: 'Are you sure you want to clear all records from the database?',
      onConfirm: () => {
        if (activeTab === 'invoice') {
          setInvoices([]);
          setSelectedInvoiceRowIds([]);
        } else {
          setSalesAccounts([]);
          setSelectedSalesRowIds([]);
        }
        showNotification('info', 'Cleared all database records.');
        setConfirmDialog(null);
      }
    });
  };

  const resetTokenStats = () => {
    setShowPasswordPrompt(true);
    setPasswordValue('');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordValue === 'Sree@123') {
      setTokenStats({ used: 0, remaining: 1048576 });
      setShowPasswordPrompt(false);
      showNotification('success', 'Token counter reset successfully.');
    } else {
      showNotification('error', 'Incorrect password! Password not matched.');
    }
  };

  const exportToExcel = () => {
    const dataToExport = activeTab === 'invoice' ? invoices : salesAccounts;
    if (dataToExport.length === 0) {
      showNotification('error', 'No database entries to export!');
      return;
    }

    const cleanData = dataToExport.map(row => {
      const copy = { ...row };
      delete copy.id;
      return copy;
    });

    const worksheet = XLSX.utils.json_to_sheet(cleanData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === 'invoice' ? 'Invoices' : 'Sales Accounts');
    XLSX.writeFile(workbook, `Database_${activeTab}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showNotification('success', 'Excel Spreadsheet downloaded!');
  };

  const generateStandaloneHTML = () => {
    const isInvoice = activeTab === 'invoice';
    const cols = isInvoice ? invoiceCols : salesCols;
    const rows = isInvoice ? invoices : salesAccounts;

    const headersHTML = cols.map(c => `        <th>${c.label}</th>`).join('\n');

    const rowsHTML = rows.map((row) => {
      const tds = cols.map(c => `        <td>${row[c.key] || ''}</td>`).join('\n');
      return `      <tr>\n${tds}\n      </tr>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isInvoice ? 'Invoice' : 'Sales Account'} Database Table</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      background-color: #f8fafc;
      color: #1e293b;
    }
    .table-container {
      max-width: 100%;
      overflow-x: auto;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
      white-space: nowrap;
    }
    thead {
      position: sticky;
      top: 0;
      z-index: 10;
    }
    th {
      background-color: #f1f5f9;
      color: #1e293b;
      font-weight: 600;
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      text-transform: uppercase;
      font-size: 11px;
    }
    td {
      padding: 8px 14px;
      border: 1px solid #e2e8f0;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    tr:hover {
      background-color: #eff6ff;
    }
  </style>
</head>
<body>
  <h2>${isInvoice ? 'Invoice' : 'Sales Account'} Database Table</h2>
  <div class="table-container">
    <table>
      <thead>
        <tr>
${headersHTML}
        </tr>
      </thead>
      <tbody>
${rowsHTML || '        <tr><td colspan="' + cols.length + '" style="text-align: center; color: #94a3b8; padding: 20px;">No entries available.</td></tr>'}
      </tbody>
    </table>
  </div>
</body>
</html>`;
  };

  const copyHTMLCode = () => {
    navigator.clipboard.writeText(generateStandaloneHTML());
    showNotification('success', 'Standalone HTML & CSS code copied to clipboard!');
  };

  const downloadHTMLFile = () => {
    const html = generateStandaloneHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_database.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('success', 'HTML file downloaded!');
  };

  const currentCols = activeTab === 'invoice' ? invoiceCols : salesCols;
  const currentRows = activeTab === 'invoice' ? invoices : salesAccounts;
  const selectedRowIds = activeTab === 'invoice' ? selectedInvoiceRowIds : selectedSalesRowIds;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative">

      {/* Image Preview Modal Overlay */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-2xl relative">
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Document Preview</h4>
            <div className="overflow-auto max-h-[70vh] rounded-lg border border-slate-200">
              <img src={previewImageUrl} alt="Uploaded Document Preview" className="w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-[9999] bg-white border border-blue-500 rounded-xl px-4 py-3 shadow-xl flex items-center gap-3 max-w-sm">
          <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
          <p className="text-sm font-semibold text-slate-700">{notification.message}</p>
        </div>
      )}

      {/* Confirmation Dialog Overlay */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative border border-slate-150">
            <h4 className="text-base font-bold text-slate-950 mb-2 font-outfit">Confirm Action</h4>
            <p className="text-sm text-slate-600 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors text-xs font-semibold shadow-sm cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Prompt Modal Overlay */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handlePasswordSubmit}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative border border-slate-150"
          >
            <h4 className="text-base font-bold text-slate-950 mb-2 font-outfit">Reset Confirmation</h4>
            <p className="text-sm text-slate-600 mb-4">Please enter the password to authorize resetting the token counter.</p>

            <input
              type="password"
              placeholder="Enter password..."
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mb-6 font-mono"
              autoFocus
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPasswordPrompt(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-xs font-semibold shadow-sm cursor-pointer"
              >
                Authorize
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Header bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-outfit">SheetForge</h1>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Image Ledger Parser</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-4 bg-blue-50 border border-blue-100 rounded-xl px-3 py-1 text-xs">
              <div className="flex items-center gap-1.5 text-blue-700">
                <Cpu className="w-4 h-4" />
                <span className="font-bold">Tokens Used:</span>
                <span>{tokenStats.used.toLocaleString()}</span>
              </div>
              <div className="w-px h-4 bg-blue-200" />
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="font-bold">Remaining Credits:</span>
                <span>{tokenStats.remaining.toLocaleString()}</span>
              </div>
              <button
                onClick={resetTokenStats}
                className="text-[10px] text-blue-500 hover:text-blue-700 underline font-semibold cursor-pointer select-none"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">

        {/* Token Tracker banner for small screens */}
        <div className="lg:hidden bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between text-xs">
          <div className="flex flex-col gap-1">
            <span className="text-blue-700 font-bold flex items-center gap-1.5">
              <Cpu className="w-4 h-4" /> Tokens Used: {tokenStats.used.toLocaleString()}
            </span>
            <span className="text-slate-600">Remaining Credits: {tokenStats.remaining.toLocaleString()}</span>
          </div>
          <button onClick={resetTokenStats} className="bg-white border border-blue-200 text-blue-600 px-3 py-1 rounded-lg font-bold">
            Reset Counter
          </button>
        </div>

        {/* Upload Block */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Upload Document Images
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Drag & drop or select images. Works great on mobile using the camera.
              </p>
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition-all duration-300 bg-slate-50 hover:bg-blue-50/20 flex flex-col items-center justify-center min-h-[140px] group"
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />
              <input type="file" ref={cameraInputRef} onChange={handleCameraChange} accept="image/*" capture="environment" className="hidden" />
              <input type="file" ref={singleInputRef} onChange={handleSingleChange} accept="image/*" className="hidden" />

              <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors mb-2" />
              <p className="text-sm font-medium text-slate-650">Drag & drop bulk images here, or <span className="text-blue-650 font-semibold underline">browse bulk</span></p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-4 text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Take Photo (Camera)
              </button>

              <button
                onClick={() => singleInputRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl py-3 px-4 text-xs font-semibold transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                Upload Single Image
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm">
            <h3 className="text-lg font-bold text-slate-950 flex items-center justify-between">
              <span>Queue ({files.length})</span>
            </h3>

            {files.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8">
                <FileImage className="w-12 h-12 text-slate-200 mb-2" />
                <p className="text-xs">Queue is currently empty</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
                  {files.map((fileItem) => (
                    <div key={fileItem.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-700 truncate">{fileItem.name}</p>
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => toggleFileType(fileItem.id)}
                            className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-blue-100"
                          >
                            {fileItem.type === 'invoice' ? 'Type 1: Invoice' : 'Type 2: Ledger'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Preview button */}
                        <button
                          onClick={() => setPreviewImageUrl(fileItem.previewUrl)}
                          className="p-1 hover:bg-slate-100 text-blue-600 rounded"
                          title="Preview uploaded image"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {fileItem.status === 'processing' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />}
                        {fileItem.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        <button onClick={() => removeFile(fileItem.id)} className="text-slate-400 hover:text-rose-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={processQueue}
                  disabled={isProcessing}
                  className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-xl flex items-center justify-center gap-2 text-sm cursor-pointer shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Convert to Table Database
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Columns Editor */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <button
            onClick={() => setShowColEditor(!showColEditor)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors"
          >
            <Columns className="w-4 h-4 text-blue-600" />
            {showColEditor ? 'Close Columns Manager' : 'Manage Table Columns (Add & Edit Headers)'}
          </button>

          {showColEditor && (
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-2 font-medium">Create custom Excel columns to accommodate extra fields dynamically:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter new column name..."
                    value={newColLabel}
                    onChange={(e) => setNewColLabel(e.target.value)}
                    className="bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-lg text-slate-750 focus:ring-1 focus:ring-blue-500 outline-none w-full max-w-sm"
                  />
                  <button onClick={addColumn} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold">
                    <Plus className="w-4 h-4" /> Add Column
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                {currentCols.map((col) => (
                  <div key={col.key} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs shadow-sm">
                    <input
                      type="text"
                      value={col.label}
                      onChange={(e) => editColumnLabel(col.key, e.target.value)}
                      className="bg-transparent border-none focus:ring-1 focus:ring-blue-500 text-slate-700 outline-none w-28 font-semibold"
                    />
                    <button onClick={() => deleteColumn(col.key)} className="text-slate-400 hover:text-rose-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SpreadSheet grid */}
        <div className="bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">

          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">

            <div className="flex gap-2 bg-slate-200 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('invoice')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'invoice' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                Invoices ({invoices.length})
              </button>
              <button disabled
                onClick={() => setActiveTab('sales_account')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'sales_account' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                Sales Account ({salesAccounts.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={addBlankRow} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 font-semibold shadow-sm">
                <Plus className="w-3.5 h-3.5 text-blue-600" /> Add Row
              </button>

              {selectedRowIds.length > 0 && (
                <button onClick={deleteSelectedRows} className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 font-semibold shadow-sm">
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedRowIds.length})
                </button>
              )}

              <button onClick={exportToExcel} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 font-semibold shadow-sm">
                <Download className="w-3.5 h-3.5" /> Export XLSX
              </button>

              <button onClick={downloadHTMLFile} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 font-semibold shadow-sm">
                <FileText className="w-3.5 h-3.5" /> Download HTML
              </button>

              <button onClick={copyHTMLCode} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 font-semibold shadow-sm">
                <Copy className="w-3.5 h-3.5 text-blue-600" /> Copy HTML
              </button>

              <button onClick={() => setShowCodePreview(!showCodePreview)} className="bg-white hover:bg-slate-50 text-slate-500 text-xs px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                {showCodePreview ? 'Hide Code' : 'View Code'}
              </button>

              <button onClick={clearDatabase} className="text-xs text-rose-500 hover:text-rose-700 font-bold px-2 py-2">
                Clear All
              </button>
            </div>
          </div>

          {showCodePreview && (
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <pre className="text-xs font-mono max-h-48 overflow-y-auto bg-white p-3 rounded-lg border border-slate-200 text-slate-700 select-all">
                {generateStandaloneHTML()}
              </pre>
            </div>
          )}

          {/* spreadsheet container */}
          <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
            <table className="w-full border-collapse text-left text-xs text-slate-700 font-mono whitespace-nowrap">

              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
                  <th className="px-4 py-3 bg-slate-100 border border-slate-200 text-center w-12 select-none">
                    <button onClick={toggleSelectAll} className="p-1 hover:bg-slate-200 rounded transition-colors text-blue-600">
                      {selectedRowIds.length === currentRows.length && currentRows.length > 0 ? (
                        <SquareCheck className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 bg-slate-100 border border-slate-200 text-center w-12">Action</th>
                  <th className="px-4 py-3 bg-slate-100 border border-slate-200 text-center w-10">#</th>
                  {currentCols.map((col) => (
                    <th key={col.key} className="px-4 py-3 bg-slate-100 border border-slate-200 font-bold">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {currentRows.length === 0 ? (
                  <tr>
                    <td colSpan={currentCols.length + 3} className="px-6 py-16 text-center text-slate-400 font-sans">
                      <FileSpreadsheet className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm font-medium">Spreadsheet is empty.</p>
                      <p className="text-xs text-slate-450 mt-1">Upload document images to get started.</p>
                    </td>
                  </tr>
                ) : (
                  currentRows.map((row, idx) => {
                    const isSelected = selectedRowIds.includes(row.id);
                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-blue-50/50 transition-colors duration-150 ${isSelected ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                          }`}
                      >
                        <td className="px-3 py-2 border border-slate-200 text-center select-none">
                          <button onClick={() => toggleRowSelect(row.id)} className="p-1 hover:bg-slate-100 rounded transition-colors text-blue-600">
                            {isSelected ? <SquareCheck className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
                          </button>
                        </td>

                        <td className="px-3 py-2 border border-slate-200 text-center">
                          <button onClick={() => deleteRow(idx)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>

                        <td className="px-3 py-2 border border-slate-200 text-center font-bold text-slate-400 bg-slate-50/20">
                          {idx + 1}
                        </td>

                        {currentCols.map((col) => (
                          <td key={col.key} className="px-2 py-1.5 border border-slate-200 min-w-[120px]">
                            <input
                              type="text"
                              value={row[col.key] || ''}
                              onChange={(e) => handleCellEdit(activeTab, idx, col.key, e.target.value)}
                              className="w-full bg-transparent border-none py-0.5 px-1 outline-none text-slate-700 focus:bg-blue-500/10 focus:ring-1 focus:ring-blue-500/40 rounded transition-all font-semibold"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {currentRows.length} row(s) | {selectedRowIds.length} selected</span>
            <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-blue-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block animate-ping"></span>
              Database Synced
            </span>
          </div>

        </div>

      </main>
    </div>
  );
}
