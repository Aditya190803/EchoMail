export default function EnvCheckPage() {
  const envVars = [
    { name: "GOOGLE_CLIENT_ID", value: process.env.GOOGLE_CLIENT_ID ? "Set" : "Not set" },
    { name: "GOOGLE_CLIENT_SECRET", value: process.env.GOOGLE_CLIENT_SECRET ? "Set" : "Not set" },
    { name: "NEXTAUTH_URL", value: process.env.NEXTAUTH_URL ? "Set" : "Not set" },
    { name: "NEXTAUTH_SECRET", value: process.env.NEXTAUTH_SECRET ? "Set" : "Not set" },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Check</h1>
      <div className="bg-gray-100 p-4 rounded">
        <ul className="space-y-2">
          {envVars.map((env) => (
            <li key={env.name} className="flex justify-between">
              <span className="font-mono">{env.name}</span>
              <span className={env.value === "Set" ? "text-green-600" : "text-red-600"}>{env.value}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 text-sm text-gray-600">
        <p>Note: This page is server-side rendered and shows the actual environment variables on the server.</p>
      </div>
    </div>
  )
}
