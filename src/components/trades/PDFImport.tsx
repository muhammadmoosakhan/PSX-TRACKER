'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { ParsedTrade } from '@/lib/pdf-parser';

interface PDFImportProps {
  onImport: (trades: ParsedTrade[]) => Promise<void>;
  onClose: () => void;
}

export default function PDFImport({ onImport, onClose }: PDFImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedTrades, setParsedTrades] = useState<ParsedTrade[] | null>(null);
  const [metadata, setMetadata] = useState<{ client_name?: string; statement_id?: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.pdf'))) {
      setFile(droppedFile);
      parseFile(droppedFile);
    } else {
      setError('Please upload a PDF file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setParsedTrades(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/import/pdf', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setError(data.error || 'Failed to parse PDF');
        return;
      }
      
      setParsedTrades(data.trades);
      setMetadata(data.metadata);
    } catch (err) {
      setError('Failed to process file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!parsedTrades) return;
    
    setImporting(true);
    try {
      await onImport(parsedTrades);
      onClose();
    } catch (err) {
      setError('Failed to import trades. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const totalValue = parsedTrades?.reduce((sum, t) => sum + t.net_value, 0) || 0;
  const totalFees = parsedTrades?.reduce((sum, t) => 
    sum + t.commission + t.sst + t.cdc_fee + t.cvt + t.laga + t.secp + t.ncs, 0
  ) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-[var(--border-light)]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[#A29BFE] flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
                Import from Broker Statement
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Upload your Munir Khanani transaction PDF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {!parsedTrades ? (
            /* Upload Zone */
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive 
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5' 
                  : 'border-[var(--border-light)] hover:border-[var(--accent-primary)]/50'
              }`}
            >
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={loading}
              />
              
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-12 h-12 text-[var(--accent-primary)] animate-spin" />
                  <p className="text-[var(--text-secondary)]">Parsing PDF...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center">
                    <Upload className="w-8 h-8 text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <p className="text-[var(--text-primary)] font-medium">
                      Drag & drop your PDF here
                    </p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      or click to browse
                    </p>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Supports: Munir Khanani Transaction Statements
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Parsed Trades Preview */
            <div className="space-y-4">
              {/* Metadata */}
              {metadata && (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-[var(--bg-secondary)]">
                  <Check className="w-5 h-5 text-green-500" />
                  <div className="text-sm">
                    <span className="text-[var(--text-muted)]">Statement: </span>
                    <span className="text-[var(--text-primary)] font-medium">{metadata.statement_id}</span>
                    {metadata.client_name && (
                      <>
                        <span className="text-[var(--text-muted)]"> • </span>
                        <span className="text-[var(--text-primary)]">{metadata.client_name}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Trades Table */}
              <div className="border border-[var(--border-light)] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-secondary)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Stock</th>
                      <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Type</th>
                      <th className="px-4 py-3 text-right text-[var(--text-muted)] font-medium">Qty</th>
                      <th className="px-4 py-3 text-right text-[var(--text-muted)] font-medium">Rate</th>
                      <th className="px-4 py-3 text-right text-[var(--text-muted)] font-medium">Fees</th>
                      <th className="px-4 py-3 text-right text-[var(--text-muted)] font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)]">
                    {parsedTrades.map((trade, idx) => {
                      const fees = trade.commission + trade.sst + trade.cdc_fee + trade.cvt + trade.laga + trade.secp + trade.ncs;
                      return (
                        <tr key={idx} className="hover:bg-[var(--bg-secondary)]/50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-[var(--text-primary)]">{trade.symbol}</div>
                            <div className="text-xs text-[var(--text-muted)] truncate max-w-[150px]">
                              {trade.stock_name}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              trade.trade_type === 'BUY' 
                                ? 'bg-green-500/10 text-green-500' 
                                : 'bg-red-500/10 text-red-500'
                            }`}>
                              {trade.trade_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-[var(--text-primary)]">
                            {trade.quantity}
                          </td>
                          <td className="px-4 py-3 text-right text-[var(--text-primary)]">
                            {trade.rate_per_share.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-[var(--text-muted)]">
                            {fees.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                            {trade.net_value.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="flex justify-between items-center p-4 rounded-xl bg-[var(--bg-secondary)]">
                <div>
                  <span className="text-[var(--text-muted)]">Total Trades: </span>
                  <span className="font-semibold text-[var(--text-primary)]">{parsedTrades.length}</span>
                  <span className="text-[var(--text-muted)] ml-4">Total Fees: </span>
                  <span className="font-semibold text-[var(--text-primary)]">PKR {totalFees.toFixed(2)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[var(--text-muted)]">Total Value: </span>
                  <span className="font-bold text-lg text-[var(--text-primary)]">
                    PKR {totalValue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-light)] bg-[var(--bg-secondary)]/50">
          <button
            onClick={() => {
              setFile(null);
              setParsedTrades(null);
              setError(null);
            }}
            className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            disabled={importing}
          >
            {parsedTrades ? 'Upload Different File' : 'Cancel'}
          </button>
          
          {parsedTrades && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--accent-primary)] text-white font-medium
                hover:bg-[var(--accent-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Import {parsedTrades.length} Trade{parsedTrades.length > 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
