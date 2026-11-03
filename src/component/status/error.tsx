import error from '@/assets/gif/error.gif'
import Image from 'next/image'

interface ErrorProps {
  message?: string
  className?: string
}

const Error: React.FC<ErrorProps> = ({ message, className = '' }) => {
  return (
    <div
      className={`flex flex-col items-center justify-center w-full h-full min-h-[250px] flex-1 space-y-4 bg-transparent p-6 ${className}`.trim()}
    >
      <Image unoptimized src={error} alt='Error...' width={220} height={220} className='object-contain' priority />
      <span className='text-lg font-semibold text-white'>Có lỗi rồi người anh em!!!</span>
      {message && <span className='text-base font-medium text-red-400 text-center max-w-md'>{message}</span>}
    </div>
  )
}

export default Error
