// Simple test to check Cloudinary attachment download
const testAttachmentDownload = async () => {
  try {
    const testUrl = 'https://res.cloudinary.com/your-cloud/image/upload/v123456/test.jpg'
    console.log(`Testing download from: ${testUrl}`)
    
    const response = await fetch(testUrl)
    console.log('Response status:', response.status)
    console.log('Response ok:', response.ok)
    console.log('Response statusText:', response.statusText)
    
    if (!response.ok) {
      console.log('Response is not ok - this would trigger an error')
      throw new Error(`Failed to download: ${response.statusText}`)
    } else {
      console.log('Response is ok - download should succeed')
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    console.log('Successfully converted to base64, length:', base64.length)
    
  } catch (error) {
    console.error('Error in test:', error)
  }
}

// Test with an actual Cloudinary URL
testAttachmentDownload()
