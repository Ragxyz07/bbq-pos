import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { PaymentMethod, PaymentSplit, Bill, CartItem, OrderType, AppSettings } from '../../types';
import {
  X,
  Banknote,
  QrCode,
  CreditCard,
  Split,
  CheckCircle,
  Copy,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { formatCurrency, generateUpiString } from '../../utils/format';
import { sound } from '../../utils/sound';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  orderType: OrderType;
  tableOrToken: string;
  subtotal: number;
  discountType: 'flat' | 'percent';
  discountValue: number;
  discountAmount: number;
  gstEnabled: boolean;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  settings: AppSettings;
  onCompleteSale: (bill: Bill) => void;
  nextBillInfo: { billId: string; billNumber: number; tokenNumber: number };
  initialMethod?: PaymentMethod;
  soundEnabled?: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  cart,
  orderType,
  tableOrToken,
  subtotal,
  discountType,
  discountValue,
  discountAmount,
  gstEnabled,
  gstRate,
  gstAmount,
  totalAmount,
  settings,
  onCompleteSale,
  nextBillInfo,
  initialMethod,
  soundEnabled = true,
}) => {
  const [method, setMethod] = useState<PaymentMethod>(initialMethod || settings.defaultPaymentMethod || 'cash');
  const [cashReceived, setCashReceived] = useState<number>(totalAmount);
  const [split, setSplit] = useState<PaymentSplit>({
    cash: 0,
    upi: 0,
    card: 0,
    cashReceived: 0,
    cashChange: 0,
  });

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setMethod(initialMethod || settings.defaultPaymentMethod || 'cash');
      setCashReceived(totalAmount);
      setSplit({
        cash: 0,
        upi: 0,
        card: 0,
        cashReceived: 0,
        cashChange: 0,
      });
      setCopiedUpi(false);
    }
  }, [isOpen, totalAmount]);

  // Generate UPI QR code whenever on UPI tab or Split has UPI
  useEffect(() => {
    if (!isOpen) return;
    const upiAmount = method === 'upi' ? totalAmount : split.upi;
    if (upiAmount > 0 && qrCanvasRef.current) {
      const upiUri = generateUpiString(
        settings.upiId,
        settings.businessName,
        upiAmount,
        nextBillInfo.billId
      );

      QRCode.toCanvas(qrCanvasRef.current, upiUri, {
        width: 220,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).catch((err) => {
        console.error('Error generating UPI QR code:', err);
      });
    }
  }, [isOpen, method, split.upi, totalAmount, settings.upiId, settings.businessName, nextBillInfo.billId]);

  if (!isOpen) return null;

  // Change Calculation for Cash
  const cashChange = Math.max(0, cashReceived - totalAmount);
  const isCashSufficient = cashReceived >= totalAmount;

  // Split calculations
  const splitTotal = split.cash + split.upi + split.card;
  const splitRemaining = totalAmount - splitTotal;
  const isSplitValid = splitTotal === totalAmount;

  const handleFinish = () => {
    sound.playCashSuccess(soundEnabled);

    let finalSplit: PaymentSplit;
    if (method === 'cash') {
      finalSplit = {
        cash: totalAmount,
        upi: 0,
        card: 0,
        cashReceived,
        cashChange,
      };
    } else if (method === 'upi') {
      finalSplit = {
        cash: 0,
        upi: totalAmount,
        card: 0,
      };
    } else if (method === 'card') {
      finalSplit = {
        cash: 0,
        upi: 0,
        card: totalAmount,
      };
    } else {
      finalSplit = {
        ...split,
        cashChange: split.cashReceived ? Math.max(0, split.cashReceived - split.cash) : 0,
      };
    }

    const newBill: Bill = {
      id: nextBillInfo.billId,
      billNumber: nextBillInfo.billNumber,
      tokenNumber: nextBillInfo.tokenNumber,
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      items: cart,
      itemCount: cart.reduce((acc, it) => acc + it.quantity, 0),
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      gstEnabled,
      gstRate,
      gstAmount,
      totalAmount,
      orderType,
      tableOrToken,
      paymentMethod: method,
      paymentSplit: finalSplit,
      status: 'completed',
    };

    onCompleteSale(newBill);
  };

  const copyUpiLink = () => {
    const upiUri = generateUpiString(
      settings.upiId,
      settings.businessName,
      totalAmount,
      nextBillInfo.billId
    );
    navigator.clipboard.writeText(upiUri);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-lg bg-black border-t sm:border border-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-white">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white flex items-center justify-between shrink-0 bg-black">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white border border-white px-2 py-0.5">
                Token #{nextBillInfo.tokenNumber}
              </span>
              <span className="text-xs text-white/70">
                Bill {nextBillInfo.billId}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xs font-bold text-white/80">Total Payable:</span>
              <span className="text-xl sm:text-2xl font-bold text-white tabular-nums">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-black hover:bg-white hover:text-black border border-white flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Payment Method Selector */}
        <div className="p-3 bg-black border-b border-white/40 shrink-0">
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'cash' as PaymentMethod, label: 'Cash', icon: Banknote },
              { id: 'upi' as PaymentMethod, label: 'UPI QR', icon: QrCode },
              { id: 'card' as PaymentMethod, label: 'Card', icon: CreditCard },
              { id: 'split' as PaymentMethod, label: 'Split', icon: Split },
            ].map((pm) => {
              const Icon = pm.icon;
              const isActive = method === pm.id;
              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => {
                    sound.playTap(soundEnabled);
                    setMethod(pm.id);
                  }}
                  className={`py-2.5 px-1 flex flex-col items-center justify-center gap-1 border transition-colors min-h-[56px] ${
                    isActive
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-black text-white border-white/40 hover:border-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-bold whitespace-nowrap">{pm.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Mode Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* CASH MODE */}
          {method === 'cash' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-white uppercase tracking-wider block mb-1.5">
                  Cash Received from Customer
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-white/70">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={cashReceived === 0 ? '' : cashReceived}
                    onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                    className="w-full bg-black border-2 border-white pl-9 pr-4 py-3 text-xl font-bold text-white focus:outline-none"
                    placeholder="Enter amount"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Denomination Chips */}
              <div>
                <div className="text-[11px] font-bold text-white/80 uppercase tracking-wide mb-1.5">
                  Quick Denominations
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setCashReceived(totalAmount)}
                    className="px-3 py-2 bg-white text-black border border-white font-bold text-xs"
                  >
                    Exact ({formatCurrency(totalAmount)})
                  </button>
                  {[100, 200, 500, 1000, 2000]
                    .filter((den) => den >= totalAmount || den === 500 || den === 200)
                    .map((den) => (
                      <button
                        key={den}
                        type="button"
                        onClick={() => setCashReceived(den)}
                        className={`px-3 py-2 text-xs font-bold border transition-colors ${
                          cashReceived === den
                            ? 'bg-white text-black border-white'
                            : 'bg-black text-white border-white/40 hover:border-white'
                        }`}
                      >
                        ₹{den}
                      </button>
                    ))}
                </div>
              </div>

              {/* Change Due Box */}
              <div className="p-4 border border-white bg-black">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold tracking-wider text-white">
                    {isCashSufficient ? 'Change Due to Customer' : 'Shortage / Due'}
                  </span>
                  <span className="text-2xl font-bold tabular-nums text-white">
                    {isCashSufficient
                      ? formatCurrency(cashChange)
                      : `-${formatCurrency(totalAmount - cashReceived)}`}
                  </span>
                </div>
                {isCashSufficient && cashChange > 0 && (
                  <p className="text-[11px] text-white/80 mt-1 italic">
                    Please return {formatCurrency(cashChange)} to customer before handing over the token.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* UPI MODE */}
          {method === 'upi' && (
            <div className="flex flex-col items-center justify-center text-center space-y-3 py-2">
              <div className="p-3 bg-white border border-white shadow-xl inline-block">
                <canvas ref={qrCanvasRef} />
              </div>

              <div>
                <span className="text-xs text-white/80 block">Scan with any UPI App (GPay, PhonePe, Paytm)</span>
                <span className="text-sm font-bold text-white underline">
                  {settings.upiId}
                </span>
                <span className="text-xs text-white/80 block mt-0.5">
                  Amount: <strong className="text-white font-bold">{formatCurrency(totalAmount)}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyUpiLink}
                  className="px-3 py-1.5 bg-black hover:bg-white hover:text-black border border-white text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedUpi ? 'Copied Link!' : 'Copy Payment Link'}</span>
                </button>
              </div>
            </div>
          )}

          {/* CARD MODE */}
          {method === 'card' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto border border-white bg-black flex items-center justify-center text-white">
                <CreditCard className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">POS Card Machine</h4>
                <p className="text-xs text-white/80 mt-1 max-w-xs mx-auto">
                  Swipe or tap debit/credit card for{' '}
                  <strong className="text-white font-bold">{formatCurrency(totalAmount)}</strong> on your card terminal.
                </p>
              </div>
            </div>
          )}

          {/* SPLIT MODE */}
          {method === 'split' && (
            <div className="space-y-3">
              <div className="p-3 bg-black border border-white space-y-3">
                {/* Cash portion */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Banknote className="w-4 h-4" />
                    Cash:
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-white">₹</span>
                    <input
                      type="number"
                      value={split.cash || ''}
                      onChange={(e) =>
                        setSplit({ ...split, cash: Math.max(0, Number(e.target.value) || 0) })
                      }
                      placeholder="0"
                      className="w-28 bg-black border border-white px-2.5 py-1 text-right font-bold text-white text-xs"
                    />
                  </div>
                </div>

                {/* UPI portion */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <QrCode className="w-4 h-4" />
                    UPI:
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-white">₹</span>
                    <input
                      type="number"
                      value={split.upi || ''}
                      onChange={(e) =>
                        setSplit({ ...split, upi: Math.max(0, Number(e.target.value) || 0) })
                      }
                      placeholder="0"
                      className="w-28 bg-black border border-white px-2.5 py-1 text-right font-bold text-white text-xs"
                    />
                  </div>
                </div>

                {/* Card portion */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    Card:
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-white">₹</span>
                    <input
                      type="number"
                      value={split.card || ''}
                      onChange={(e) =>
                        setSplit({ ...split, card: Math.max(0, Number(e.target.value) || 0) })
                      }
                      placeholder="0"
                      className="w-28 bg-black border border-white px-2.5 py-1 text-right font-bold text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Split Balance Checker */}
              <div className="p-3 border border-white bg-black flex items-center justify-between text-xs text-white">
                <span>
                  {isSplitValid
                    ? 'Split matches total exactly!'
                    : splitRemaining > 0
                    ? `Remaining to allocate: ${formatCurrency(splitRemaining)}`
                    : `Over-allocated by: ${formatCurrency(Math.abs(splitRemaining))}`}
                </span>
                <span className="font-bold">{formatCurrency(splitTotal)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Settlement Action */}
        <div className="p-4 bg-black border-t border-white pb-safe">
          <button
            type="button"
            disabled={
              (method === 'cash' && !isCashSufficient) ||
              (method === 'split' && !isSplitValid)
            }
            onClick={handleFinish}
            className="w-full h-14 bg-white hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold text-base flex items-center justify-center gap-2 border border-white transition-all min-h-[52px]"
          >
            <CheckCircle className="w-5 h-5 stroke-[2.5]" />
            <span>Complete Sale &amp; Print Bill</span>
          </button>
        </div>
      </div>
    </div>
  );
};
