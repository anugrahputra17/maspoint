import React from 'react';

const NumericKeypad = ({ onKeyPress, onDelete, onClear, compact = false }) => {
  const rows = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    ['C', 0, '⌫'],
  ];

  return (
    <div
      className={`grid grid-cols-3 mx-auto ${
        compact ? 'gap-1.5 max-w-[220px]' : 'gap-2 p-2 max-w-xs'
      }`}
    >
      {rows.flat().map((key, index) => {
        const isAction = key === 'C' || key === '⌫';

        return (
          <button
            key={index}
            type="button"
            className={`
              flex items-center justify-center w-full rounded-2xl transition-all select-none font-medium
              ${compact ? 'h-11 text-base' : 'aspect-square rounded-full'}
              ${isAction
                ? 'text-slate-500 bg-slate-100/80 hover:bg-slate-200 active:scale-95'
                : 'text-slate-800 bg-white/90 border border-slate-200/80 shadow-sm hover:bg-violet-50 hover:border-violet-200 active:scale-95'
              }
              ${key === '⌫' ? 'text-rose-600 bg-rose-50/90 border-rose-100 hover:bg-rose-100' : ''}
              ${!compact && !isAction ? 'text-3xl font-light tracking-widest hover:bg-primary-container' : ''}
            `}
            onClick={() => {
              if (key === 'C') onClear?.();
              else if (key === '⌫') onDelete?.();
              else onKeyPress?.(key.toString());
            }}
          >
            <span className={compact && !isAction ? 'text-lg font-semibold' : undefined}>
              {key}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default NumericKeypad;
