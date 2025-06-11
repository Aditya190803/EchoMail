"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Shield, Eye, Lock, Database, UserCheck, Mail } from "lucide-react"
import Link from "next/link"

export default function PrivacyPolicyPage() {
  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">EchoMail</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</CardTitle>
            <p className="text-gray-600">Last updated: June 11, 2025</p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <div className="space-y-8">
              {/* Introduction */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Eye className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Introduction</h2>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  At EchoMail, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect 
                  your information when you use our Gmail API integration service for sending personalized bulk emails.
                </p>
              </section>

              {/* Information We Collect */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Database className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Information We Collect</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Google Account Information</h3>
                    <p className="text-gray-700">
                      When you sign in with Google, we receive your basic profile information including your name, 
                      email address, and profile picture.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Email Content</h3>
                    <p className="text-gray-700">
                      We temporarily process your email content, recipient lists, and attachments solely for the 
                      purpose of sending emails through Gmail's API. This data is never stored permanently.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Usage Analytics</h3>
                    <p className="text-gray-700">
                      We collect anonymized usage statistics to improve our service, including email send counts, 
                      open rates, and click rates.
                    </p>
                  </div>
                </div>
              </section>

              {/* How We Use Your Information */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <UserCheck className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">How We Use Your Information</h2>
                </div>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                    To authenticate and authorize access to your Gmail account
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                    To send emails on your behalf through Gmail's API
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                    To provide analytics and insights about your email campaigns
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                    To improve our service through anonymized usage data
                  </li>
                </ul>
              </section>

              {/* Data Protection */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Data Protection & Security</h2>
                </div>
                <div className="space-y-4 text-gray-700">
                  <p>
                    <strong>No Permanent Storage:</strong> Your email content and recipient data are never stored 
                    permanently on our servers. Data is processed in memory only during the sending process.
                  </p>
                  <p>
                    <strong>Encryption:</strong> All data transmission between your browser and our servers is 
                    encrypted using industry-standard TLS encryption.
                  </p>
                  <p>
                    <strong>OAuth Security:</strong> We use Google's secure OAuth 2.0 authentication, which means 
                    we never have access to your Gmail password.
                  </p>
                  <p>
                    <strong>Limited Access:</strong> We only request the minimum necessary permissions to send 
                    emails through your Gmail account.
                  </p>
                </div>
              </section>

              {/* Third-Party Services */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Third-Party Services</h2>
                </div>
                <p className="text-gray-700">
                  EchoMail integrates with Google Gmail API to send emails. Your use of Gmail is subject to 
                  Google's Privacy Policy and Terms of Service. We do not share your data with any other 
                  third-party services.
                </p>
              </section>

              {/* Your Rights */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <UserCheck className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Your Rights</h2>
                </div>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Access:</strong> You can view your profile information in your dashboard.</p>
                  <p><strong>Deletion:</strong> You can revoke access at any time through your Google Account settings.</p>
                  <p><strong>Data Portability:</strong> Since we don't store your data permanently, all your data remains in your Google account.</p>
                  <p><strong>Correction:</strong> Any changes to your profile information are automatically synced from your Google account.</p>
                </div>
              </section>

              {/* Contact Information */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
                </div>
                <p className="text-gray-700">
                  If you have any questions about this Privacy Policy or our data practices, please contact us at:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg mt-2">
                  <p className="text-gray-700">
                    <strong>Email:</strong> privacy@echomail.com<br />
                    <strong>Support:</strong> support@echomail.com
                  </p>
                </div>
              </section>

              {/* Updates */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Policy Updates</h2>
                <p className="text-gray-700">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by 
                  posting the new Privacy Policy on this page and updating the "Last updated" date.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
