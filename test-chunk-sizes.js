// Test script to check payload sizes
// Run this in browser console to test chunk sizes

const testEmails = Array.from({ length: 50 }, (_, i) => ({
  to: `test${i}@example.com`,
  subject: `Test Subject ${i} - Lorem ipsum dolor sit amet consectetur adipiscing elit`,
  message: `<html><body><h1>Test Message ${i}</h1><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p></body></html>`,
  originalRowData: {
    email: `test${i}@example.com`,
    name: `Test User ${i}`,
    company: `Test Company ${i}`,
    field1: 'value1',
    field2: 'value2',
    field3: 'value3'
  }
}))

function testChunkSizes() {
  const chunkSizes = [1, 2, 3, 5, 10]
  
  chunkSizes.forEach(chunkSize => {
    const chunk = testEmails.slice(0, chunkSize)
    const payload = {
      personalizedEmails: chunk,
      chunkIndex: 0,
      totalChunks: 1,
      chunkInfo: {
        totalEmails: chunkSize,
        startIndex: 0,
        endIndex: chunkSize - 1
      }
    }
    
    const payloadString = JSON.stringify(payload)
    const sizeKB = (payloadString.length / 1024).toFixed(2)
    const sizeMB = (payloadString.length / (1024 * 1024)).toFixed(3)
    
    console.log(`Chunk size ${chunkSize}: ${sizeKB} KB (${sizeMB} MB)`)
    
    if (payloadString.length > 100000) {
      console.warn(`⚠️  Chunk size ${chunkSize} might be too large for some hosting platforms`)
    }
  })
}

console.log('Testing EchoMail chunk sizes...')
testChunkSizes()

export { testChunkSizes }
