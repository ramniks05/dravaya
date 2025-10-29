import CryptoJS from 'crypto-js'

/**
 * Encrypts data using AES-256-CBC
 * Compatible with PayNinja API encryption requirements
 */
export function encryptData(
  data: object,
  key: string,
  iv: string
): string {
  const jsonString = JSON.stringify(data)
  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(jsonString),
    CryptoJS.enc.Utf8.parse(key),
    {
      iv: CryptoJS.enc.Utf8.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  )
  return encrypted.toString()
}

/**
 * Decrypts data using AES-256-CBC
 */
export function decryptData(
  encryptedData: string,
  key: string,
  iv: string
): any {
  const decrypted = CryptoJS.AES.decrypt(
    encryptedData,
    CryptoJS.enc.Utf8.parse(key),
    {
      iv: CryptoJS.enc.Utf8.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  )
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8)
  return JSON.parse(decryptedText)
}

/**
 * Generates a random IV (Initialization Vector)
 */
export function generateIV(): string {
  // Generate a 16-character ASCII IV (16 bytes when UTF-8 parsed)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 16; i++) {
    const idx = Math.floor(Math.random() * chars.length)
    result += chars[idx]
  }
  return result
}

/**
 * Generates SHA256 signature for payment data
 */
export function generateSignature(data: {
  ben_name: string
  ben_phone_number: string
  ben_account_number?: string
  ben_ifsc?: string
  ben_bank_name?: string
  ben_vpa_address?: string
  amount: string
  merchant_reference_id: string
  transfer_type: string
  apicode: number
  narration: string
}, secretKey: string): string {
  const { transfer_type } = data
  
  let signatureString = ''
  
  if (transfer_type === 'UPI') {
    signatureString = `${data.ben_name}-${data.ben_phone_number}-${data.ben_vpa_address}-${data.amount}-${data.merchant_reference_id}-${data.transfer_type}-${data.apicode}-${data.narration}${secretKey}`
  } else {
    signatureString = `${data.ben_name}-${data.ben_phone_number}-${data.ben_account_number}-${data.ben_ifsc}-${data.ben_bank_name}-${data.amount}-${data.merchant_reference_id}-${data.transfer_type}-${data.apicode}-${data.narration}${secretKey}`
  }
  
  return CryptoJS.SHA256(signatureString).toString()
}
