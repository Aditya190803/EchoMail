import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const error = searchParams.get("error")

  // Return proper JSON response for authentication errors
  return NextResponse.json(
    {
      error: error || "Unknown authentication error",
      message: getErrorMessage(error),
      timestamp: new Date().toISOString(),
      status: 400, // Add status code
    },
    { status: error ? 400 : 500 },
  ) // Set appropriate HTTP status code
}

function getErrorMessage(error: string | null): string {
  switch (error) {
    case "Configuration":
      return "Server configuration error. Please check environment variables."
    case "AccessDenied":
      return "Access was denied. Please try again."
    case "Verification":
      return "Verification failed. Please try again."
    default:
      return "An authentication error occurred. Please try again."
  }
}
