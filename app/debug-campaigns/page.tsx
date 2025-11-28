"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { campaignsService } from "@/lib/appwrite"

export default function DebugCampaignsPage() {
  const { data: session } = useSession()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAllCampaigns = async () => {
      if (!session?.user?.email) {
        setLoading(false)
        return
      }
      
      try {
        const response = await campaignsService.listByUser(session.user.email)
        const allCampaigns = response.documents.map(doc => ({
          id: doc.$id,
          ...doc
        }))
        setCampaigns(allCampaigns)
        console.log("All campaigns:", allCampaigns)
      } catch (error) {
        console.error("Error fetching campaigns:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllCampaigns()
  }, [session?.user?.email])

  if (loading) {
    return <div className="p-4">Loading campaigns...</div>
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Debug: All Campaigns in Appwrite</CardTitle>
          <p className="text-sm text-gray-600">
            Current user: {session?.user?.email || "Not logged in"}
          </p>
          <p className="text-sm text-gray-600">
            Total campaigns found: {campaigns.length}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.length === 0 ? (
              <p>No campaigns found in database</p>
            ) : (
              campaigns.map((campaign, index) => (
                <div key={campaign.id} className="border p-4 rounded">
                  <h3 className="font-bold">Campaign #{index + 1}</h3>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                    {JSON.stringify(campaign, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
