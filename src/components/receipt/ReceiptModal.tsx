import React, { useState } from 'react';
import { Bill, AppSettings } from '../../types';
import {
  X,
  Printer,
  Share2,
  Download,
  UtensilsCrossed,
  Receipt as ReceiptIcon,
  CheckCircle2,
  Copy,
  Send,
  Image as ImageIcon,
} from 'lucide-react';
import {
  formatCurrency,
  formatDateTime,
  generateWhatsAppMessage,
} from '../../utils/format';
import { sound } from '../../utils/sound';
import { shareBillAsImageToWhatsApp, downloadReceiptImage } from '../../utils/billImage';

interface ReceiptModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  soundEnabled?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  bill,
  isOpen,
  onClose,
  settings,
  soundEnabled = true,
}) => {
  const [viewMode, setViewMode] = useState<'receipt' | 'kot'>('receipt');
  const [printerWidth, setPrinterWidth] = useState<'58mm' | '80mm'>(
    settings.thermalPrinterSize || '58mm'
  );
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  if (!isOpen || !bill) return null;

  const handlePrint = () => {
    sound.playTap(soundEnabled);
    window.print();
  };

  const handleWhatsAppShareText = () => {
    sound.playTap(soundEnabled);
    const text = encodeURIComponent(generateWhatsAppMessage(bill, settings));
    let url = `https://wa.me/?text=${text}`;
    if (customerPhone.trim()) {
      const cleanPhone = customerPhone.replace(/\D/g, '');
      const finalNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      url = `https://wa.me/${finalNumber}?text=${text}`;
    }
    window.open(url, '_blank');
  };

  const handleShareImageToWhatsApp = async () => {
    sound.playTap(soundEnabled);
    setIsGeneratingImage(true);
    setShareFeedback(null);
    try {
      const res = await shareBillAsImageToWhatsApp(bill, settings, customerPhone);
      if (res.mode === 'download_and_whatsapp') {
        setShareFeedback('Bill picture downloaded! Attach it into WhatsApp.');
        setTimeout(() => setShareFeedback(null), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadImage = async () => {
    sound.playTap(soundEnabled);
    setIsGeneratingImage(true);
    try {
      await downloadReceiptImage(bill, settings);
      setShareFeedback('Bill picture saved to downloads!');
      setTimeout(() => setShareFeedback(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleCopyReceipt = () => {
    sound.playTap(soundEnabled);
    const text = generateWhatsAppMessage(bill, settings);
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const isKot = viewMode === 'kot';

  return (
    <>
      {/* Interactive Modal UI for the Counter */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150 no-print select-none">
        <div className="w-full max-w-md bg-black border border-white shadow-2xl flex flex-col max-h-[95vh] overflow-hidden text-white">
          {/* Header */}
          <div className="px-5 py-3 border-b border-white flex items-center justify-between bg-black">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 border border-white bg-black text-white flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Bill Completed</h3>
                <span className="text-xs text-white/80 font-bold">
                  {bill.id} • Token #{bill.tokenNumber}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 bg-black hover:bg-white hover:text-black border border-white flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher: Receipt vs KOT */}
          <div className="p-3 bg-black border-b border-white/40 flex items-center justify-between gap-2">
            <div className="flex p-0.5 bg-black border border-white text-xs">
              <button
                type="button"
                onClick={() => setViewMode('receipt')}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-bold transition-colors ${
                  !isKot
                    ? 'bg-white text-black'
                    : 'text-white hover:bg-white/10'
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
                    ? 'bg-white text-black'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Kitchen (KOT)</span>
              </button>
            </div>

            {/* Thermal Size selector */}
            {!isKot && (
              <div className="flex items-center gap-1 text-[11px] text-white">
                <button
                  type="button"
                  onClick={() => setPrinterWidth('58mm')}
                  className={`px-2 py-1 border border-white font-bold ${
                    printerWidth === '58mm'
                      ? 'bg-white text-black'
                      : 'bg-black text-white'
                  }`}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => setPrinterWidth('80mm')}
                  className={`px-2 py-1 border border-white font-bold ${
                    printerWidth === '80mm'
                      ? 'bg-white text-black'
                      : 'bg-black text-white'
                  }`}
                >
                  80mm
                </button>
              </div>
            )}
          </div>

          {/* Paper Bill Preview (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 bg-black border-b border-white/40 flex items-center justify-center">
            <div
              className={`bg-white text-black p-4 shadow-lg border border-white leading-tight ${
                printerWidth === '58mm' ? 'w-[270px] text-[11px]' : 'w-[340px] text-xs'
              }`}
            >
              {/* Receipt Content */}
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
                /* KOT Content */
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

          {/* Action Row */}
          <div className="p-3 sm:p-4 bg-black border-t border-white space-y-2.5 pb-safe">
            {/* Feedback notification if image downloaded or shared */}
            {shareFeedback && (
              <div className="p-2 border border-white text-white text-xs font-bold text-center">
                {shareFeedback}
              </div>
            )}

            {/* Customer Phone Input for WhatsApp */}
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Customer Phone (10 digits for WhatsApp)"
                className="flex-1 bg-black border border-white px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleWhatsAppShareText}
                title="Send as WhatsApp text message"
                className="px-3 py-2 bg-black hover:bg-white hover:text-black text-white text-xs font-bold flex items-center gap-1 transition-colors border border-white"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Text</span>
              </button>
            </div>

            {/* Primary Action 1: Share Bill as PICTURE in WhatsApp */}
            <button
              type="button"
              disabled={isGeneratingImage}
              onClick={handleShareImageToWhatsApp}
              className="w-full h-12 bg-white hover:bg-white/90 active:scale-[0.99] text-black font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white transition-colors min-h-[48px]"
            >
              <ImageIcon className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isGeneratingImage
                  ? 'Generating Picture...'
                  : 'Share Bill as Picture (WhatsApp)'}
              </span>
            </button>

            {/* Print and Actions Grid */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="col-span-2 h-11 bg-white hover:bg-white/90 active:scale-95 text-black font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white transition-colors min-h-[44px]"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                <span>Print {isKot ? 'KOT' : 'Receipt'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadImage}
                title="Download Bill Image PNG"
                className="h-11 bg-black hover:bg-white hover:text-black active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white min-h-[44px]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Picture</span>
              </button>
            </div>

            {/* New Order Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-black hover:bg-white hover:text-black text-white text-xs font-bold border border-white transition-colors"
            >
              Start Next Order
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Thermal Printer DOM Element (Always available for browser print engine) */}
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
                  Cash: {formatCurrency(bill.paymentSplit.cash)} | UPI: {formatCurrency(bill.paymentSplit.upi)} | Card: {formatCurrency(bill.paymentSplit.card)}
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
      </div>
    </>
  );
};
