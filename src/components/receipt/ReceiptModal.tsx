import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bill, AppSettings } from '../../types';
import {
  X,
  Printer,
  Download,
  UtensilsCrossed,
  Receipt as ReceiptIcon,
} from 'lucide-react';
import {
  formatCurrency,
  formatDateTime,
} from '../../utils/format';
import { sound } from '../../utils/sound';
import { downloadReceiptImage } from '../../utils/billImage';
import {
  printViaRawBT,
  printViaWebBluetooth,
} from '../../utils/thermalPrint';

interface ReceiptModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  autoPrintOnOpen?: boolean;
  soundEnabled?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  bill,
  isOpen,
  onClose,
  settings,
  autoPrintOnOpen = false,
  soundEnabled = true,
}) => {
  const [viewMode, setViewMode] = useState<'receipt' | 'kot'>('receipt');
  const [printerWidth, setPrinterWidth] = useState<'58mm' | '80mm'>(
    settings.thermalPrinterSize || '58mm'
  );
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const autoPrintedBillIdRef = React.useRef<string | null>(null);

  const triggerThermalPrint = React.useCallback(
    async (targetMode: 'receipt' | 'kot') => {
      if (!bill) return;
      const mode = settings.printerMode || 'rawbt';

      if (mode === 'bluetooth') {
        setIsPrinting(true);
        setFeedback(null);
        try {
          const res = await printViaWebBluetooth(bill, settings, targetMode, printerWidth);
          setFeedback(res.message);
          setTimeout(() => setFeedback(null), 5000);
        } finally {
          setIsPrinting(false);
        }
      } else if (mode === 'rawbt') {
        printViaRawBT(bill, settings, targetMode, printerWidth);
      } else {
        window.print();
      }
    },
    [bill, settings, printerWidth]
  );

  React.useEffect(() => {
    if (!isOpen || !bill || !autoPrintOnOpen) return;
    if (autoPrintedBillIdRef.current === bill.id) return;
    autoPrintedBillIdRef.current = bill.id;

    const mode = settings.printerMode || 'rawbt';
    if (mode === 'system') {
      const t = setTimeout(() => window.print(), 150);
      return () => clearTimeout(t);
    }
    triggerThermalPrint('receipt');
  }, [isOpen, bill, autoPrintOnOpen, settings.printerMode, triggerThermalPrint]);

  if (!isOpen || !bill) return null;

  const handlePrintBill = () => {
    sound.playTap(soundEnabled);
    triggerThermalPrint(viewMode);
  };

  const handleDownloadImage = async () => {
    sound.playTap(soundEnabled);
    setIsGeneratingImage(true);
    try {
      await downloadReceiptImage(bill, settings);
      setFeedback('Picture saved to downloads!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const isKot = viewMode === 'kot';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150 no-print select-none">
        <div className="w-full max-w-sm sm:max-w-md bg-white border-2 border-black shadow-2xl flex flex-col max-h-[86dvh] overflow-hidden text-black">
          {/* Header */}
          <div className="px-3.5 sm:px-4 py-2.5 border-b-2 border-black flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 border border-red-600 bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                ✓
              </div>
              <div>
                <h3 className="text-sm font-bold text-black">Bill Completed</h3>
                <span className="text-xs text-black/80 font-bold">
                  {bill.id} • Token #{bill.tokenNumber}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 bg-white hover:bg-black hover:text-white border border-black flex items-center justify-center text-black transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher: Receipt vs KOT */}
          <div className="p-2.5 bg-white border-b border-black/30 flex items-center justify-between gap-2 shrink-0">
            <div className="flex p-0.5 bg-white border border-black text-xs">
              <button
                type="button"
                onClick={() => setViewMode('receipt')}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-bold transition-colors ${
                  !isKot
                    ? 'bg-red-600 text-white'
                    : 'text-black hover:bg-black/5'
                }`}
              >
                <ReceiptIcon className="w-3.5 h-3.5" />
                <span>Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kot')}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-bold transition-colors ${
                  isKot
                    ? 'bg-red-600 text-white'
                    : 'text-black hover:bg-black/5'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Kitchen (KOT)</span>
              </button>
            </div>

            {!isKot && (
              <div className="flex items-center gap-1 text-[11px] text-black">
                <button
                  type="button"
                  onClick={() => setPrinterWidth('58mm')}
                  className={`px-2 py-1 border border-black font-bold ${
                    printerWidth === '58mm'
                      ? 'bg-black text-white'
                      : 'bg-white text-black'
                  }`}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => setPrinterWidth('80mm')}
                  className={`px-2 py-1 border border-black font-bold ${
                    printerWidth === '80mm'
                      ? 'bg-black text-white'
                      : 'bg-white text-black'
                  }`}
                >
                  80mm
                </button>
              </div>
            )}
          </div>

          {/* Paper Bill Preview */}
          <div className="flex-1 min-h-0 overflow-y-auto touch-scroll p-3 sm:p-4 bg-black/10 border-b border-black/30 flex items-start justify-center">
            <div
              className={`bg-white text-black p-4 shadow-md border border-black leading-tight max-w-full ${
                printerWidth === '58mm' ? 'w-[270px] text-[11px]' : 'w-[340px] text-xs'
              }`}
            >
              {!isKot ? (
                <div>
                  <div className="text-center pb-2 border-b border-black border-dashed">
                    <h2 className="text-base font-bold uppercase tracking-tight">
                      {settings.businessName}
                    </h2>
                    {settings.tagline && (
                      <p className="text-[10px] italic">{settings.tagline}</p>
                    )}
                    {settings.isHalal && (
                      <p className="text-[10px] font-bold mt-0.5">*** 100% HALAL ***</p>
                    )}
                    {settings.address && (
                      <p className="text-[9px] mt-1">{settings.address}</p>
                    )}
                    {settings.phone && (
                      <p className="text-[9px]">Ph: {settings.phone}</p>
                    )}
                    {settings.gstin && (
                      <p className="text-[9px]">GSTIN: {settings.gstin}</p>
                    )}
                  </div>

                  <div className="py-2 border-b border-black border-dashed text-[10px] space-y-0.5">
                    <div className="flex justify-between font-bold">
                      <span>BILL: {bill.id}</span>
                      <span className="text-xs">TOKEN: #{bill.tokenNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{formatDateTime(bill.timestamp)}</span>
                      <span className="uppercase font-bold">[{bill.orderType}]</span>
                    </div>
                    {bill.tableOrToken && (
                      <div className="text-[10px] font-bold">Ref: {bill.tableOrToken}</div>
                    )}
                  </div>

                  {/* Items */}
                  <div className="py-2 border-b border-black border-dashed space-y-1.5">
                    <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-black">
                      <span>ITEM</span>
                      <span>QTY x RATE</span>
                      <span>AMT</span>
                    </div>
                    {bill.items.map((item, idx) => {
                      let title = item.name;
                      if (item.variantName) title += ` - ${item.variantName}`;
                      if (item.flavourName && item.flavourName !== 'Plain / Original') {
                        title += ` (${item.flavourName})`;
                      }
                      return (
                        <div key={idx} className="space-y-0.5">
                          <div className="font-bold">{title}</div>
                          <div className="flex justify-between text-[10px]">
                            <span>
                              {item.quantity} x {formatCurrency(item.unitPrice)}
                            </span>
                            <span className="font-bold">
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </span>
                          </div>
                          {item.notes && (
                            <div className="text-[9px] italic pl-2">
                              * {item.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Totals */}
                  <div className="py-2 border-b border-black border-dashed space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(bill.subtotal)}</span>
                    </div>
                    {bill.discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>-{formatCurrency(bill.discountAmount)}</span>
                      </div>
                    )}
                    {bill.gstEnabled && bill.gstAmount > 0 && (
                      <div className="flex justify-between">
                        <span>GST ({bill.gstRate}%):</span>
                        <span>+{formatCurrency(bill.gstAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold pt-1 border-t border-black">
                      <span>TOTAL:</span>
                      <span>{formatCurrency(bill.totalAmount)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-black text-[10px] space-y-0.5">
                      <div className="font-bold uppercase">
                        Method of Payment: {bill.paymentMethod}
                      </div>
                      {bill.paymentMethod === 'cash' && bill.paymentSplit && (
                        <div className="text-[9px] flex justify-between">
                          <span>Cash Received: {formatCurrency(bill.paymentSplit.cashReceived || bill.totalAmount)}</span>
                          <span>Change Due: {formatCurrency(bill.paymentSplit.cashChange || 0)}</span>
                        </div>
                      )}
                      {bill.paymentMethod === 'upi' && (
                        <div className="text-[9px]">
                          UPI Ref: {settings.upiId || 'Verified QR'}
                        </div>
                      )}
                      {bill.paymentMethod === 'card' && (
                        <div className="text-[9px]">
                          Terminal: POS Card Transaction
                        </div>
                      )}
                      {bill.paymentMethod === 'split' && bill.paymentSplit && (
                        <div className="text-[9px] space-y-0.5">
                          {bill.paymentSplit.cash > 0 && <div>• Cash: {formatCurrency(bill.paymentSplit.cash)} (Rec: {formatCurrency(bill.paymentSplit.cashReceived || bill.paymentSplit.cash)}, Chg: {formatCurrency(bill.paymentSplit.cashChange || 0)})</div>}
                          {bill.paymentSplit.upi > 0 && <div>• UPI QR: {formatCurrency(bill.paymentSplit.upi)}</div>}
                          {bill.paymentSplit.card > 0 && <div>• Card: {formatCurrency(bill.paymentSplit.card)}</div>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-2 text-center text-[9px] space-y-0.5">
                    <p>{settings.receiptFooter || 'Thank you for visiting!'}</p>
                    <p className="text-[8px]">The BBQ Boxx POS</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-center pb-2 border-b-2 border-black">
                    <div className="text-xl font-bold">*** KITCHEN TOKEN ***</div>
                    <div className="text-2xl font-bold my-1">#{bill.tokenNumber}</div>
                    <div className="text-xs uppercase font-bold">
                      {bill.orderType} {bill.tableOrToken ? `• ${bill.tableOrToken}` : ''}
                    </div>
                    <div className="text-[11px] font-bold uppercase mt-1 px-2 py-0.5 bg-black text-white inline-block">
                      PAID: {bill.paymentMethod.toUpperCase()}
                    </div>
                    <div className="text-[10px] mt-1">
                      {formatDateTime(bill.timestamp)} • Bill: {bill.id}
                    </div>
                  </div>

                  <div className="py-2 space-y-2">
                    {bill.items.map((it, idx) => (
                      <div key={idx} className="border-b border-black pb-1.5">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-bold">
                            {it.quantity} x {it.name}
                          </span>
                        </div>
                        {it.variantName && (
                          <div className="text-xs font-bold pl-3">Size: {it.variantName}</div>
                        )}
                        {it.flavourName && it.flavourName !== 'Plain / Original' && (
                          <div className="text-xs font-bold pl-3">
                            Flavour: {it.flavourName}
                          </div>
                        )}
                        {it.notes && (
                          <div className="text-xs font-bold border border-black p-1 mt-0.5 pl-3">
                            NOTE: {it.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 text-center text-[10px] font-bold">
                    Total Items: {bill.itemCount}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-3 bg-white border-t-2 border-black space-y-2 shrink-0">
            {feedback && (
              <div className="p-2 border border-black bg-black text-white text-xs font-bold text-center">
                {feedback}
              </div>
            )}

            <button
              type="button"
              disabled={isPrinting}
              onClick={handlePrintBill}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 border border-red-600 transition-colors min-h-[44px] shadow-sm"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isPrinting ? 'Printing...' : isKot ? 'Print KOT' : 'Print Bill'}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isGeneratingImage}
                onClick={handleDownloadImage}
                className="py-2 bg-white hover:bg-black hover:text-white active:scale-95 disabled:opacity-50 text-black font-bold text-xs flex items-center justify-center gap-1.5 border border-black transition-colors min-h-[40px]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGeneratingImage ? 'Saving...' : 'Download Picture'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-2 bg-black hover:bg-black/90 active:scale-95 text-white font-bold text-xs border border-black transition-colors min-h-[40px]"
              >
                Start Next Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Thermal Printer DOM Element */}
      {createPortal(
        <div id="thermal-receipt-print-area" className={printerWidth === '58mm' ? 'receipt-58mm' : 'receipt-80mm'}>
        {!isKot ? (
          <div>
            <div style={{ textAlign: 'center', paddingBottom: '4px', borderBottom: '1px dashed black' }}>
              <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{settings.businessName}</div>
              {settings.tagline && <div style={{ fontSize: '10px' }}>{settings.tagline}</div>}
              {settings.isHalal && <div style={{ fontSize: '10px', fontWeight: 'bold' }}>*** 100% HALAL ***</div>}
              {settings.address && <div style={{ fontSize: '9px' }}>{settings.address}</div>}
              {settings.phone && <div style={{ fontSize: '9px' }}>Ph: {settings.phone}</div>}
              {settings.gstin && <div style={{ fontSize: '9px' }}>GSTIN: {settings.gstin}</div>}
            </div>

            <div style={{ padding: '4px 0', borderBottom: '1px dashed black', fontSize: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>BILL: {bill.id}</strong>
                <strong>TOKEN: #{bill.tokenNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{formatDateTime(bill.timestamp)}</span>
                <span>[{bill.orderType.toUpperCase()}]</span>
              </div>
              {bill.tableOrToken && <div>Ref: {bill.tableOrToken}</div>}
            </div>

            <div style={{ padding: '4px 0', borderBottom: '1px dashed black' }}>
              {bill.items.map((item, idx) => {
                let title = item.name;
                if (item.variantName) title += ` - ${item.variantName}`;
                if (item.flavourName && item.flavourName !== 'Plain / Original') {
                  title += ` (${item.flavourName})`;
                }
                return (
                  <div key={idx} style={{ marginBottom: '4px' }}>
                    <div style={{ fontWeight: 'bold' }}>{title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                      <span>{item.quantity} x {formatCurrency(item.unitPrice)}</span>
                      <span>{formatCurrency(item.quantity * item.unitPrice)}</span>
                    </div>
                    {item.notes && <div style={{ fontSize: '9px', fontStyle: 'italic' }}>* {item.notes}</div>}
                  </div>
                );
              })}
            </div>

            <div style={{ padding: '4px 0', borderBottom: '1px dashed black' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(bill.subtotal)}</span>
              </div>
              {bill.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discount:</span>
                  <span>-{formatCurrency(bill.discountAmount)}</span>
                </div>
              )}
              {bill.gstEnabled && bill.gstAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>GST ({bill.gstRate}%):</span>
                  <span>+{formatCurrency(bill.gstAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', borderTop: '1px solid black', marginTop: '3px', paddingTop: '2px' }}>
                <span>TOTAL:</span>
                <span>{formatCurrency(bill.totalAmount)}</span>
              </div>
              <div style={{ fontSize: '10px', marginTop: '3px', fontWeight: 'bold', borderTop: '1px dashed #666', paddingTop: '2px' }}>
                PAYMENT METHOD: {bill.paymentMethod.toUpperCase()}
              </div>
              {bill.paymentMethod === 'cash' && bill.paymentSplit && (
                <div style={{ fontSize: '9px' }}>
                  Rec: {formatCurrency(bill.paymentSplit.cashReceived || bill.totalAmount)} | Change: {formatCurrency(bill.paymentSplit.cashChange || 0)}
                </div>
              )}
              {bill.paymentMethod === 'split' && bill.paymentSplit && (
                <div style={{ fontSize: '9px' }}>
                  Cash: {formatCurrency(bill.paymentSplit.cash)} | UPI: {formatCurrency(bill.paymentSplit.upi)}
                  {bill.paymentSplit.card > 0 ? ` | Card: ${formatCurrency(bill.paymentSplit.card)}` : ''}
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '6px' }}>
              <div>{settings.receiptFooter || 'Thank you for visiting!'}</div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '4px' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>*** KITCHEN TOKEN ***</div>
              <div style={{ fontSize: '26px', fontWeight: 'bold', margin: '4px 0' }}>#{bill.tokenNumber}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{bill.orderType.toUpperCase()} {bill.tableOrToken ? `(${bill.tableOrToken})` : ''}</div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '2px', background: '#000', color: '#fff', display: 'inline-block', padding: '1px 6px' }}>
                PAID: {bill.paymentMethod.toUpperCase()}
              </div>
              <div style={{ fontSize: '9px', marginTop: '2px' }}>{formatDateTime(bill.timestamp)} • Bill {bill.id}</div>
            </div>

            <div style={{ padding: '6px 0' }}>
              {bill.items.map((it, idx) => (
                <div key={idx} style={{ marginBottom: '6px', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{it.quantity} x {it.name}</div>
                  {it.variantName && <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Size: {it.variantName}</div>}
                  {it.flavourName && it.flavourName !== 'Plain / Original' && (
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Flavour: {it.flavourName}</div>
                  )}
                  {it.notes && <div style={{ fontSize: '11px', fontStyle: 'italic', background: '#eee', padding: '2px' }}>NOTE: {it.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        </div>,
        document.body
      )}
    </>
  );
};
