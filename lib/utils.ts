import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A'
  if (percentage >= 80) return 'B'
  if (percentage >= 70) return 'C'
  if (percentage >= 60) return 'D'
  return 'F'
}

export function getRoleColor(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'text-red-600 bg-red-100'
    case 'PARENT':
    case 'TEACHER':
      return 'text-blue-600 bg-blue-100'
    case 'STUDENT':
      return 'text-green-600 bg-green-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

export function getExamStatusColor(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'text-gray-600 bg-gray-100'
    case 'SCHEDULED':
      return 'text-yellow-600 bg-yellow-100'
    case 'ACTIVE':
      return 'text-green-600 bg-green-100'
    case 'COMPLETED':
      return 'text-blue-600 bg-blue-100'
    case 'ARCHIVED':
      return 'text-purple-600 bg-purple-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}