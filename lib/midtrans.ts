import MidtransClient from 'midtrans-client'

if (!process.env.MIDTRANS_SERVER_KEY) {
  throw new Error('Missing MIDTRANS_SERVER_KEY environment variable')
}
if (!process.env.MIDTRANS_CLIENT_KEY) {
  throw new Error('Missing MIDTRANS_CLIENT_KEY environment variable')
}

export const snap = new MidtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
})
