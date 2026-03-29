import { STATUS_LABELS } from '../../constants';

const S = {
  placed          : 'bg-blue-50 text-blue-600 border-blue-100',
  preparing       : 'bg-amber-50 text-amber-600 border-amber-100',
  out_for_delivery: 'bg-orange-50 text-orange-600 border-orange-100',
  delivered       : 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cancelled       : 'bg-red-50 text-red-500 border-red-100',
};
const D = {
  placed:'bg-blue-400', preparing:'bg-amber-400',
  out_for_delivery:'bg-orange-400', delivered:'bg-emerald-500', cancelled:'bg-red-400'
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px]
                      font-black uppercase tracking-widest border whitespace-nowrap
                      ${S[status]||'bg-slate-50 text-slate-500 border-slate-100'}`}>
      <span className={`w-1 h-1 rounded-full shrink-0 ${D[status]||'bg-slate-300'}`} />
      {STATUS_LABELS[status]||status}
    </span>
  );
}
export default StatusBadge;