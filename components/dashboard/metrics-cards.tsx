"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Send, Eye, MousePointer, TrendingUp, AlertTriangle } from "lucide-react"
import type { EmailMetrics } from "@/types/email"

interface MetricsCardsProps {
  metrics: EmailMetrics
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Sent</p>
              <p className="text-3xl font-bold">{metrics.total_emails_sent.toLocaleString()}</p>
            </div>
            <Send className="h-8 w-8 text-blue-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Open Rate</p>
              <p className="text-3xl font-bold">{metrics.avg_open_rate.toFixed(1)}%</p>
            </div>
            <Eye className="h-8 w-8 text-green-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Click Rate</p>
              <p className="text-3xl font-bold">{metrics.avg_click_rate.toFixed(1)}%</p>
            </div>
            <MousePointer className="h-8 w-8 text-purple-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Delivery Rate</p>
              <p className="text-3xl font-bold">{metrics.avg_delivery_rate.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Bounce Rate</p>
              <p className="text-3xl font-bold">{metrics.avg_bounce_rate.toFixed(1)}%</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-200" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
