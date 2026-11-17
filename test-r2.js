// usage: node --env-file=.env test-r2.js
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env
const show = (n, v) => console.log(n.padEnd(22), v ? `${v.length} chars` + (/\s|["']/.test(v) ? '  <-- HAS SPACE OR QUOTE!' : '') : 'MISSING')

console.log('--- .env check ---')
show('R2_ACCOUNT_ID', R2_ACCOUNT_ID)          // should be 32
show('R2_ACCESS_KEY_ID', R2_ACCESS_KEY_ID)    // should be 32
show('R2_SECRET_ACCESS_KEY', R2_SECRET_ACCESS_KEY) // should be 64
show('R2_BUCKET', R2_BUCKET)
show('R2_PUBLIC_URL', R2_PUBLIC_URL)
console.log('(expected lengths: account 32, access key 32, secret 64)\n')

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED'
})

try {
  await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: 'test/hello.txt', Body: 'hello', ContentType: 'text/plain' }))
  console.log('SUCCESS: credentials can write to the bucket.')
  await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: 'test/hello.txt' }))
  console.log('Test file cleaned up. Your keys are fine, so the problem is CORS.')
} catch (e) {
  console.log('FAILED:', e.name, '-', e.message)
  console.log('HTTP status:', e.$metadata?.httpStatusCode)
}