/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Reusable premium Receipt Generation Utility for Campus Cakes.
 * Creates an elegant, printable HTML invoice Blob and triggers an automatic browser download.
 */

import { Order } from '../types';

export function downloadReceiptFile(order: Order, studentName?: string) {
  const orderId = order.id;
  const itemsHtml = order.items.map((it) => {
    const customDetails: string[] = [];
    if (it.customization) {
      if (it.customization.flavor) customDetails.push(`Flavor: ${it.customization.flavor}`);
      if (it.customization.weight) customDetails.push(`Weight: ${it.customization.weight} kg`);
      if (it.customization.messageOnCake) customDetails.push(`Cake Message: "${it.customization.messageOnCake}"`);
      if (it.customization.addCandles) customDetails.push(`🕯️ Extra Candles Included`);
      if (it.customization.addKnife) customDetails.push(`🔪 Safety Cake Knife Included`);
      if (it.customization.pickupTime) customDetails.push(`⏰ Scheduled Time: ${it.customization.pickupTime}`);
      if (it.customization.specialInstructions) customDetails.push(`📝 Notes: "${it.customization.specialInstructions}"`);
    } else if (it.isInstantKiosk) {
      customDetails.push(`⚡ Instant pickup from canteen stall`);
    }

    const customList = customDetails.length > 0 
      ? `<ul style="margin: 3px 0 0 15px; padding: 0; list-style: disc; font-size: 11px; color: #5c5c64; line-height: 1.3;">
          ${customDetails.map(d => `<li>${d}</li>`).join('')}
         </ul>`
      : '';

    return `
      <tr style="border-bottom: 1px dashed #e4e4e7;">
        <td style="padding: 12px 8px; text-align: left; vertical-align: top;">
          <div style="font-weight: 700; color: #18181b; font-size: 13px;">${it.name}</div>
          ${customList}
        </td>
        <td style="padding: 12px 8px; text-align: right; vertical-align: top; font-family: 'JetBrains Mono', monospace; font-size: 13px;">₹${it.price}</td>
        <td style="padding: 12px 8px; text-align: center; vertical-align: top; font-weight: 600; font-size: 13px;">${it.quantity}</td>
        <td style="padding: 12px 8px; text-align: right; vertical-align: top; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #18181b; font-size: 13px;">₹${it.price * it.quantity}</td>
      </tr>
    `;
  }).join('');

  const paymentModeLabel = order.paymentMethod || 'UPI/Card';
  const customerName = order.customerName || studentName || 'Campus Student';
  const customerPhone = order.customerPhone || 'Not Specified';
  const deliveryAddress = order.deliveryAddress || 'Campus Pick-up';

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt_Order_${orderId}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
    
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f4f4f5;
      color: #27272a;
      -webkit-font-smoothing: antialiased;
    }
    .receipt-container {
      max-width: 550px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 24px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
      border: 1px solid #e4e4e7;
      padding: 32px;
      position: relative;
    }
    
    /* Decent thermal strip cutout at bottom */
    .receipt-container::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 10px;
      background-image: linear-gradient(-135deg, #ffffff 5px, transparent 0), linear-gradient(135deg, #ffffff 5px, transparent 0);
      background-size: 10px 10px;
    }

    .brand-header {
      text-align: center;
      margin-bottom: 24px;
      border-bottom: 2px dashed #f4f4f5;
      padding-bottom: 24px;
    }
    .brand-logo {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: #db2777; /* Premium Pink Cherry tone */
      letter-spacing: -0.05em;
      margin: 0 0 4px 0;
    }
    .brand-subtitle {
      font-size: 11px;
      font-weight: 700;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin: 0;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
      font-size: 11.5px;
      line-height: 1.5;
    }
    .meta-box {
      background-color: #fafafa;
      border: 1px solid #f4f4f5;
      border-radius: 12px;
      padding: 12px 14px;
    }
    .meta-label {
      color: #71717a;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .meta-value {
      font-weight: 700;
      color: #09090b;
    }
    .meta-value-mono {
      font-family: 'JetBrains Mono', monospace;
    }

    .table-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #a1a1aa;
      margin-bottom: 8px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .items-table th {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #71717a;
      font-weight: 700;
      background-color: #fafafa;
      padding: 8px;
      border-bottom: 1px solid #e4e4e7;
    }
    
    .calculation-section {
      background-color: #fafafa;
      border-radius: 14px;
      padding: 16px;
      border: 1px dashed #e4e4e7;
      margin-bottom: 24px;
    }
    .calc-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      padding: 5px 0;
      color: #52525b;
    }
    .calc-row-bold {
      font-weight: 700;
      color: #09090b;
    }
    .calc-row-total {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e4e4e7;
      padding-top: 10px;
      margin-top: 8px;
      font-size: 16px;
      font-weight: 700;
      color: #db2777;
    }
    
    .rewards-banner {
      background-color: #fdf2f8;
      border: 1px solid #fbcfe8;
      border-radius: 12px;
      padding: 12px 14px;
      text-align: center;
      font-size: 11px;
      color: #db2777;
      font-weight: 700;
      margin-bottom: 24px;
    }

    .actions-bar {
      margin-bottom: 24px;
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .btn {
      font-family: inherit;
      font-size: 11.5px;
      font-weight: 700;
      padding: 10px 18px;
      border-radius: 10px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.2s ease-in-out;
      border: none;
    }
    .btn-primary {
      background-color: #db2777;
      color: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(219, 39, 119, 0.2);
    }
    .btn-primary:hover {
      background-color: #be185d;
    }
    .btn-secondary {
      background-color: #e4e4e7;
      color: #27272a;
    }
    .btn-secondary:hover {
      background-color: #d4d4d8;
    }

    .footer-text {
      font-size: 10.5px;
      color: #71717a;
      text-align: center;
      line-height: 1.5;
      padding-top: 20px;
      border-top: 1px solid #f4f4f5;
    }

    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .receipt-container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <!-- Controls (Hidden on print) -->
  <div class="actions-bar no-print">
    <button class="btn btn-primary" onclick="window.print()">
      🖨️ Print & Save as PDF
    </button>
    <button class="btn btn-secondary" onclick="window.close()">
      ❌ Close Invoice Window
    </button>
  </div>

  <div class="receipt-container">
    <div class="brand-header">
      <div class="brand-logo">🎂 CAMPUS CAKES</div>
      <div class="brand-subtitle">Official Student Order Invoice</div>
    </div>

    <!-- Meta Details Grid -->
    <div class="meta-grid">
      <div class="meta-box">
        <div class="meta-label">Invoice Details</div>
        <div class="meta-value" style="color: #db2777;">Order #${orderId}</div>
        <div class="meta-value-mono" style="font-size: 10px; margin-top: 3px; color: #71717a;">Type: ${order.orderType === 'instant-pickup' ? '⚡ Instant Kiosk' : '📅 Pre-Order'}</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Billed Date</div>
        <div class="meta-value" style="font-size: 11px;">${order.date}</div>
        <div class="meta-value-mono" style="font-size: 9px; margin-top: 3px; color: #71717a;">${order.timestamp ? new Date(order.timestamp).toLocaleTimeString() : ''}</div>
      </div>
      <div class="meta-box" style="grid-column: span 2;">
        <div class="meta-label">Customer Recipient Info</div>
        <div class="meta-value" style="font-size: 12px; margin-bottom: 2px;">${customerName}</div>
        <div style="font-size: 11px; color: #52525b;">📧 ${order.userEmail || 'N/A'}</div>
        <div style="font-size: 11px; color: #db2777; font-weight: 600; margin-top: 4px;">📍 Delivery: ${deliveryAddress}</div>
      </div>
    </div>

    <div class="table-title">Ordered Items Breakdown</div>
    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="text-align: left; width: 55%;">Item & Specifications</th>
          <th style="text-align: right; width: 15%;">Unit</th>
          <th style="text-align: center; width: 12%;">Qty</th>
          <th style="text-align: right; width: 18%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- Pricing Summary Wrapper -->
    <div class="calculation-section">
      <div class="calc-row">
        <span>Cart Items Subtotal:</span>
        <span style="font-family: 'JetBrains Mono', monospace;">₹${order.subtotal}</span>
      </div>
      <div class="calc-row">
        <span>Packaging Box Charger:</span>
        <span style="font-family: 'JetBrains Mono', monospace;">₹20</span>
      </div>
      <div class="calc-row">
        <span>GST & Campus Food Taxes:</span>
        <span style="font-family: 'JetBrains Mono', monospace;">₹30</span>
      </div>
      
      <div class="calc-row-total">
        <span>Total Paid Amount:</span>
        <span style="font-family: 'JetBrains Mono', monospace;">₹${Math.round(order.total)}</span>
      </div>
    </div>

    <!-- Reward Points info block -->
    <div class="rewards-banner">
      ⭐ Earned +${order.pointsEarned} VIP XP Loyalty Points on this purchase!
      <div style="font-size: 9px; font-weight: 500; opacity: 0.85; margin-top: 2px; text-transform: uppercase;">
        Payment Method used: ${paymentModeLabel}
      </div>
    </div>

    <div class="footer-text">
       Thank you for celebrating with Campus Cakes! 🍰 
       <br>Bring this receipt or quote the Order ID # to your Campus Stall representative to pick up your high-end fresh dessert. Order 24 hours in advance next time to unlock any premium customization!
    </div>
  </div>

</body>
</html>
  `;

  // Standard elegant file container write & download trigger
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const tempLink = document.createElement('a');
  tempLink.href = url;
  tempLink.download = `CampusCakes_Receipt_Order_${orderId}.html`;
  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);
  URL.revokeObjectURL(url);
}
