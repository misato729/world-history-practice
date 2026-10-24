import { EXAM_CONFIG, parseExamConfig, type ExamConfiguration } from '../../shared/examConfig.ts'

export let configuration = EXAM_CONFIG
export let paymentsEnabled = configuration.payments.enabled
export let freeExamMax = configuration.payments.free_exam_count
export const environment = () => process.env.APP_ENV || process.env.NODE_ENV || 'development'
export function setConfigurationForTesting(next: ExamConfiguration) {
  if (environment() !== 'test') throw new Error('Configuration injection is test-only')
  configuration = parseExamConfig(next)
  paymentsEnabled = configuration.payments.enabled
  freeExamMax = configuration.payments.free_exam_count
}
export function secretKey(): string {
  const secret = process.env.SECRET_KEY_BASE || ''
  if (secret.length < 64) throw new Error('SECRET_KEY_BASE must contain at least 64 characters')
  if (environment() === 'production' && /replace-with|change-this/.test(secret)) throw new Error('Configure an independent production secret')
  return secret
}
