import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  return date.toLocaleDateString()
}

export function formatExpiryTime(timeLeftMs: number): string {
  if (timeLeftMs <= 0) {
    return 'Expired'
  }

  const days = Math.floor(timeLeftMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeLeftMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) {
    return `${days}d ${hours}h left`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m left`
  }
  return `${minutes}m left`
}

export function getExpiryOptions() {
  return [
    { label: '1 hour', value: 3600000 },
    { label: '6 hours', value: 21600000 },
    { label: '12 hours', value: 43200000 },
    { label: '1 day', value: 86400000 },
    { label: '3 days', value: 259200000 },
    { label: '1 week', value: 604800000 },
    { label: '2 weeks', value: 1209600000 },
    { label: '1 month', value: 2592000000 },
  ]
}
