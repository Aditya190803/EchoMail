"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, X } from "lucide-react"
import Papa from "papaparse"
import type { CSVRow } from "@/types/email"

interface CSVUploadProps {
  onDataLoad: (data: CSVRow[]) => void
  csvData: CSVRow[]
}

export function CSVUpload({ onDataLoad, csvData }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = (file: File) => {
    setError(null)
    
    Papa.parse(file, {
      complete: (results) => {
        try {
          console.log("CSV parse results:", results)
          
          if (results.errors && results.errors.length > 0) {
            console.error("CSV parsing errors:", results.errors)
            setError(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`)
            return
          }
          
          const data = results.data as any[]
          console.log("Raw CSV data:", data)
          
          if (!data || data.length === 0) {
            setError("No data found in CSV file")
            return
          }
          
          // Find the email column with case-insensitive matching
          const firstRow = data[0]
          if (!firstRow || typeof firstRow !== 'object') {
            setError("Invalid CSV format")
            return
          }
          
          // Look for email column with different case variations
          const emailColumns = ['email', 'Email', 'EMAIL', 'e-mail', 'E-mail', 'E-Mail', 'email_address', 'Email_Address', 'emailaddress']
          let emailKey: string | null = null
          
          console.log("Available columns:", Object.keys(firstRow))
          
          for (const key of Object.keys(firstRow)) {
            const normalizedKey = key.toLowerCase().trim()
            if (emailColumns.some(col => col.toLowerCase() === normalizedKey) || 
                normalizedKey.includes('email') || 
                normalizedKey.includes('mail')) {
              emailKey = key
              break
            }
          }
          
          if (!emailKey) {
            const availableColumns = Object.keys(firstRow).join(', ')
            setError(`No email column found. Available columns: ${availableColumns}. Please make sure your CSV has a column named 'email', 'Email', 'EMAIL', or similar.`)
            return
          }
          
          console.log("Found email column:", emailKey)
          
          // Normalize the data to use 'email' as the key and validate
          const validRows = data
            .map((row) => {
              if (!row || typeof row !== 'object') return null
              
              // Create normalized row with 'email' key
              const normalizedRow: any = { ...row }
              if (emailKey !== 'email' && row[emailKey]) {
                normalizedRow.email = row[emailKey]
              }
              
              return normalizedRow
            })
            .filter((row) => {
              if (!row) return false
              const email = row.email
              return email && typeof email === 'string' && email.trim().length > 0 && email.includes('@')
            }) as CSVRow[]
          
          console.log("Valid CSV rows:", validRows)
          
          if (validRows.length === 0) {
            setError(`No valid email addresses found. Found column "${emailKey}" but no valid email addresses. Make sure emails contain @ symbol.`)
            return
          }
          
          onDataLoad(validRows)
          console.log(`Successfully loaded ${validRows.length} contacts from CSV`)
        } catch (err) {
          console.error("Error processing CSV:", err)
          setError("Error processing CSV file")
        }
      },
      header: true,
      skipEmptyLines: true,
      error: (error) => {
        console.error("Papa Parse error:", error)
        setError(`Failed to parse CSV: ${error.message}`)
      }
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const csvFile = files.find((file) => file.type === "text/csv" || file.name.endsWith(".csv"))

    if (csvFile) {
      handleFileUpload(csvFile)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="text-xs text-red-500 underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {csvData.length === 0 ? (
        <div
          className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
            isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
          <p className="text-xs font-medium mb-1">Upload CSV File</p>
          <p className="text-[10px] text-gray-600 mb-2">Drag and drop your CSV file here, or click to browse</p>
          <input type="file" accept=".csv" onChange={handleFileInput} className="hidden" id="csv-upload" />
          <Button asChild size="sm" className="h-7">
            <label htmlFor="csv-upload" className="cursor-pointer text-xs">
              Choose File
            </label>
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-600">{csvData.length} recipients loaded</p>
            <Button variant="outline" size="sm" onClick={() => onDataLoad([])} className="h-6 px-2">
              <X className="h-3 w-3 mr-1" />
              <span className="text-[10px]">Clear</span>
            </Button>
          </div>
          <div className="bg-gray-50 rounded p-2 max-h-24 overflow-y-auto">
            <div className="text-[10px] font-medium text-gray-700 mb-1">
              Available placeholders:{" "}
              {Object.keys(csvData[0] || {})
                .map((key) => `{{${key}}}`)
                .join(", ")}
            </div>
            <div className="space-y-1">
              {csvData.slice(0, 2).map((row, index) => (
                <div key={index} className="text-[10px] text-gray-600 truncate">
                  {row.email} -{" "}
                  {Object.entries(row)
                    .filter(([key]) => key !== "email")
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(", ")}
                </div>
              ))}
              {csvData.length > 2 && <div className="text-[10px] text-gray-500">... and {csvData.length - 2} more</div>}
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-2 p-2 bg-blue-50 rounded text-center">
        <p className="text-[10px] text-blue-800">
          💡 <strong>Tip:</strong> Your CSV should have an "email" column and any other fields you want to personalize.
        </p>
      </div>
    </div>
  )
}
