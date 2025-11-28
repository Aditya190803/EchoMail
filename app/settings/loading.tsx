import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-5 w-80" />
        </div>

        {/* Settings Categories Skeleton */}
        <div className="space-y-8">
          {[...Array(3)].map((_, categoryIdx) => (
            <div key={categoryIdx}>
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="space-y-3">
                {[...Array(categoryIdx === 0 ? 2 : 1)].map((_, itemIdx) => (
                  <Card key={itemIdx} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4 p-4">
                        <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-4 w-64" />
                        </div>
                        <Skeleton className="h-5 w-5 rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Account Section Skeleton */}
        <div className="mt-12 pt-8 border-t">
          <Skeleton className="h-5 w-32 mb-4" />
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-11 w-24" />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
