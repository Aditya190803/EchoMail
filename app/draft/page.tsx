"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navbar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Clock,
  Calendar,
  Mail,
  Users,
  Play,
  Pause,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Eye,
  RefreshCw,
  Edit,
} from "lucide-react"
import Link from "next/link"
import { scheduledEmailsService, type ScheduledEmail } from "@/lib/appwrite"
import { toast } from "sonner"
import { format, formatDistanceToNow, isPast } from "date-fns"

export default function ScheduledPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [previewEmail, setPreviewEmail] = useState<ScheduledEmail | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  const fetchScheduledEmails = useCallback(async () => {
    if (!session?.user?.email) return
    
    setIsLoading(true)
    try {
      const response = await scheduledEmailsService.listByUser(session.user.email)
      setScheduledEmails(response.documents)
    } catch (error) {
      console.error("Error fetching scheduled emails:", error)
      toast.error("Failed to load scheduled emails")
    }
    setIsLoading(false)
  }, [session?.user?.email])

  useEffect(() => {
    if (!session?.user?.email) return
    
    fetchScheduledEmails()
    
    const unsubscribe = scheduledEmailsService.subscribeToUserScheduledEmails(
      session.user.email,
      () => fetchScheduledEmails()
    )
    
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [session?.user?.email, fetchScheduledEmails])

  const cancelScheduledEmail = async (emailId: string) => {
    try {
      await scheduledEmailsService.cancel(emailId)
      toast.success("Scheduled email cancelled")
      fetchScheduledEmails()
    } catch (error) {
      console.error("Error cancelling email:", error)
      toast.error("Failed to cancel scheduled email")
    }
  }

  const deleteScheduledEmail = async (emailId: string) => {
    try {
      await scheduledEmailsService.delete(emailId)
      toast.success("Scheduled email deleted")
      fetchScheduledEmails()
    } catch (error) {
      console.error("Error deleting email:", error)
      toast.error("Failed to delete scheduled email")
    }
  }

  const sendNow = async (email: ScheduledEmail) => {
    if (!email.$id) return
    
    setSendingId(email.$id)
    
    try {
      // Update status to sending
      await scheduledEmailsService.updateStatus(email.$id, 'sending')
      
      // Call the send API
      const response = await fetch('/api/send-scheduled-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledEmailId: email.$id }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        // Reset status back to pending so user can try again
        await scheduledEmailsService.updateStatus(email.$id, 'pending')
        throw new Error(data.error || 'Failed to send email')
      }
      
      if (data.summary?.failed > 0) {
        toast.warning(`Sent ${data.summary.sent} of ${data.summary.total} emails. ${data.summary.failed} failed.`)
      } else {
        toast.success("Email sent successfully!")
      }
      fetchScheduledEmails()
    } catch (error) {
      console.error("Error sending email:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to send email"
      toast.error(errorMessage)
      fetchScheduledEmails() // Refresh to show updated status
    } finally {
      setSendingId(null)
    }
  }

  const editScheduledEmail = (email: ScheduledEmail) => {
    // Store the scheduled email data in sessionStorage for the compose page to pick up
    sessionStorage.setItem('editScheduledEmail', JSON.stringify({
      id: email.$id,
      subject: email.subject,
      content: email.content,
      recipients: email.recipients,
      scheduled_at: email.scheduled_at,
      attachments: email.attachments,
    }))
    router.push('/compose?edit=scheduled')
  }

  const getStatusBadge = (email: ScheduledEmail) => {
    switch (email.status) {
      case 'pending':
        if (isPast(new Date(email.scheduled_at))) {
          return <Badge variant="default" className="flex items-center gap-1"><Send className="h-3 w-3" /> Ready to Send</Badge>
        }
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Queued</Badge>
      case 'sending':
        return <Badge variant="info" className="flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> Sending</Badge>
      case 'sent':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Sent</Badge>
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="flex items-center gap-1"><Pause className="h-3 w-3" /> Cancelled</Badge>
      default:
        return null
    }
  }

  if (status === "loading" || !isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading draft emails...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") return null

  const pendingEmails = scheduledEmails.filter(e => e.status === 'pending')
  const completedEmails = scheduledEmails.filter(e => ['sent', 'failed', 'cancelled'].includes(e.status))

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Draft Emails</h1>
            <p className="text-muted-foreground">Save emails for later and send when ready</p>
          </div>
          <Button asChild>
            <Link href="/compose">
              <Send className="h-4 w-4 mr-2" />
              Create New Email
            </Link>
          </Button>
        </div>

        {/* Info Banner */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Manual Sending Required</p>
                <p className="text-sm text-muted-foreground">Drafts need to be sent manually. Click "Send Now" when you're ready to send.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingEmails.length}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{scheduledEmails.filter(e => e.status === 'sent').length}</p>
                  <p className="text-sm text-muted-foreground">Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{scheduledEmails.filter(e => e.status === 'failed').length}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Pause className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{scheduledEmails.filter(e => e.status === 'cancelled').length}</p>
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Emails */}
        {pendingEmails.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Ready to Send
            </h2>
            <div className="space-y-4">
              {pendingEmails.map(email => (
                <Card key={email.$id} className="group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(email)}
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(email.scheduled_at), { addSuffix: true })}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg mb-1 truncate">{email.subject}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(email.scheduled_at), 'PPP p')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {email.recipients.length} recipients
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewEmail(email)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => editScheduledEmail(email)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => sendNow(email)}
                            disabled={sendingId === email.$id}
                          >
                            {sendingId === email.$id ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 mr-2" />
                            )}
                            {sendingId === email.$id ? 'Sending...' : 'Send Now'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => cancelScheduledEmail(email.$id!)}
                            className="text-warning"
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Scheduled Email</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this scheduled email? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteScheduledEmail(email.$id!)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Emails */}
        {completedEmails.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              History
            </h2>
            <div className="space-y-3">
              {completedEmails.map(email => (
                <Card key={email.$id} className="opacity-75 hover:opacity-100 transition-opacity">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {getStatusBadge(email)}
                        <span className="font-medium truncate">{email.subject}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-shrink-0">
                        <span>{email.recipients.length} recipients</span>
                        <span>{format(new Date(email.scheduled_at), 'PP')}</span>
                        <Button variant="ghost" size="icon-sm" onClick={() => setPreviewEmail(email)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {email.status === 'failed' && email.error && (
                      <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive">
                        Error: {email.error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {scheduledEmails.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No drafts yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Save emails as drafts and send them when you're ready
                </p>
                <Button asChild>
                  <Link href="/compose">
                    <Send className="h-4 w-4 mr-2" />
                    Create New Email
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Preview Dialog */}
      <Dialog open={!!previewEmail} onOpenChange={() => setPreviewEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Scheduled for {previewEmail && format(new Date(previewEmail.scheduled_at), 'PPP p')}
            </DialogDescription>
          </DialogHeader>
          {previewEmail && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">Subject</p>
                <p className="font-medium">{previewEmail.subject}</p>
              </div>
              <div className="border rounded-lg p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">Recipients ({previewEmail.recipients.length})</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {previewEmail.recipients.slice(0, 10).map((email, i) => (
                    <Badge key={i} variant="secondary">{email}</Badge>
                  ))}
                  {previewEmail.recipients.length > 10 && (
                    <Badge variant="outline">+{previewEmail.recipients.length - 10} more</Badge>
                  )}
                </div>
              </div>
              <div className="border rounded-lg p-4 bg-white dark:bg-zinc-900">
                <p className="text-sm text-muted-foreground mb-2">Content</p>
                <div 
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewEmail.content }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
