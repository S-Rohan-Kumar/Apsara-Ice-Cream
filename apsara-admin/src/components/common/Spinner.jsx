export function Spinner() {
  return (
    <div className='flex flex-col items-center justify-center py-16 sm:py-24 gap-4'>
      <div className='relative w-10 h-10 sm:w-12 sm:h-12'>
        <div className='absolute inset-0 rounded-full border-[3px] border-emerald-500/10' />
        <div className='absolute inset-0 rounded-full border-[3px] border-transparent border-t-emerald-500 animate-spin' />
      </div>
      <p className='text-[10px] text-emerald-900/30 font-black uppercase tracking-[3px]'>Preparing Data</p>
    </div>
  );
}
export default Spinner;