import React from 'react';

const formatRp = (val) => parseInt(val || 0).toLocaleString('id-ID');

const ReceiptTemplate = ({ receipt, shopName = 'LitePOS Store', shopAddress = 'Jl. Teknologi No. 1, Jakarta', shopPhone = '0812-3456-7890' }) => {
  if (!receipt) return null;

  return (
    <div id="print-receipt" className="hidden print:block w-full max-w-[80mm] mx-auto text-black font-mono text-sm leading-tight bg-white">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="font-bold text-lg uppercase tracking-wider">{shopName}</h1>
        <p className="text-xs">{shopAddress}</p>
        <p className="text-xs">{shopPhone}</p>
      </div>

      {/* Info Transaksi */}
      <div className="mb-2 text-xs">
        <div className="flex justify-between">
          <span>{new Date().toLocaleDateString('id-ID')} {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          <span>Kasir: {receipt.cashier_name || 'Kasir'}</span>
        </div>
        <div className="text-left mt-1">
          <span>INV: {receipt.invoice}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Items */}
      <div className="mb-2">
        {receipt.items.map((item, idx) => (
          <div key={idx} className="mb-1.5 text-xs">
            <div className="font-semibold">{item.name || 'Produk'}</div>
            <div className="flex justify-between">
              <span>{item.quantity} x {formatRp(item.selling_price)}</span>
              <span>{formatRp(item.quantity * item.selling_price)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Totals */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatRp(receipt.subtotal)}</span>
        </div>
        {receipt.discount > 0 && (
          <div className="flex justify-between">
            <span>Diskon</span>
            <span>-{formatRp(receipt.discount)}</span>
          </div>
        )}
        {receipt.tax > 0 && (
          <div className="flex justify-between">
            <span>PPN 11%</span>
            <span>{formatRp(receipt.tax)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Final */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between font-bold text-sm">
          <span>Total</span>
          <span>{formatRp(receipt.total_final)}</span>
        </div>
        <div className="flex justify-between">
          <span>
            {receipt.payment_method === 'qris'
              ? 'QRIS'
              : receipt.payment_method === 'transfer'
                ? 'Transfer'
                : 'Tunai'}
          </span>
          <span>{formatRp(receipt.amount_paid)}</span>
        </div>
        {receipt.change > 0 && (
          <div className="flex justify-between">
            <span>Kembali</span>
            <span>{formatRp(receipt.change)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Footer */}
      <div className="text-center mt-4 text-xs font-semibold">
        <p>Terima Kasih Telah Berbelanja!</p>
        <p className="mt-1 font-normal italic text-[10px]">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
      </div>
    </div>
  );
};

export default ReceiptTemplate;
