// Test script for EchoMail email endpoints
// This script can be run in the browser console or with Node.js

console.log('🧪 EchoMail Email Endpoint Tests')

async function testSingleEmailEndpoint() {
  console.log('📧 Testing single email endpoint...')
  
  const testPayload = {
    to: 'test@example.com',
    subject: 'Test Subject - Single Email Endpoint',
    message: '<html><body><h1>Test Message</h1><p>This is a test email from the single email endpoint.</p></body></html>',
    originalRowData: {
      email: 'test@example.com',
      name: 'Test User',
      company: 'Test Company'
    }
  }
  
  const payloadString = JSON.stringify(testPayload)
  const sizeKB = (payloadString.length / 1024).toFixed(2)
  const sizeMB = (payloadString.length / (1024 * 1024)).toFixed(3)
  
  console.log(`Test payload size: ${sizeKB} KB (${sizeMB} MB)`)
  
  try {
    const response = await fetch('/api/send-single-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payloadString,
    })
    
    console.log(`Response status: ${response.status}`)
    
    const result = await response.json()
    console.log('Response:', result)
    
    if (response.ok) {
      console.log('✅ Single email endpoint is working!')
    } else {
      console.log('❌ Single email endpoint failed:', result.error)
    }
    
    return { success: response.ok, data: result, sizeKB, sizeMB }
    
  } catch (error) {
    console.error('❌ Network error:', error)
    return { success: false, error: error.message }
  }
}

// Test payload size calculation
function testPayloadSizes() {
  console.log('📏 Testing payload sizes...')
  
  const baseSizes = [
    { name: 'Minimal', subject: 'Test', message: '<p>Hi</p>' },
    { name: 'Small', subject: 'Test Subject', message: '<p>Short test message</p>' },
    { name: 'Medium', subject: 'Test Subject - Medium Length', message: '<html><body><h1>Test</h1><p>This is a medium length test message with some HTML content.</p></body></html>' },
    { name: 'Large', subject: 'Test Subject - Large Content', message: '<html><body><h1>Large Test</h1><p>This is a large test message with lots of content. '.repeat(100) + '</p></body></html>' }
  ]
  
  baseSizes.forEach(test => {
    const payload = {
      to: 'test@example.com',
      subject: test.subject,
      message: test.message,
      originalRowData: {
        email: 'test@example.com',
        name: 'Test User',
        company: 'Test Company'
      }
    }
    
    const size = JSON.stringify(payload).length
    const sizeKB = (size / 1024).toFixed(2)
    const sizeMB = (size / (1024 * 1024)).toFixed(3)
    
    console.log(`${test.name}: ${sizeKB} KB (${sizeMB} MB)`)
  })
}

// Make functions available in browser console
if (typeof window !== 'undefined') {
  window.testSingleEmailEndpoint = testSingleEmailEndpoint
  window.testPayloadSizes = testPayloadSizes
  
  console.log('🔧 Test functions loaded:')
  console.log('- Run testSingleEmailEndpoint() to test single email API')
  console.log('- Run testPayloadSizes() to test payload sizes')
}

export { testSingleEmailEndpoint, testPayloadSizes }
