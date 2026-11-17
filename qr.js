// usage: npm run qr -- https://your-site.up.railway.app
import QRCode from 'qrcode'
const url = process.argv[2]
if (!url) { console.error('Usage: npm run qr -- https://your-site.example.com'); process.exit(1) }
await QRCode.toFile('qr.png', url, {
  width: 1200, margin: 2, errorCorrectionLevel: 'H',
  color: { dark: '#1f4a8a', light: '#ffffff' }
})
console.log('Saved qr.png for ' + url)
