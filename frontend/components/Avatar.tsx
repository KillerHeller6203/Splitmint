import { avatarColor } from '@/lib/utils'

interface AvatarProps {
  name?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' }

export default function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const safeName = name?.trim() || '?'
  const color = avatarColor(safeName)
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${className}`}
      style={{ backgroundColor: color }}
      title={safeName}
    >
      {safeName.charAt(0).toUpperCase()}
    </div>
  )
}
