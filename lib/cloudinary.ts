import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL
})

// Upload file to Cloudinary
export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  fileName: string,
  userEmail: string
): Promise<{ url: string; public_id: string }> => {
  try {
    // Create a unique filename with user email and timestamp
    const uniqueFileName = `${userEmail.replace('@', '_at_')}/${Date.now()}_${fileName}`
    
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto', // Automatically detect file type
          public_id: `attachments/${uniqueFileName}`,
          folder: 'email_attachments'
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error)
            reject(error)
          } else if (result) {
            resolve({
              url: result.secure_url,
              public_id: result.public_id
            })
          } else {
            reject(new Error('Upload failed - no result returned'))
          }
        }
      ).end(fileBuffer)
    })
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error)
    throw error
  }
}

// Delete file from Cloudinary
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error)
    throw error
  }
}

// Get optimized URL for display
export const getOptimizedUrl = (publicId: string, options?: any): string => {
  return cloudinary.url(publicId, {
    quality: 'auto',
    fetch_format: 'auto',
    ...options
  })
}

export default cloudinary