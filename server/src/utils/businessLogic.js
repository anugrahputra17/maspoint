/**
 * Pure business-logic helpers — no DB/Express dependency.
 * Extracted so they can be unit-tested without mocking infrastructure.
 */

/**
 * Generate invoice number placeholder (format sebenarnya di-generate server dengan locking).
 * @deprecated Gunakan generateSequentialInvoice di server
 */
const generateInvoiceNumber = (date = new Date()) => {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `INV/${dateStr}/0000`;
};

/**
 * Calculate cart totals
 * @param {Array<{quantity: number, selling_price: number}>} items
 * @param {number} discountAmount - Nominal diskon (rupiah)
 * @param {boolean} applyTax - Terapkan PPN 11%
 * @returns {{ subtotal, afterDiscount, tax, totalFinal }}
 */
const calculateTotals = (items, discountAmount = 0, applyTax = true) => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.selling_price, 0);
  const discount = Math.min(Math.max(0, discountAmount), subtotal);
  const afterDiscount = subtotal - discount;
  const tax = applyTax ? Math.round(afterDiscount * 0.11) : 0;
  const totalFinal = afterDiscount + tax;
  return { subtotal, discount, afterDiscount, tax, totalFinal };
};

/**
 * Calculate change (kembalian)
 * @param {number} amountPaid
 * @param {number} totalFinal
 * @returns {number}
 */
const calculateChange = (amountPaid, totalFinal) => Math.max(0, amountPaid - totalFinal);

/**
 * Validate transaction payload
 * @param {{ shift_id, items, total_final, payment_method, amount_paid }} body
 * @returns {{ valid: boolean, message?: string }}
 */
const validateTransactionPayload = ({ items, total_final, payment_method, amount_paid }) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { valid: false, message: 'Items tidak boleh kosong.' };
  }
  for (const item of items) {
    if (!item.product_id || item.quantity <= 0 || item.selling_price < 0) {
      return { valid: false, message: `Data item tidak valid: product_id=${item.product_id}` };
    }
  }
  if (!['cash', 'qris', 'transfer'].includes(payment_method)) {
    return { valid: false, message: `Metode pembayaran tidak valid: ${payment_method}` };
  }
  if (payment_method === 'cash' && amount_paid < total_final) {
    return { valid: false, message: 'Uang yang dibayar kurang dari total.' };
  }
  return { valid: true };
};

/**
 * Calculate discount value based on type
 * @param {'nominal'|'persen'} type
 * @param {number} value
 * @param {number} subtotal
 * @returns {number}
 */
const resolveDiscount = (type, value, subtotal) => {
  if (type === 'persen') {
    return Math.round(subtotal * Math.min(Math.max(0, value), 100) / 100);
  }
  return Math.min(Math.max(0, value), subtotal);
};

module.exports = {
  generateInvoiceNumber,
  calculateTotals,
  calculateChange,
  validateTransactionPayload,
  resolveDiscount,
};
