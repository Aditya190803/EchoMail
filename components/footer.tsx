"use client"

import Link from "next/link"

export function Footer() {
  return (
    <footer className="w-full border-t bg-white/80 backdrop-blur py-6 mt-12">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span className="font-bold text-blue-700">EchoMail</span>
          <span className="hidden md:inline">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-4">
          <Link href="/tos" className="hover:underline">Terms of Service</Link>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </div>
        <div className="text-xs text-gray-400">Made with ❤️ for privacy-first email campaigns</div>
      </div>
    </footer>
  )
}
