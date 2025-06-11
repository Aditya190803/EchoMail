export default function EnvCheckPage() {
  const envVars = [
    {
      name: "GOOGLE_CLIENT_ID",
      value: process.env.GOOGLE_CLIENT_ID ? "Set" : "Not set",
      required: true,
    },
    {
      name: "GOOGLE_CLIENT_SECRET",
      value: process.env.GOOGLE_CLIENT_SECRET ? "Set" : "Not set",
      required: true,
    },
    {
      name: "NEXTAUTH_URL",
      value: process.env.NEXTAUTH_URL ? process.env.NEXTAUTH_URL : "Not set",
      required: true,
    },
    {
      name: "NEXTAUTH_SECRET",
      value: process.env.NEXTAUTH_SECRET ? "Set" : "Not set",
      required: true,
    },
  ]

  const missingRequired = envVars.filter((env) => env.required && env.value === "Not set")

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Check</h1>

      {missingRequired.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h2 className="text-red-800 font-semibold mb-2">⚠️ Missing Required Environment Variables</h2>
          <p className="text-red-700 text-sm mb-2">The following required environment variables are not set:</p>
          <ul className="list-disc list-inside text-red-700 text-sm">
            {missingRequired.map((env) => (
              <li key={env.name}>{env.name}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded-lg">
        <ul className="space-y-2">
          {envVars.map((env) => (
            <li key={env.name} className="flex justify-between items-center">
              <span className="font-mono text-sm">{env.name}</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${env.value === "Set" ? "text-green-600" : "text-red-600"}`}>
                  {env.value}
                </span>
                {env.required && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Required</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 text-sm text-gray-600 space-y-2">
        <p>
          <strong>Note:</strong> This page is server-side rendered and shows the actual environment variables on the
          server.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Required Environment Variables:</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>
              <strong>GOOGLE_CLIENT_ID:</strong> Your Google OAuth client ID
            </li>
            <li>
              <strong>GOOGLE_CLIENT_SECRET:</strong> Your Google OAuth client secret
            </li>
            <li>
              <strong>NEXTAUTH_URL:</strong> Your application URL (e.g., https://yourdomain.com)
            </li>
            <li>
              <strong>NEXTAUTH_SECRET:</strong> A random secret for NextAuth.js
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
