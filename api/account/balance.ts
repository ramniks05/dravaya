import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' })
  }
  try {
    const API_BASE_URL = process.env.VITE_PAYMENT_API_URL || process.env.PAYMENT_API_URL
    const API_KEY = process.env.VITE_PAYMENT_API_KEY || process.env.PAYMENT_API_KEY
    if (!API_BASE_URL || !API_KEY) {
      return res.status(500).json({ status: 'error', message: 'Missing payment env configuration' })
    }

    const resp = await fetch(`${API_BASE_URL}/api/v1/account/balance`, {
      headers: {
        'api-Key': API_KEY,
        'Content-Type': 'application/json',
      }
    })
    const json = await resp.json()
    return res.status(resp.status).json(json)
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err.message || 'Internal error' })
  }
}


