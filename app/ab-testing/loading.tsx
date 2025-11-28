import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ABTestingLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-8 w-40" />
            </div>
            <Skeleton className="h-5 w-72" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>

        {/* Tests List Skeleton */}
        <div className="space-y-4">
          {[...Array(3)].map((_, idx) => (
            <Card key={idx}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Test Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                    
                    {/* Variants Grid */}
                    <div className="grid grid-cols-2 gap-6">
                      {/* Variant A Skeleton */}
                      <div className="p-4 rounded-lg border-2 border-border">
                        <div className="flex items-center justify-between mb-3">
                          <Skeleton className="h-5 w-20" />
                        </div>
                        <Skeleton className="h-4 w-full mb-3" />
                        <div className="grid grid-cols-3 gap-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="text-center">
                              <Skeleton className="h-6 w-10 mx-auto mb-1" />
                              <Skeleton className="h-3 w-16 mx-auto" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Variant B Skeleton */}
                      <div className="p-4 rounded-lg border-2 border-border">
                        <div className="flex items-center justify-between mb-3">
                          <Skeleton className="h-5 w-20" />
                        </div>
                        <Skeleton className="h-4 w-full mb-3" />
                        <div className="grid grid-cols-3 gap-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="text-center">
                              <Skeleton className="h-6 w-10 mx-auto mb-1" />
                              <Skeleton className="h-3 w-16 mx-auto" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Skeleton */}
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
