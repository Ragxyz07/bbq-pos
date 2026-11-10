import { Bill, AppSettings } from '../types';
import { formatCurrency, formatDateTime, generateWhatsAppMessage, DayClosingSummary, generateDayClosingWhatsAppMessage } from './format';

/**
 * High-DPI Canvas Renderer for generating crisp receipt picture in strict Two-Color (Red & Black)
 * and Times New Roman typography. Suitable for direct sharing into WhatsApp on mobile & desktop.
 */
export async function generateReceiptImageBlob(
  bill: Bill,
  settings: AppSettings
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const scale = 2; // 2x for Retina / High DPI mobile displays
      const width = 420;
      
      const isRedTheme = settings.twoColorTheme !== 'bw';
      const fgColor = isRedTheme ? '#ff2626' : '#ffffff';
      const bgColor = '#000000';

      // Calculate dynamic height based on item count
      const itemRowHeight = 36;
      const baseHeight = 440;
      const calculatedHeight = baseHeight + bill.items.length * itemRowHeight + (bill.items.some(i => i.notes) ? 40 : 0);
      const height = Math.max(520, calculatedHeight);

      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context not supported');
      }

      ctx.scale(scale, scale);

      // Strict Two Colour: Pure Black Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Outer border in Vivid Red
      ctx.strokeStyle = fgColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, width - 4, height - 4);

      let y = 36;

      // Stall Name in Times New Roman
      ctx.fillStyle = fgColor;
      ctx.font = 'bold 22px "Times New Roman", Times, Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(settings.businessName.toUpperCase(), width / 2, y);

      // Halal & Tagline
      y += 20;
      ctx.font = 'bold 12px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(
        `${settings.isHalal ? '100% HALAL · ' : ''}${settings.tagline || 'Premium Flavours in Every Bite'}`,
        width / 2,
        y
      );

      // Address & Phone
      if (settings.address || settings.phone) {
        y += 18;
        ctx.font = '11px "Times New Roman", Times, Georgia, serif';
        const contactInfo = [settings.address, settings.phone ? `Ph: ${settings.phone}` : '']
          .filter(Boolean)
          .join(' · ');
        ctx.fillText(contactInfo, width / 2, y);
      }

      // Dashed Divider
      y += 14;
      ctx.strokeStyle = fgColor;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bill Number, Token, and Order Type Info Box
      y += 24;
      ctx.fillStyle = bgColor;
      ctx.fillRect(20, y - 14, width - 40, 48);
      ctx.strokeStyle = fgColor;
      ctx.strokeRect(20, y - 14, width - 40, 48);

      ctx.textAlign = 'left';
      ctx.fillStyle = fgColor;
      ctx.font = 'bold 14px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(`BILL: ${bill.id}`, 32, y + 6);

      ctx.font = '12px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(formatDateTime(bill.timestamp), 32, y + 24);

      ctx.textAlign = 'right';
      ctx.font = 'bold 16px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(`TOKEN #${bill.tokenNumber}`, width - 32, y + 6);

      ctx.font = 'bold 12px "Times New Roman", Times, Georgia, serif';
      const orderLabel = bill.orderType === 'dine-in' ? 'DINE-IN' : 'PARCEL';
      ctx.fillText(`[${orderLabel}]`, width - 32, y + 24);

      // Table / Token Reference note if provided
      if (bill.tableOrToken) {
        y += 40;
        ctx.textAlign = 'center';
        ctx.font = 'italic 11px "Times New Roman", Times, Georgia, serif';
        ctx.fillText(`Order Ref / Table: ${bill.tableOrToken}`, width / 2, y);
      } else {
        y += 28;
      }

      // Items Table Header
      y += 16;
      ctx.strokeStyle = fgColor;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();

      y += 16;
      ctx.font = 'bold 12px "Times New Roman", Times, Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText('ITEM / DESCRIPTION', 24, y);
      ctx.textAlign = 'center';
      ctx.fillText('QTY', width - 110, y);
      ctx.textAlign = 'right';
      ctx.fillText('AMOUNT', width - 24, y);

      y += 8;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();

      // Item Rows
      bill.items.forEach((it) => {
        y += 22;
        ctx.textAlign = 'left';
        ctx.fillStyle = fgColor;
        ctx.font = 'bold 13px "Times New Roman", Times, Georgia, serif';

        let nameLine = it.name;
        if (it.variantName) nameLine += ` (${it.variantName})`;
        ctx.fillText(nameLine, 24, y);

        // Quantity
        ctx.textAlign = 'center';
        ctx.font = 'bold 13px "Times New Roman", Times, Georgia, serif';
        ctx.fillText(`${it.quantity}`, width - 110, y);

        // Price Total
        ctx.textAlign = 'right';
        ctx.font = 'bold 13px "Times New Roman", Times, Georgia, serif';
        ctx.fillText(formatCurrency(it.unitPrice * it.quantity), width - 24, y);

        // Flavour / Notes sub-line
        if ((it.flavourName && it.flavourName !== 'Plain / Original') || it.notes) {
          y += 14;
          ctx.textAlign = 'left';
          ctx.font = 'italic 11px "Times New Roman", Times, Georgia, serif';
          const subText = [
            it.flavourName && it.flavourName !== 'Plain / Original' ? `[Flavour: ${it.flavourName}]` : '',
            it.notes ? `Note: ${it.notes}` : '',
          ].filter(Boolean).join(' · ');
          ctx.fillText(subText, 32, y);
        }
      });

      // Divider
      y += 16;
      ctx.strokeStyle = fgColor;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Financial Summary Breakdown
      y += 18;
      ctx.textAlign = 'left';
      ctx.fillStyle = fgColor;
      ctx.font = '12px "Times New Roman", Times, Georgia, serif';
      ctx.fillText('Subtotal:', 24, y);
      ctx.textAlign = 'right';
      ctx.fillText(formatCurrency(bill.subtotal), width - 24, y);

      if (bill.discountAmount > 0) {
        y += 16;
        ctx.textAlign = 'left';
        ctx.fillText(`Discount (${bill.discountType === 'percent' ? `${bill.discountValue}%` : 'Flat'}):`, 24, y);
        ctx.textAlign = 'right';
        ctx.fillText(`-${formatCurrency(bill.discountAmount)}`, width - 24, y);
      }

      if (bill.gstEnabled && bill.gstAmount > 0) {
        y += 16;
        ctx.textAlign = 'left';
        ctx.fillText(`GST (${bill.gstRate}%):`, 24, y);
        ctx.textAlign = 'right';
        ctx.fillText(formatCurrency(bill.gstAmount), width - 24, y);
      }

      // Grand Total Box (Inverted: Red Background with Black Text)
      y += 24;
      ctx.fillStyle = fgColor;
      ctx.fillRect(20, y - 16, width - 40, 44);
      ctx.strokeStyle = fgColor;
      ctx.strokeRect(20, y - 16, width - 40, 44);

      ctx.fillStyle = bgColor;
      ctx.textAlign = 'left';
      ctx.font = 'bold 15px "Times New Roman", Times, Georgia, serif';
      ctx.fillText('TOTAL AMOUNT PAID', 32, y + 10);

      ctx.textAlign = 'right';
      ctx.font = 'bold 22px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(formatCurrency(bill.totalAmount), width - 32, y + 10);

      // Payment Method Tag
      y += 42;
      ctx.fillStyle = fgColor;
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(`PAYMENT METHOD: ${bill.paymentMethod.toUpperCase()}`, 24, y);

      if (bill.paymentMethod === 'cash' && bill.paymentSplit?.cashReceived) {
        ctx.textAlign = 'right';
        ctx.font = '11px "Times New Roman", Times, Georgia, serif';
        ctx.fillText(
          `Received: ${formatCurrency(bill.paymentSplit.cashReceived)} · Change: ${formatCurrency(bill.paymentSplit.cashChange || 0)}`,
          width - 24,
          y
        );
      }

      // Footer
      y += 30;
      ctx.textAlign = 'center';
      ctx.font = '12px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(settings.receiptFooter || 'Thank you for visiting The BBQ Boxx!', width / 2, y);

      y += 16;
      ctx.font = 'italic 10px "Times New Roman", Times, Georgia, serif';
      ctx.fillText('Authentic Charcoal Grill · Halal Certified', width / 2, y);

      // Export to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate receipt image blob'));
        }
      }, 'image/png');
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Shares the bill as a real image file to WhatsApp (using Web Share API or download fallback)
 */
export async function shareBillAsImageToWhatsApp(
  bill: Bill,
  settings: AppSettings,
  customerPhone?: string
): Promise<{ success: boolean; mode: 'native_share' | 'download_and_whatsapp' }> {
  try {
    const blob = await generateReceiptImageBlob(bill, settings);
    const fileName = `BBQ_Boxx_Bill_${bill.id}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title: `The BBQ Boxx - Bill ${bill.id}`,
        text: generateWhatsAppMessage(bill, settings),
        files: [file],
      });
      return { success: true, mode: 'native_share' };
    }
  } catch (err) {
    console.log('Native share failed or dismissed, falling back:', err);
  }

  // Fallback: Download image automatically and open WhatsApp
  try {
    const blob = await generateReceiptImageBlob(bill, settings);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `The_BBQ_Boxx_Bill_${bill.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Open WhatsApp
    const text = encodeURIComponent(
      `🧾 *THE BBQ BOXX* - Bill ${bill.id}\n${generateWhatsAppMessage(bill, settings)}`
    );
    let waUrl = `https://wa.me/?text=${text}`;
    if (customerPhone && customerPhone.trim()) {
      const clean = customerPhone.replace(/\D/g, '');
      const finalNumber = clean.length === 10 ? `91${clean}` : clean;
      waUrl = `https://wa.me/${finalNumber}?text=${text}`;
    }
    window.open(waUrl, '_blank');

    return { success: true, mode: 'download_and_whatsapp' };
  } catch (fallbackErr) {
    console.error('Fallback image sharing failed:', fallbackErr);
    return { success: false, mode: 'download_and_whatsapp' };
  }
}

/**
 * Direct download of the receipt picture (PNG)
 */
export async function downloadReceiptImage(bill: Bill, settings: AppSettings): Promise<void> {
  const blob = await generateReceiptImageBlob(bill, settings);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `The_BBQ_Boxx_Bill_${bill.id}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates a high-DPI End of Day Sales Summary image card (PNG blob)
 * in strict Two-Color (Red & Black) and Times New Roman typography,
 * explicitly highlighting Total Sales, Hand Cash, and GPay / UPI.
 */
export async function generateDayClosingImageBlob(
  summary: DayClosingSummary,
  settings: AppSettings
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const scale = 2;
      const width = 460;
      const height = 640;

      const isRedTheme = settings.twoColorTheme !== 'bw';
      const fgColor = isRedTheme ? '#ff2626' : '#ffffff';
      const bgColor = '#000000';

      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context not available');
      }

      ctx.scale(scale, scale);

      // Pure Black Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Outer border in Vivid Red
      ctx.strokeStyle = fgColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, width - 4, height - 4);

      let y = 38;

      // Stall Name in Times New Roman
      ctx.fillStyle = fgColor;
      ctx.font = 'bold 24px "Times New Roman", Times, Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(settings.businessName.toUpperCase(), width / 2, y);

      // Subtitle
      y += 20;
      ctx.font = 'bold 12px "Times New Roman", Times, Georgia, serif';
      ctx.fillText('DAILY SALES & RECONCILIATION REPORT', width / 2, y);

      // Date & Time
      y += 18;
      ctx.font = '11px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(`Date: ${summary.dateStr} · Closed at ${formatDateTime(Date.now())}`, width / 2, y);

      // Divider
      y += 14;
      ctx.strokeStyle = fgColor;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();

      // Big Total Sales Card (Inverted Red Background with Black Text)
      y += 22;
      ctx.fillStyle = fgColor;
      ctx.fillRect(20, y, width - 40, 72);
      ctx.strokeStyle = fgColor;
      ctx.strokeRect(20, y, width - 40, 72);

      ctx.textAlign = 'center';
      ctx.fillStyle = bgColor;
      ctx.font = 'bold 12px "Times New Roman", Times, Georgia, serif';
      ctx.fillText('TOTAL DAY SALES', width / 2, y + 22);

      ctx.font = 'bold 28px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(formatCurrency(summary.totalSales), width / 2, y + 50);

      ctx.font = '10px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(`(${summary.totalBills} Completed Orders)`, width / 2, y + 64);

      // SECTION 1: PAYMENT METHOD BREAKDOWN (HAND CASH & GPAY/UPI)
      y += 94;
      ctx.textAlign = 'left';
      ctx.fillStyle = fgColor;
      ctx.font = 'bold 13px "Times New Roman", Times, Georgia, serif';
      ctx.fillText('PAYMENT METHOD BREAKDOWN', 24, y);

      // 2 Big Side-by-Side Cards: Hand Cash vs GPay/UPI
      y += 10;
      const cardW = (width - 48) / 2;

      // Hand Cash Card
      ctx.fillStyle = bgColor;
      ctx.fillRect(20, y, cardW, 64);
      ctx.strokeStyle = fgColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(20, y, cardW, 64);

      ctx.fillStyle = fgColor;
      ctx.font = 'bold 12px "Times New Roman", Times, Georgia, serif';
      ctx.fillText('HAND CASH', 30, y + 22);

      ctx.font = 'bold 20px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(formatCurrency(summary.cashSales), 30, y + 48);

      // GPay / UPI Card
      const rightX = 20 + cardW + 8;
      ctx.fillStyle = bgColor;
      ctx.fillRect(rightX, y, cardW, 64);
      ctx.strokeRect(rightX, y, cardW, 64);

      ctx.fillStyle = fgColor;
      ctx.font = 'bold 12px "Times New Roman", Times, Georgia, serif';
      ctx.fillText('GPAY / UPI', rightX + 10, y + 22);

      ctx.font = 'bold 20px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(formatCurrency(summary.upiSales), rightX + 10, y + 48);

      // Card / Other Row if any
      if (summary.cardSales > 0) {
        y += 74;
        ctx.fillStyle = bgColor;
        ctx.fillRect(20, y, width - 40, 30);
        ctx.strokeRect(20, y, width - 40, 30);

        ctx.fillStyle = fgColor;
        ctx.font = 'bold 12px "Times New Roman", Times, Georgia, serif';
        ctx.fillText('CARD PAYMENTS:', 32, y + 20);

        ctx.textAlign = 'right';
        ctx.font = 'bold 14px "Times New Roman", Times, Georgia, serif';
        ctx.fillText(formatCurrency(summary.cardSales), width - 32, y + 20);
        y += 36;
      } else {
        y += 78;
      }

      // SECTION 2: ORDER TYPE BREAKDOWN (Dine-in / Parcel)
      ctx.textAlign = 'left';
      ctx.fillStyle = fgColor;
      ctx.font = 'bold 13px "Times New Roman", Times, Georgia, serif';
      ctx.fillText('ORDER TYPE BREAKDOWN (DINE-IN & PARCEL)', 24, y);

      y += 10;
      ctx.fillStyle = bgColor;
      ctx.fillRect(20, y, width - 40, 48);
      ctx.strokeStyle = fgColor;
      ctx.strokeRect(20, y, width - 40, 48);

      // Dine-in Column
      ctx.fillStyle = fgColor;
      ctx.font = 'bold 12px "Times New Roman", Times, Georgia, serif';
      ctx.fillText('DINE-IN', 32, y + 20);
      ctx.font = 'bold 14px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(`${summary.dineInCount} bills (${formatCurrency(summary.dineInSales)})`, 32, y + 38);

      // Parcel Column
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px "Times New Roman", Times, Georgia, serif';
      ctx.fillText('PARCEL', width - 32, y + 20);
      ctx.font = 'bold 14px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(`${summary.parcelCount} bills (${formatCurrency(summary.parcelSales)})`, width - 32, y + 38);

      // SECTION 3: CASH DRAWER RECONCILIATION
      y += 66;
      ctx.textAlign = 'left';
      ctx.fillStyle = fgColor;
      ctx.font = 'bold 13px "Times New Roman", Times, Georgia, serif';
      ctx.fillText('PHYSICAL CASH DRAWER CLOSING', 24, y);

      y += 10;
      const expectedTotal = summary.openingFloat + summary.cashSales;
      ctx.fillStyle = bgColor;
      ctx.fillRect(20, y, width - 40, 56);
      ctx.strokeStyle = fgColor;
      ctx.strokeRect(20, y, width - 40, 56);

      ctx.fillStyle = fgColor;
      ctx.font = '11px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(`Opening Float: ${formatCurrency(summary.openingFloat)} + Hand Cash: ${formatCurrency(summary.cashSales)}`, 32, y + 18);

      ctx.font = 'bold 13px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(`Expected Cash in Drawer:`, 32, y + 38);

      ctx.textAlign = 'right';
      ctx.font = 'bold 15px "Times New Roman", Times, Georgia, serif';
      ctx.fillText(formatCurrency(expectedTotal), width - 32, y + 38);

      const counted = summary.countedCash !== undefined ? summary.countedCash : summary.actualDrawerCash;
      if (counted !== undefined) {
        ctx.textAlign = 'left';
        ctx.font = '11px "Times New Roman", Times, Georgia, serif';
        const diff = summary.variance !== undefined ? summary.variance : (summary.drawerDifference || 0);
        const diffText = diff === 0 ? '[EXACT MATCH]' : diff > 0 ? `+${formatCurrency(diff)} SURPLUS` : `-${formatCurrency(Math.abs(diff))} SHORTAGE`;
        ctx.fillText(`Counted: ${formatCurrency(counted)} | Status: ${diffText}`, 32, y + 50);
      }

      // Footer
      y += 74;
      ctx.textAlign = 'center';
      ctx.font = '12px "Times New Roman", Times, Georgia, serif';
      ctx.fillText('The BBQ Boxx · Authentic Charcoal Grill · Halal Certified', width / 2, y);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate daily closing image blob'));
      }, 'image/png');
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Shares the Day Closing summary as a picture (PNG) directly to WhatsApp
 */
export async function shareDayClosingAsImageToWhatsApp(
  summary: DayClosingSummary,
  settings: AppSettings,
  targetPhone?: string
): Promise<{ success: boolean; mode: 'native_share' | 'download_and_whatsapp' }> {
  try {
    const blob = await generateDayClosingImageBlob(summary, settings);
    const fileName = `BBQ_Boxx_Closing_${summary.dateStr}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title: `The BBQ Boxx - Closing Report ${summary.dateStr}`,
        text: generateDayClosingWhatsAppMessage(summary, settings),
        files: [file],
      });
      return { success: true, mode: 'native_share' };
    }
  } catch (err) {
    console.log('Native share failed or dismissed, using fallback:', err);
  }

  // Fallback: Download image and open WhatsApp
  try {
    const blob = await generateDayClosingImageBlob(summary, settings);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `The_BBQ_Boxx_Closing_${summary.dateStr}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const text = encodeURIComponent(generateDayClosingWhatsAppMessage(summary, settings));
    let waUrl = `https://wa.me/?text=${text}`;
    if (targetPhone && targetPhone.trim()) {
      const clean = targetPhone.replace(/\D/g, '');
      const finalNumber = clean.length === 10 ? `91${clean}` : clean;
      waUrl = `https://wa.me/${finalNumber}?text=${text}`;
    }
    window.open(waUrl, '_blank');

    return { success: true, mode: 'download_and_whatsapp' };
  } catch (fallbackErr) {
    console.error('Fallback closing image sharing failed:', fallbackErr);
    return { success: false, mode: 'download_and_whatsapp' };
  }
}

/**
 * Downloads the Day Closing summary picture (PNG)
 */
export async function downloadDayClosingImage(
  summary: DayClosingSummary,
  settings: AppSettings
): Promise<void> {
  const blob = await generateDayClosingImageBlob(summary, settings);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `The_BBQ_Boxx_Closing_${summary.dateStr}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
