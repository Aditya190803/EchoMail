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

  const handleFileUpload = (file: File) => {
    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as CSVRow[]
        onDataLoad(data.filter((row) => row.email)) // Filter out rows without email
      },
      header: true,
      skipEmptyLines: true,
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
