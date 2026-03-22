import { STATUS_LABELS } from '../../constants';
 
const S = {
  placed          : 'bg-blue-50 text-blue-600 border-blue-100',
  preparing       : 'bg-yellow-50 text-yellow-600 border-yellow-100',
  out_for_delivery: 'bg-[#F5A623]/10 text-[#c47d00] border-[#F5A623]/20',
  delivered       : 'bg-[#1B5E4B]/10 text-[#1B5E4B] border-[#1B5E4B]/20',
  cancelled       : 'bg-red-50 text-red-500 border-red-100',
};
const D = { placed:'bg-blue-400', preparing:'bg-yellow-400', out_for_delivery:'bg-[#F5A623]', delivered:'bg-[#1B5E4B]', cancelled:'bg-red-400' };
 
export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
                      font-semibold border ${S[status]||'bg-gray-50 text-gray-500 border-gray-100'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${D[status]||'bg-gray-300'}`} />
      {STATUS_LABELS[status]||status}
    </span>
  );
}
export default StatusBadge;