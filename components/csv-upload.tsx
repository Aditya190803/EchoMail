"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          CSV Data Upload
        </CardTitle>
      </CardHeader>
      <CardContent>
        {csvData.length === 0 ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">Upload CSV File</p>
            <p className="text-sm text-gray-600 mb-4">Drag and drop your CSV file here, or click to browse</p>
            <input type="file" accept=".csv" onChange={handleFileInput} className="hidden" id="csv-upload" />
            <Button asChild>
              <label htmlFor="csv-upload" className="cursor-pointer">
                Choose File
              </label>
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">{csvData.length} recipients loaded</p>
              <Button variant="outline" size="sm" onClick={() => onDataLoad([])}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
            <div className="bg-gray-50 rounded p-4 max-h-40 overflow-y-auto">
              <div className="text-xs font-medium text-gray-700 mb-2">
                Available placeholders:{" "}
                {Object.keys(csvData[0] || {})
                  .map((key) => `{{${key}}}`)
                  .join(", ")}
              </div>
              <div className="space-y-1">
                {csvData.slice(0, 5).map((row, index) => (
                  <div key={index} className="text-sm text-gray-600">
                    {row.email} -{" "}
                    {Object.entries(row)
                      .filter(([key]) => key !== "email")
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(", ")}
                  </div>
                ))}
                {csvData.length > 5 && <div className="text-sm text-gray-500">... and {csvData.length - 5} more</div>}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
