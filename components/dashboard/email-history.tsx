"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Mail, Calendar, Users, Clock, MoreHorizontal, Download, Eye, Copy, Trash2, AlertTriangle } from "lucide-react"
import type { EmailCampaign } from "@/types/email"
import { Filters } from "./filters"
import { format } from "date-fns"
import Link from "next/link"

interface EmailHistoryProps {
  campaigns: EmailCampaign[]
  onExport: (selectedCampaigns: string[]) => void
}

export function EmailHistory({ campaigns, onExport }: EmailHistoryProps) {
  const [filteredCampaigns, setFilteredCampaigns] = useState<EmailCampaign[]>(campaigns)
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [sortConfig, setSortConfig] = useState<{ key: keyof EmailCampaign; direction: "asc" | "desc" }>({
    key: "created_at",
    direction: "desc",
  })

  const handleFilterChange = (filters: {
    search: string
    status: string
    dateRange: { from?: Date; to?: Date }
  }) => {
    let filtered = [...campaigns]

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter((campaign) => campaign.subject.toLowerCase().includes(searchLower))
    }

    // Apply status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((campaign) => campaign.status === filters.status)
    }

    // Apply date range filter
    if (filters.dateRange.from || filters.dateRange.to) {
      filtered = filtered.filter((campaign) => {
        const campaignDate = new Date(campaign.created_at)

        if (filters.dateRange.from && filters.dateRange.to) {
          return campaignDate >= filters.dateRange.from && campaignDate <= filters.dateRange.to
        }

        if (filters.dateRange.from) {
          return campaignDate >= filters.dateRange.from
        }

        if (filters.dateRange.to) {
          return campaignDate <= filters.dateRange.to
        }

        return true
      })
    }

    setFilteredCampaigns(filtered)
  }

  const handleSort = (key: keyof EmailCampaign) => {
    const direction = sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc"
    setSortConfig({ key, direction })

    const sorted = [...filteredCampaigns].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1
      return 0
    })

    setFilteredCampaigns(sorted)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(filteredCampaigns.map((campaign) => campaign.id))
    } else {
      setSelectedCampaigns([])
    }
  }

  const handleSelectCampaign = (campaignId: string, checked: boolean) => {
    if (checked) {
      setSelectedCampaigns((prev) => [...prev, campaignId])
    } else {
      setSelectedCampaigns((prev) => prev.filter((id) => id !== campaignId))
    }
  }

  const handleExport = () => {
    onExport(selectedCampaigns.length > 0 ? selectedCampaigns : filteredCampaigns.map((c) => c.id))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Campaign History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export {selectedCampaigns.length > 0 ? `(${selectedCampaigns.length})` : "All"}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Filters onFilterChange={handleFilterChange} />
      </CardHeader>
      <CardContent>
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
            <p className="text-gray-600 mb-6">
              {campaigns.length === 0
                ? "Start by creating your first email campaign"
                : "Try adjusting your search or filters"}
            </p>
            <Button asChild>
              <Link href="/compose">Create Campaign</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedCampaigns.length === filteredCampaigns.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("subject")}>
                    Subject
                    {sortConfig.key === "subject" && (
                      <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                    )}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("created_at")}>
                    Date
                    {sortConfig.key === "created_at" && (
                      <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                    )}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("total_recipients")}>
                    Recipients
                    {sortConfig.key === "total_recipients" && (
                      <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                    )}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("open_count")}>
                    Opens
                    {sortConfig.key === "open_count" && (
                      <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                    )}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("click_count")}>
                    Clicks
                    {sortConfig.key === "click_count" && (
                      <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                    )}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                    Status
                    {sortConfig.key === "status" && (
                      <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                    )}
                  </TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => {
                  const openRate = campaign.sent_count > 0 ? (campaign.open_count / campaign.sent_count) * 100 : 0
                  const clickRate = campaign.sent_count > 0 ? (campaign.click_count / campaign.sent_count) * 100 : 0

                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCampaigns.includes(campaign.id)}
                          onCheckedChange={(checked) => handleSelectCampaign(campaign.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{campaign.subject}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(campaign.created_at), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{campaign.total_recipients}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{campaign.open_count}</span>
                          <span className="text-xs text-green-600">{openRate.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{campaign.click_count}</span>
                          <span className="text-xs text-blue-600">{clickRate.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            campaign.status === "sent"
                              ? "default"
                              : campaign.status === "sending"
                                ? "secondary"
                                : campaign.status === "failed"
                                  ? "destructive"
                                  : "outline"
                          }
                          className="capitalize"
                        >
                          {campaign.status === "sending" && <Clock className="h-3 w-3 mr-1" />}
                          {campaign.status === "failed" && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
