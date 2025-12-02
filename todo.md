## 📎 Personalized Attachments

- [x] **Personalized File Attachments** - Dynamic attachments per recipient
  - ~~Upload a base PDF template or generate from content~~
  - CSV column with Google Drive/OneDrive/Dropbox links to files (PDF, DOCX, PPT, etc.)
  - Filename personalized with recipient name (e.g., `John_Doe_Certificate.pdf`)
  - Support for Google Drive, OneDrive, Dropbox, and direct URLs
  - ~~Variable substitution in PDF content (name, email, custom fields)~~
  - Batch processing for bulk emails with unique attachments per recipient
  - Integration with existing attachment system

### How to use:
1. Create a CSV with columns: `email`, `name`, and a file link column (e.g., `certificate_url`, `file_link`, `attachment`)
2. Upload the CSV in the Recipients tab
3. The system will auto-detect the attachment column, or you can select it manually
4. Each recipient will receive their personalized file from the link in their row
5. Supports: Google Drive, OneDrive, SharePoint, Dropbox, and direct URLs
6. Supported formats: PDF, DOCX, PPT, Images, ZIP, etc.