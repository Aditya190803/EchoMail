function createTestEmail(index = 1) {
  return {
    to: `test${index}@example.com`,
    subject: `Short Subject ${index}`,
    message: `<p>Short message ${index}</p>`,
    originalRowData: {
      email: `test${index}@example.com`,
      name: `User ${index}`
    }
  }
}

function testSingleEmailPayload() {
  const email = createTestEmail(1)
  const payload = {
    to: email.to,
    subject: email.subject,
    message: email.message,
    originalRowData: email.originalRowData
  }
  
  const payloadString = JSON.stringify(payload)
  const sizeBytes = payloadString.length
  const sizeKB = (sizeBytes / 1024).toFixed(2)
  
  console.log('Single email payload test:')
  console.log(`Size: ${sizeBytes} bytes (${sizeKB} KB)`)
  console.log('Payload:', payloadString.substring(0, 200) + '...')
  
  return {
    sizeBytes,
    sizeKB: parseFloat(sizeKB),
    payload: payloadString
  }
}

// Test with different message lengths
function testMessageLengths() {
  const lengths = [100, 500, 1000, 2000, 5000, 10000]
  
  lengths.forEach(length => {
    const longMessage = '<p>' + 'A'.repeat(length) + '</p>'
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      message: longMessage,
      originalRowData: { email: 'test@example.com' }
    }
    
    const payload = {
      to: email.to,
      subject: email.subject,
      message: email.message,
      originalRowData: email.originalRowData
    }
    
    const payloadString = JSON.stringify(payload)
    const sizeKB = (payloadString.length / 1024).toFixed(2)
    
    console.log(`Message length ${length}: Payload ${sizeKB} KB`)
  })
}

if (typeof window !== 'undefined') {
  // Browser environment
  console.log('EchoMail Payload Size Debugger')
  console.log('Run testSingleEmailPayload() to test a single email')
  console.log('Run testMessageLengths() to test different message sizes')
  
  window.testSingleEmailPayload = testSingleEmailPayload
  window.testMessageLengths = testMessageLengths
} else {
  // Node.js environment
  console.log('Testing payload sizes...')
  testSingleEmailPayload()
  console.log('\nTesting different message lengths...')
  testMessageLengths()
}

export { testSingleEmailPayload, testMessageLengths }
