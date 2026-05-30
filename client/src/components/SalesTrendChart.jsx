import React from 'react';

const formatRp = (val) => 'Rp ' + parseInt(val || 0).toLocaleString('id-ID');

const SalesTrendChart = ({ data = [], title = 'Tren Penjualan 7 Hari' }) => {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-800">{title}</h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">7 Hari Terakhir</span>
      </div>

      {data.length === 0 || data.every((d) => d.revenue === 0) ? (
        <div className="flex-1 min-h-[200px] flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100 border-dashed">
          <div className="text-center">
            <span className="text-4xl grayscale opacity-30 mb-2 block">📊</span>
            <p className="text-sm font-bold text-slate-400">Belum ada data penjualan</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-[220px] flex flex-col">
          <div className="flex items-end justify-between gap-2 flex-1 px-1 pb-2">
            {data.map((day) => {
              const heightPct = Math.max(4, (day.revenue / maxRevenue) * 100);
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="relative w-full flex items-end justify-center h-40">
                    <div
                      className="w-full max-w-[48px] rounded-t-xl bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-300 group-hover:from-blue-700 group-hover:to-blue-500 relative"
                      style={{ height: `${heightPct}%` }}
                      title={`${day.label}: ${formatRp(day.revenue)}`}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap pointer-events-none z-10">
                        {formatRp(day.revenue)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 text-center leading-tight">{day.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-500">
            <span>Total 7 hari: <strong className="text-slate-800">{formatRp(data.reduce((s, d) => s + d.revenue, 0))}</strong></span>
            <span>{data.reduce((s, d) => s + d.transactions, 0)} transaksi</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTrendChart;
