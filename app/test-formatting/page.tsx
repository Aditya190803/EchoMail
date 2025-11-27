"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  Send, 
  Eye, 
  Mail, 
  CheckCircle2, 
  Loader2,
  FileText,
  Palette,
  Table2,
  Code,
  Quote,
  Image,
  Type,
  List
} from "lucide-react"

/**
 * Comprehensive Email Formatting Test Page
 * 
 * This page allows you to send a test email that includes ALL formatting features
 * to verify that emails render correctly in Gmail and other email clients.
 */
export default function TestFormattingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [recipientEmail, setRecipientEmail] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    router.push("/auth/signin")
    return null
  }

  // Comprehensive test email HTML content
  const testEmailHtml = `
<p><strong>Hello Team,</strong></p>

<p>This email is a <strong>comprehensive formatting test</strong> for the EchoMail app.<br>
Below you'll find text styles, lists, tables, images, links, code, and other oddities to ensure everything renders correctly.</p>

<hr>

<h2>Text Styles</h2>

<ul>
  <li><strong>Bold text</strong></li>
  <li><em>Italic text</em></li>
  <li><strong><em>Bold + italic</em></strong></li>
  <li><u>Underlined text</u></li>
  <li><span style="color: #dc2626;">Red text</span>, <span style="color: #16a34a;">Green text</span>, <span style="color: #2563eb;">Blue text</span></li>
  <li><s>Strikethrough</s></li>
  <li><mark style="background-color: #fef08a;">Highlighted text</mark></li>
  <li>Mixed: <strong>Bold</strong>, <em>italic</em>, <u>underline</u>, <s>strike</s> in one line.</li>
</ul>

<hr>

<h2>Headings</h2>

<h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
<h4>Heading 4</h4>

<hr>

<h2>Lists</h2>

<p><strong>Ordered:</strong></p>
<ol>
  <li>First item</li>
  <li>Second item</li>
  <li>Third item</li>
</ol>

<p><strong>Unordered:</strong></p>
<ul>
  <li>Bullet A</li>
  <li>Bullet B</li>
  <li>Bullet C</li>
</ul>

<p><strong>Nested:</strong></p>
<ul>
  <li>Item 1
    <ul>
      <li>Subitem 1.1
        <ul>
          <li>Subitem 1.1.1</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>

<hr>

<h2>Links</h2>

<ul>
  <li>Standard link: <a href="https://example.com">https://example.com</a></li>
  <li>Anchor text: <a href="https://openai.com">OpenAI</a></li>
</ul>

<hr>

<h2>Inline Code & Code Block</h2>

<p>Inline: <code>console.log("Hello");</code></p>

<pre><code>function example() {
    return "This is a code block";
}
</code></pre>

<hr>

<h2>Quote</h2>

<blockquote>
This is a blockquote.<br>
It should indent and style differently.
</blockquote>

<hr>

<h2>Table Test</h2>

<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; margin: 1em 0;">
  <tr>
    <th style="background: #f3f4f6; border: 1px solid #d1d5db; padding: 8px;">Column A</th>
    <th style="background: #f3f4f6; border: 1px solid #d1d5db; padding: 8px;">Column B</th>
    <th style="background: #f3f4f6; border: 1px solid #d1d5db; padding: 8px;">Column C</th>
  </tr>
  <tr>
    <td style="border: 1px solid #d1d5db; padding: 8px;">Row 1, A</td>
    <td style="border: 1px solid #d1d5db; padding: 8px;">Row 1, B</td>
    <td style="border: 1px solid #d1d5db; padding: 8px;">Row 1, C</td>
  </tr>
  <tr>
    <td style="border: 1px solid #d1d5db; padding: 8px;">Row 2, A</td>
    <td style="border: 1px solid #d1d5db; padding: 8px;">Row 2, B</td>
    <td style="border: 1px solid #d1d5db; padding: 8px;">Row 2, C</td>
  </tr>
</table>

<hr>

<h2>Image Placeholder</h2>

<p>(Use this to test remote images.)</p>

<img src="https://via.placeholder.com/300x100?text=Test+Image" alt="Test Image" style="max-width: 100%; height: auto; border-radius: 8px;">

<hr>

<h2>Long Line Test</h2>

<p>This_is_a_single_unbroken_line_that_tests_wrapping_behavior_in_the_mail_client_and_it_should_not_break_unexpectedly_or_overflow_the_layout___________________________END</p>

<hr>

<h2>Special Characters</h2>

<ul>
  <li>Accents: á é í ó ú ü ñ</li>
  <li>Symbols: © ® ™ § ¶</li>
  <li>Math: ∑ π √∞ ≈</li>
  <li>Emojis: 😀🔥✨💡🚀</li>
</ul>

<hr>

<h2>RTL Text (Right-to-Left)</h2>

<p dir="rtl">זהו טקסט לדוגמה כדי לבדוק כיווניות.</p>

<hr>

<p>If this email renders correctly in your mail client, you're in good shape.<br>
Let me know if you need more edge cases.</p>

<p>— <strong>End of Test Email</strong> —</p>

<p><em>Sent via EchoMail Formatting Test</em></p>
`

  const handlePreview = async () => {
    setIsPreviewing(true)
    try {
      const response = await fetch('/api/format-email-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent: testEmailHtml }),
      })
      
      if (response.ok) {
        const result = await response.json()
        setPreviewHtml(result.formattedHTML)
      } else {
        toast.error("Failed to generate preview")
      }
    } catch (error) {
      toast.error("Error generating preview")
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleSendTest = async () => {
    if (!recipientEmail) {
      toast.error("Please enter a recipient email address")
      return
    }

    setIsSending(true)
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizedEmails: [{
            to: recipientEmail,
            subject: "🧪 EchoMail Formatting Test – Please Ignore",
            message: testEmailHtml,
            originalRowData: {},
            attachments: []
          }]
        }),
      })

      const result = await response.json()

      if (response.ok && result.results?.[0]?.status === "success") {
        toast.success(`Test email sent to ${recipientEmail}!`)
      } else {
        toast.error(result.error || result.results?.[0]?.error || "Failed to send test email")
      }
    } catch (error) {
      toast.error("Error sending test email")
    } finally {
      setIsSending(false)
    }
  }

  const features = [
    { icon: Type, label: "Text Styles", desc: "Bold, italic, underline, strikethrough" },
    { icon: Palette, label: "Colors", desc: "Text colors and highlights" },
    { icon: List, label: "Lists", desc: "Ordered, unordered, nested" },
    { icon: Table2, label: "Tables", desc: "Full table support with headers" },
    { icon: Code, label: "Code", desc: "Inline code and code blocks" },
    { icon: Quote, label: "Quotes", desc: "Blockquotes with styling" },
    { icon: Image, label: "Images", desc: "Remote image embedding" },
    { icon: FileText, label: "Special", desc: "Emojis, RTL, special chars" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Email Formatting Test</h1>
          <p className="text-gray-600 mt-2">
            Send a comprehensive test email to verify all formatting features work correctly.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  Send Test Email
                </CardTitle>
                <CardDescription>
                  Enter your email to receive the test
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Recipient Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <Button 
                  onClick={handleSendTest} 
                  disabled={isSending || !recipientEmail}
                  className="w-full"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test Email
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handlePreview} 
                  disabled={isPreviewing}
                  className="w-full"
                >
                  {isPreviewing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Email
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Features Tested</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                      <feature.icon className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-xs font-medium">{feature.label}</p>
                        <p className="text-[10px] text-gray-500">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Preview */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-blue-600" />
                    Email Preview
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                    Gmail Compatible
                  </Badge>
                </div>
                <CardDescription>
                  This is exactly how the email will appear in Gmail
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden bg-white">
                  {previewHtml ? (
                    <iframe
                      srcDoc={createGmailPreviewWrapper(previewHtml)}
                      className="w-full h-[600px] border-0"
                      title="Email Preview"
                    />
                  ) : (
                    <div className="h-[600px] flex flex-col items-center justify-center text-gray-500">
                      <Eye className="h-12 w-12 mb-4 text-gray-300" />
                      <p>Click "Preview Email" to see the formatted email</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

function createGmailPreviewWrapper(htmlContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #222222;
      background: #ffffff;
    }
    h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
    h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; }
    h3 { font-size: 1.17em; font-weight: bold; margin: 0.83em 0; }
    h4 { font-size: 1em; font-weight: bold; margin: 1em 0; }
    p, div { margin: 0.5em 0; }
    ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    ul ul { list-style-type: circle; }
    ul ul ul { list-style-type: square; }
    li { margin: 0.25em 0; }
    a { color: #2563eb; text-decoration: underline; }
    blockquote {
      border-left: 3px solid #ccc;
      margin: 1em 0;
      padding-left: 1em;
      color: #666;
      font-style: italic;
    }
    pre {
      background: #f5f5f5;
      color: #333;
      font-family: 'Courier New', Courier, monospace;
      padding: 12px 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1em 0;
      white-space: pre-wrap;
    }
    code {
      background: #f1f5f9;
      color: #e11d48;
      padding: 0.2em 0.4em;
      border-radius: 0.25em;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.9em;
    }
    pre code { background: none; color: inherit; padding: 0; }
    hr { border: none; border-top: 2px solid #e5e7eb; margin: 1.5em 0; }
    table { border-collapse: collapse; margin: 1em 0; }
    th, td { border: 1px solid #d1d5db; padding: 8px; }
    th { background: #f3f4f6; font-weight: bold; }
    img { max-width: 100%; height: auto; }
    mark { background-color: #fef08a; padding: 0.1em 0.2em; border-radius: 0.25em; }
    s, strike, del { text-decoration: line-through; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`
}
