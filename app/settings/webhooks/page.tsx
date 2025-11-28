"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navbar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Webhook,
  Plus,
  Trash2,
  Edit,
  MoreVertical,
  ArrowLeft,
  Check,
  Globe,
  Key,
  Clock,
  Power,
  PowerOff,
} from "lucide-react"
import { webhooksService, type Webhook as WebhookType } from "@/lib/appwrite"
import { toast } from "sonner"
import { format, formatDistanceToNow } from "date-fns"

const EVENT_TYPES = [
  { value: 'campaign.sent', label: 'Campaign Sent', description: 'When a campaign is successfully sent' },
  { value: 'campaign.failed', label: 'Campaign Failed', description: 'When a campaign fails to send' },
  { value: 'email.opened', label: 'Email Opened', description: 'When a recipient opens an email' },
  { value: 'email.clicked', label: 'Link Clicked', description: 'When a recipient clicks a link' },
  { value: 'email.bounced', label: 'Email Bounced', description: 'When an email bounces' },
] as const

export default function WebhooksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [webhooks, setWebhooks] = useState<WebhookType[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [newWebhook, setNewWebhook] = useState({
    name: "",
    url: "",
    events: [] as WebhookType['events'],
    secret: "",
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  const fetchWebhooks = useCallback(async () => {
    if (!session?.user?.email) return
    
    try {
      const response = await webhooksService.listByUser(session.user.email)
      setWebhooks(response.documents)
    } catch (error) {
      console.error("Error fetching webhooks:", error)
      toast.error("Failed to load webhooks")
    }
  }, [session?.user?.email])

  useEffect(() => {
    if (!session?.user?.email) return
    fetchWebhooks()
  }, [session?.user?.email, fetchWebhooks])

  const generateSecret = () => {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  const toggleEvent = (event: WebhookType['events'][number]) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }))
  }

  const toggleEditEvent = (event: WebhookType['events'][number]) => {
    if (!editingWebhook) return
    setEditingWebhook(prev => prev ? ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }) : null)
  }

  const createWebhook = async () => {
    if (!session?.user?.email || !newWebhook.name.trim() || !newWebhook.url.trim() || newWebhook.events.length === 0) return
    
    // Validate URL
    try {
      new URL(newWebhook.url)
    } catch {
      toast.error("Please enter a valid URL")
      return
    }
    
    setIsLoading(true)
    try {
      await webhooksService.create({
        name: newWebhook.name.trim(),
        url: newWebhook.url.trim(),
        events: newWebhook.events,
        is_active: true,
        secret: newWebhook.secret.trim() || undefined,
        user_email: session.user.email,
      })
      
      setNewWebhook({ name: "", url: "", events: [], secret: "" })
      setShowCreateDialog(false)
      toast.success("Webhook created!")
      fetchWebhooks()
    } catch (error) {
      console.error("Error creating webhook:", error)
      toast.error("Failed to create webhook")
    }
    setIsLoading(false)
  }

  const updateWebhook = async () => {
    if (!editingWebhook?.$id) return
    
    setIsLoading(true)
    try {
      await webhooksService.update(editingWebhook.$id, {
        name: editingWebhook.name,
        url: editingWebhook.url,
        events: editingWebhook.events,
        is_active: editingWebhook.is_active,
        secret: editingWebhook.secret,
      })
      
      setShowEditDialog(false)
      setEditingWebhook(null)
      toast.success("Webhook updated!")
      fetchWebhooks()
    } catch (error) {
      console.error("Error updating webhook:", error)
      toast.error("Failed to update webhook")
    }
    setIsLoading(false)
  }

  const toggleWebhookActive = async (webhookId: string, isActive: boolean) => {
    try {
      await webhooksService.update(webhookId, { is_active: !isActive })
      toast.success(isActive ? "Webhook disabled" : "Webhook enabled")
      fetchWebhooks()
    } catch (error) {
      console.error("Error toggling webhook:", error)
      toast.error("Failed to update webhook")
    }
  }

  const deleteWebhook = async (webhookId: string) => {
    try {
      await webhooksService.delete(webhookId)
      toast.success("Webhook deleted")
      fetchWebhooks()
    } catch (error) {
      console.error("Error deleting webhook:", error)
      toast.error("Failed to delete webhook")
    }
  }

  if (status === "loading" || !isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading webhooks...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") return null

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Webhooks</h1>
            <p className="text-muted-foreground">Send campaign events to external services</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Webhook</DialogTitle>
                <DialogDescription>
                  Send HTTP POST requests when events occur
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Slack Notification"
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">Webhook URL *</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://your-service.com/webhook"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Events *</Label>
                  <div className="space-y-2">
                    {EVENT_TYPES.map(event => (
                      <label
                        key={event.value}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          newWebhook.events.includes(event.value as any)
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={newWebhook.events.includes(event.value as any)}
                          onChange={() => toggleEvent(event.value as any)}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-medium">{event.label}</p>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="secret">Secret (optional)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewWebhook({ ...newWebhook, secret: generateSecret() })}
                    >
                      Generate
                    </Button>
                  </div>
                  <Input
                    id="secret"
                    placeholder="Used to sign webhook payloads"
                    value={newWebhook.secret}
                    onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    If set, payloads will be signed with HMAC-SHA256 in the X-EchoMail-Signature header
                  </p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={createWebhook} 
                    disabled={isLoading || !newWebhook.name.trim() || !newWebhook.url.trim() || newWebhook.events.length === 0}
                    className="flex-1"
                  >
                    Create Webhook
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Webhooks List */}
        {webhooks.length > 0 ? (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <Card key={webhook.$id} className="group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{webhook.name}</h3>
                        {webhook.is_active ? (
                          <Badge variant="success" className="flex items-center gap-1">
                            <Power className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <PowerOff className="h-3 w-3" />
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Globe className="h-4 w-4" />
                        <span className="truncate">{webhook.url}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {webhook.events.map(event => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {EVENT_TYPES.find(e => e.value === event)?.label || event}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {webhook.secret && (
                          <span className="flex items-center gap-1">
                            <Key className="h-3 w-3" />
                            Signed
                          </span>
                        )}
                        {webhook.last_triggered_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last triggered {formatDistanceToNow(new Date(webhook.last_triggered_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingWebhook(webhook)
                          setShowEditDialog(true)
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleWebhookActive(webhook.$id!, webhook.is_active)}>
                          {webhook.is_active ? (
                            <>
                              <PowerOff className="h-4 w-4 mr-2" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Power className="h-4 w-4 mr-2" />
                              Enable
                            </>
                          )}
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{webhook.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteWebhook(webhook.$id!)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        ) : (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Webhook className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No webhooks yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Create webhooks to send campaign events to external services
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Webhook
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="mt-8 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">🔗 Webhook Payload Format</h3>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
{`{
  "event": "campaign.sent",
  "timestamp": "2025-11-28T10:30:00Z",
  "payload": {
    "campaign_id": "abc123",
    "subject": "Newsletter",
    "recipients": 100,
    "sent": 98,
    "failed": 2
  }
}`}
            </pre>
          </CardContent>
        </Card>
      </main>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Webhook</DialogTitle>
            <DialogDescription>
              Update your webhook configuration
            </DialogDescription>
          </DialogHeader>
          {editingWebhook && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={editingWebhook.name}
                  onChange={(e) => setEditingWebhook({ ...editingWebhook, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Webhook URL *</Label>
                <Input
                  type="url"
                  value={editingWebhook.url}
                  onChange={(e) => setEditingWebhook({ ...editingWebhook, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Events *</Label>
                <div className="space-y-2">
                  {EVENT_TYPES.map(event => (
                    <label
                      key={event.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        editingWebhook.events.includes(event.value as any)
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={editingWebhook.events.includes(event.value as any)}
                        onChange={() => toggleEditEvent(event.value as any)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium">{event.label}</p>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secret</Label>
                <Input
                  value={editingWebhook.secret || ''}
                  onChange={(e) => setEditingWebhook({ ...editingWebhook, secret: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={updateWebhook} 
                  disabled={isLoading || !editingWebhook.name.trim() || !editingWebhook.url.trim() || editingWebhook.events.length === 0}
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowEditDialog(false)
                  setEditingWebhook(null)
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
