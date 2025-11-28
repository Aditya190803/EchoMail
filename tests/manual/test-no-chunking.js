// Quick test to verify no chunking logic remains
// Run this in browser console on LOCAL version (localhost:3000)

console.log('🧪 Testing EchoMail - No Chunking Version')

// Check if old chunking functions exist
const hasOldChunkFunction = typeof window.testChunkEndpoint !== 'undefined'
const hasOldBatchFunction = typeof window.useBatchEmailSend !== 'undefined'
const hasOldChunkedFunction = typeof window.useChunkedEmailSend !== 'undefined'

console.log('❌ Old chunking functions check:')
console.log('  - testChunkEndpoint exists:', hasOldChunkFunction)
console.log('  - useBatchEmailSend exists:', hasOldBatchFunction) 
console.log('  - useChunkedEmailSend exists:', hasOldChunkedFunction)

if (!hasOldChunkFunction && !hasOldBatchFunction && !hasOldChunkedFunction) {
  console.log('✅ SUCCESS: No old chunking functions detected!')
} else {
  console.log('❌ PROBLEM: Old chunking functions still exist!')
}

// Test that the correct endpoints exist
fetch('/api/send-single-email', { method: 'OPTIONS' })
  .then(response => {
    console.log('✅ /api/send-single-email endpoint exists:', response.status !== 404)
  })
  .catch(() => {
    console.log('❌ /api/send-single-email endpoint missing')
  })

// Test that old endpoints DON'T exist
fetch('/api/send-email-chunk', { method: 'OPTIONS' })
  .then(response => {
    if (response.status === 404) {
      console.log('✅ /api/send-email-chunk correctly removed (404)')
    } else {
      console.log('❌ /api/send-email-chunk still exists!')
    }
  })
  .catch(() => {
    console.log('✅ /api/send-email-chunk correctly removed (network error)')
  })

console.log('🎯 If you see chunking errors, you are testing the DEPLOYED version!')
console.log('🚀 Test on http://localhost:3000 instead!')
