"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, Shield, AlertTriangle, Users, Mail, Gavel } from "lucide-react"
import Link from "next/link"

export default function TermsOfServicePage() {
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
              <FileText className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">EchoMail</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</CardTitle>
            <p className="text-gray-600">Last updated: June 11, 2025</p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <div className="space-y-8">
              {/* Introduction */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Agreement to Terms</h2>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  By accessing and using EchoMail ("the Service"), you agree to be bound by these Terms of Service 
                  ("Terms"). If you do not agree to these Terms, please do not use our Service.
                </p>
              </section>

              {/* Service Description */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Service Description</h2>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  EchoMail is a web-based service that allows users to send personalized bulk emails through their 
                  Gmail accounts using Google's Gmail API. The Service includes features for uploading recipient 
                  lists via CSV, composing rich text emails, and tracking email analytics.
                </p>
              </section>

              {/* User Accounts */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Users className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">User Accounts</h2>
                </div>
                <div className="space-y-4 text-gray-700">
                  <p>
                    <strong>Account Creation:</strong> You must sign in with a valid Google account to use our Service. 
                    You are responsible for maintaining the security of your account.
                  </p>
                  <p>
                    <strong>Accurate Information:</strong> You agree to provide accurate, current, and complete 
                    information about yourself as prompted by our sign-in process.
                  </p>
                  <p>
                    <strong>Account Responsibility:</strong> You are responsible for all activities that occur under 
                    your account and for maintaining the confidentiality of your account credentials.
                  </p>
                </div>
              </section>

              {/* Acceptable Use */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Acceptable Use Policy</h2>
                </div>
                <div className="space-y-4">
                  <p className="text-gray-700">You agree to use EchoMail only for lawful purposes and in accordance with these Terms. You agree NOT to use the Service:</p>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></span>
                      To send spam, unsolicited emails, or emails to recipients who have not consented to receive them
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></span>
                      To send content that is illegal, harmful, threatening, abusive, or violates any laws
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></span>
                      To impersonate any person or entity or falsely represent your affiliation
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></span>
                      To violate any applicable anti-spam laws or regulations, including CAN-SPAM Act, GDPR, or CASL
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></span>
                      To send emails containing malware, viruses, or other harmful code
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></span>
                      To interfere with or disrupt the Service or servers connected to the Service
                    </li>
                  </ul>
                </div>
              </section>

              {/* Email Compliance */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Gavel className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Email Compliance Requirements</h2>
                </div>
                <div className="space-y-4 text-gray-700">
                  <p>
                    <strong>Consent:</strong> You must have explicit consent from all email recipients before sending 
                    them emails through our Service.
                  </p>
                  <p>
                    <strong>Unsubscribe:</strong> You must provide a clear and easy way for recipients to unsubscribe 
                    from your emails and honor all unsubscribe requests promptly.
                  </p>
                  <p>
                    <strong>Identification:</strong> Your emails must clearly identify you as the sender and include 
                    accurate contact information.
                  </p>
                  <p>
                    <strong>Content Guidelines:</strong> Email content must be truthful and not misleading. Subject 
                    lines must accurately reflect the content of the email.
                  </p>
                </div>
              </section>

              {/* Limitations and Restrictions */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Service Limitations</h2>
                </div>
                <div className="space-y-4 text-gray-700">
                  <p>
                    <strong>Gmail API Limits:</strong> Our Service is subject to Google Gmail API rate limits and 
                    quotas. We cannot guarantee unlimited email sending capacity.
                  </p>
                  <p>
                    <strong>Account Suspension:</strong> We reserve the right to suspend or terminate accounts that 
                    violate these Terms or engage in abusive behavior.
                  </p>
                  <p>
                    <strong>Service Availability:</strong> While we strive for high availability, we do not guarantee 
                    that the Service will be available 100% of the time.
                  </p>
                </div>
              </section>

              {/* Intellectual Property */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Intellectual Property</h2>
                </div>
                <p className="text-gray-700">
                  The Service and its original content, features, and functionality are owned by EchoMail and are 
                  protected by international copyright, trademark, patent, trade secret, and other intellectual 
                  property laws.
                </p>
              </section>

              {/* Disclaimer of Warranties */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Disclaimer of Warranties</h2>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                  <p className="text-gray-700">
                    THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER 
                    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, 
                    FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                  </p>
                </div>
              </section>

              {/* Limitation of Liability */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Limitation of Liability</h2>
                </div>
                <p className="text-gray-700">
                  IN NO EVENT SHALL ECHOMAIL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR 
                  PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER 
                  INTANGIBLE LOSSES.
                </p>
              </section>

              {/* Termination */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Users className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Termination</h2>
                </div>
                <p className="text-gray-700">
                  You may terminate your account at any time by revoking access through your Google Account settings. 
                  We may terminate or suspend your account immediately, without prior notice, for conduct that we 
                  believe violates these Terms or is harmful to other users of the Service.
                </p>
              </section>

              {/* Changes to Terms */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Changes to Terms</h2>
                </div>
                <p className="text-gray-700">
                  We reserve the right to modify or replace these Terms at any time. If a revision is material, 
                  we will try to provide at least 30 days notice prior to any new terms taking effect.
                </p>
              </section>

              {/* Governing Law */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Gavel className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Governing Law</h2>
                </div>
                <p className="text-gray-700">
                  These Terms shall be interpreted and governed by the laws of the jurisdiction in which EchoMail 
                  operates, without regard to its conflict of law provisions.
                </p>
              </section>

              {/* Contact Information */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
                </div>
                <p className="text-gray-700">
                  If you have any questions about these Terms of Service, please contact us at:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg mt-2">
                  <p className="text-gray-700">
                    <strong>Email:</strong> legal@echomail.com<br />
                    <strong>Support:</strong> support@echomail.com
                  </p>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
