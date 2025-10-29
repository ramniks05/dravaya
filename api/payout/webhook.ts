import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'

function decryptAes256CbcBase64ToJson(base64Data: string, key: string, iv: string): any {
  const keyBuf = Buffer.from(key, 'utf8')
  if (keyBuf.length !== 32) throw new Error('PAYMENT_ENCRYPTION_KEY must be 32 bytes')
  const ivBuf = Buffer.from(iv, 'utf8')
  if (ivBuf.length !== 16) throw new Error('IV must be 16 bytes')
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, ivBuf)
  const decrypted = Buffer.concat([decipher.update(Buffer.from(base64Data, 'base64')), decipher.final()])
  return JSON.parse(decrypted.toString('utf8'))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' })
  }
  try {
    const ENC_KEY = process.env.PAYMENT_ENCRYPTION_KEY
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE
    if (!ENC_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return res.status(500).json({ status: 'error', message: 'Missing webhook env configuration' })
    }

    const { data, iv } = req.body as { data: string; iv: string }
    const decrypted = decryptAes256CbcBase64ToJson(data, ENC_KEY, iv)

    // Expected sample:
    // { data: { merchant_reference_id, utr, amount, status }, iv }
    const { merchant_reference_id, utr, amount, status } = decrypted.data || {}
    
    // Update transaction status in DB
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
    const { error } = await supabase
      .from('transactions')
      .update({ status, utr })
      .eq('merchant_reference_id', merchant_reference_id)

    if (error) throw error

    return res.status(200).json({ ok: true })
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err.message || 'Internal error' })
  }
}


