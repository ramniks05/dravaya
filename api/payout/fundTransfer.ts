import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'

// Helpers
function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function encryptAes256CbcBase64(plaintext: string, key: string, iv: string): string {
  const keyBuf = Buffer.from(key, 'utf8')
  if (keyBuf.length !== 32) {
    throw new Error('PAYMENT_ENCRYPTION_KEY must be 32 bytes (utf8) for AES-256-CBC')
  }
  const ivBuf = Buffer.from(iv, 'utf8')
  if (ivBuf.length !== 16) {
    throw new Error('Generated IV must be 16 bytes (utf8) for AES-256-CBC')
  }
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuf, ivBuf)
  const encrypted = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()])
  return encrypted.toString('base64')
}

function generateIvAscii(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' })
  }

  try {
    const API_BASE_URL = process.env.VITE_PAYMENT_API_URL || process.env.PAYMENT_API_URL
    const API_KEY = process.env.VITE_PAYMENT_API_KEY || process.env.PAYMENT_API_KEY
    const SECRET_KEY = process.env.VITE_PAYMENT_SECRET_KEY || process.env.PAYMENT_SECRET_KEY
    const ENC_KEY = process.env.PAYMENT_ENCRYPTION_KEY

    if (!API_BASE_URL || !API_KEY || !SECRET_KEY || !ENC_KEY) {
      return res.status(500).json({ status: 'error', message: 'Missing payment env configuration' })
    }

    const { beneficiary, amount, mode, merchantReferenceId, narration } = req.body as {
      beneficiary: {
        name: string
        phoneNumber: string
        vpaAddress?: string
        accountNumber?: string
        ifsc?: string
        bankName?: string
      }
      amount: number
      mode: 'UPI' | 'IMPS' | 'NEFT'
      merchantReferenceId: string
      narration?: string
    }

    const apicode = 810
    const payload: any = {
      ben_name: beneficiary.name,
      ben_phone_number: beneficiary.phoneNumber,
      amount: amount.toString(),
      merchant_reference_id: merchantReferenceId,
      transfer_type: mode,
      apicode,
      narration: narration || 'PAYNINJA Fund Transfer',
      signature: null,
    }

    if (mode === 'UPI') {
      payload.ben_vpa_address = beneficiary.vpaAddress
    } else {
      payload.ben_account_number = beneficiary.accountNumber
      payload.ben_ifsc = beneficiary.ifsc
      payload.ben_bank_name = beneficiary.bankName
    }

    // Signature generation - matches API documentation exactly
    let signatureString: string
    if (mode === 'UPI') {
      // UPI format: {ben_name}-{ben_phone_number}-{ben_vpa_address}-{amount}-{merchant_reference_id}-{transfer_type}-{apicode}-{narration}{secret_key}
      signatureString = `${payload.ben_name}-${payload.ben_phone_number}-${payload.ben_vpa_address}-${payload.amount}-${payload.merchant_reference_id}-${payload.transfer_type}-${payload.apicode}-${payload.narration}${SECRET_KEY}`
    } else {
      // IMPS/NEFT format: {ben_name}-{ben_phone_number}-{ben_account_number}-{ben_ifsc}-{ben_bank_name}-{amount}-{merchant_reference_id}-{transfer_type}-{apicode}-{narration}{secret_key}
      // Note: API docs template shows {ben_account_number}{ben_ifsc} but example shows dashes, matching example format
      signatureString = `${payload.ben_name}-${payload.ben_phone_number}-${payload.ben_account_number}-${payload.ben_ifsc}-${payload.ben_bank_name}-${payload.amount}-${payload.merchant_reference_id}-${payload.transfer_type}-${payload.apicode}-${payload.narration}${SECRET_KEY}`
    }
    payload.signature = sha256Hex(signatureString)

    // Encrypt
    const iv = generateIvAscii()
    const encdata = encryptAes256CbcBase64(JSON.stringify(payload), ENC_KEY, iv)

    const resp = await fetch(`${API_BASE_URL}/api/v1/payout/fundTransfer`, {
      method: 'POST',
      headers: {
        'api-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ encdata, key: ENC_KEY, iv })
    })

    const json = await resp.json()
    return res.status(resp.status).json(json)
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err.message || 'Internal error' })
  }
}


