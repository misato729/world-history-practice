import { z } from 'zod'

export const newPasswordSchema = z.string().min(8, '新しいパスワードは8文字以上で入力してください')
  .refine(value => Buffer.byteLength(value) <= 72, '新しいパスワードは72バイト以内で入力してください')
