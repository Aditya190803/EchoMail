"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, Shield, AlertTriangle, Users, Mail, Gavel } from "lucide-react"
import Link from "next/link"

export default function TermsOfServicePage() {
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
            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Terms of Service</CardTitle>
            <p className="text-xs text-gray-600">Last updated: June 11, 2025</p>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-6">
              {/* Introduction */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Agreement to Terms</h2>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  By accessing and using EchoMail ("the Service"), you agree to be bound by these Terms of Service 
                  ("Terms"). If you do not agree to these Terms, please do not use our Service.
                </p>
              </section>

              {/* Service Description */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Service Description</h2>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  EchoMail is a web-based service that allows users to send personalized bulk emails through their 
                  Gmail accounts using Google's Gmail API. The Service includes features for uploading recipient 
                  lists via CSV, composing rich text emails, and tracking email analytics.
                </p>
              </section>

              {/* User Accounts */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">User Accounts</h2>
                </div>
                <div className="space-y-3 text-sm text-gray-700">
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
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Acceptable Use Policy</h2>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">You agree to use EchoMail only for lawful purposes and in accordance with these Terms. You agree NOT to use the Service:</p>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></span>
                      To send spam, unsolicited emails, or emails to recipients who have not consented to receive them
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></span>
                      To send content that is illegal, harmful, threatening, abusive, or violates any laws
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></span>
                      To impersonate any person or entity or falsely represent your affiliation
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></span>
                      To violate any applicable anti-spam laws or regulations, including CAN-SPAM Act, GDPR, or CASL
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></span>
                      To send emails containing malware, viruses, or other harmful code
                    </li>
                  </ul>
                </div>
              </section>

              {/* Email Compliance */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Gavel className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Email Compliance Requirements</h2>
                </div>
                <div className="space-y-3 text-sm text-gray-700">
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

              {/* Service Limitations */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Service Limitations</h2>
                </div>
                <div className="space-y-3 text-sm text-gray-700">
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

              {/* Contact Us */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Contact Us</h2>
                </div>
                <p className="text-sm text-gray-700">
                  If you have any questions about these Terms of Service, please contact us at:
                </p>
                <div className="bg-gray-50 p-3 rounded-lg mt-2">
                  <p className="text-sm text-gray-700">
                    <strong>Email:</strong> adityamer.work@gmail.com<br />
                    <strong>Support:</strong> adityamer.work@gmail.com<br />
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