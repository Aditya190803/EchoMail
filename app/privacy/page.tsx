"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Shield, Eye, Lock, Database, UserCheck, Mail } from "lucide-react"
import Link from "next/link"

export default function PrivacyPolicyPage() {
  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="w-full px-2">
          <div className="flex flex-col sm:flex-row justify-between items-center py-2 gap-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/" className="flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="EchoMail Logo" className="h-8 w-8" />
              <span className="text-base font-bold text-gray-900">EchoMail</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-2 py-4">
        <Card className="shadow-lg w-full">
          <CardHeader className="text-center p-3">
            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Privacy Policy</CardTitle>
            <p className="text-xs text-gray-600">Last updated: June 11, 2025</p>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-6">
              {/* Introduction */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Introduction</h2>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  At EchoMail, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect 
                  your information when you use our Gmail API integration service for sending personalized bulk emails.
                </p>
              </section>

              {/* Information We Collect */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Database className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Information We Collect</h2>
                </div>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 mb-2">Google Account Information</h3>
                    <p className="text-sm text-gray-700">
                      When you sign in with Google, we receive your basic profile information including your name, 
                      email address, and profile picture.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 mb-2">Email Data</h3>
                    <p className="text-sm text-gray-700">
                      We access your Gmail account only to send emails on your behalf. We do not read, store, or 
                      analyze your existing emails.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 mb-2">Campaign Data</h3>
                    <p className="text-sm text-gray-700">
                      We temporarily process the email content, recipient lists, and campaign settings you provide 
                      to send your emails.
                    </p>
                  </div>
                </div>
              </section>

              {/* How We Use Your Information */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">How We Use Your Information</h2>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                    To send emails through your Gmail account as requested
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                    To personalize email content based on your recipient data
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                    To provide email delivery reports and analytics
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                    To improve our service quality and user experience
                  </li>
                </ul>
              </section>

              {/* Data Storage and Security */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Data Storage and Security</h2>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">
                    <strong>No Permanent Storage:</strong> We do not permanently store your email content, recipient 
                    lists, or campaign data. Information is processed temporarily during email sending only.
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Secure Transmission:</strong> All data transmission between your browser and our servers is 
                    encrypted using industry-standard TLS encryption.
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>OAuth Security:</strong> We use Google's secure OAuth 2.0 authentication, which means 
                    we never have access to your Gmail password.
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Limited Access:</strong> We only request the minimum necessary permissions to send 
                    emails through your Gmail account.
                  </p>
                </div>
              </section>

              {/* Third-Party Services */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Third-Party Services</h2>
                </div>
                <p className="text-sm text-gray-700">
                  EchoMail integrates with Google Gmail API to send emails. Your use of Gmail is subject to 
                  Google's Privacy Policy and Terms of Service. We do not share your data with any other 
                  third-party services.
                </p>
              </section>

              {/* Contact Us */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Contact Us</h2>
                </div>
                <p className="text-sm text-gray-700">
                  If you have any questions about this Privacy Policy or our data practices, please contact us at:
                </p>
                <div className="bg-gray-50 p-3 rounded-lg mt-2">
                  <p className="text-sm text-gray-700">
                    <strong>Email:</strong> adityamer.work@gmail.com<br />
                    <strong>Support:</strong> adityamer.work@gmail.com<br />
                  </p>
                </div>
              </section>

              {/* Updates */}
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3">Policy Updates</h2>
                <p className="text-sm text-gray-700">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                  the new Privacy Policy on this page and updating the "Last updated" date.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}