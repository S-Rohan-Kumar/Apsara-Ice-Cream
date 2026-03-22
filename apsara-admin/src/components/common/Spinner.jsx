export function Spinner() {
  return (
    <div className='flex flex-col items-center justify-center py-20 gap-3'>
      <div className='relative w-10 h-10'>
        <div className='absolute inset-0 rounded-full border-4 border-[#1B5E4B]/10' />
        <div className='absolute inset-0 rounded-full border-4 border-transparent border-t-[#1B5E4B] animate-spin' />
      </div>
      <p className='text-xs text-gray-400 font-semibold'>Loading...</p>
    </div>
  );
}
export default Spinner;