export function passwordResetToken(fragment: string): string {
  if (!fragment.startsWith('#') || fragment.length > 512) return ''
  const values = new URLSearchParams(fragment.slice(1)).getAll('token')
  return values.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(values[0]!) ? values[0]! : ''
}
