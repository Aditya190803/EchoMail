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
import { RichTextEditor } from "@/components/rich-text-editor"
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
  Pen,
  Plus,
  Trash2,
  Edit,
  MoreVertical,
  Star,
  Check,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import { signaturesService, type EmailSignature } from "@/lib/appwrite"
import { toast } from "sonner"

export default function SignaturesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [signatures, setSignatures] = useState<EmailSignature[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingSignature, setEditingSignature] = useState<EmailSignature | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [newSignature, setNewSignature] = useState({
    name: "",
    content: "",
    is_default: false,
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  const fetchSignatures = useCallback(async () => {
    if (!session?.user?.email) return
    
    try {
      const response = await signaturesService.listByUser(session.user.email)
      setSignatures(response.documents)
    } catch (error) {
      console.error("Error fetching signatures:", error)
      toast.error("Failed to load signatures")
    }
  }, [session?.user?.email])

  useEffect(() => {
    if (!session?.user?.email) return
    fetchSignatures()
  }, [session?.user?.email, fetchSignatures])

  const createSignature = async () => {
    if (!session?.user?.email || !newSignature.name.trim() || !newSignature.content.trim()) return
    
    setIsLoading(true)
    try {
      await signaturesService.create({
        name: newSignature.name.trim(),
        content: newSignature.content,
        is_default: newSignature.is_default,
      })
      
      setNewSignature({ name: "", content: "", is_default: false })
      setShowCreateDialog(false)
      toast.success("Signature created!")
      fetchSignatures()
    } catch (error) {
      console.error("Error creating signature:", error)
      toast.error("Failed to create signature")
    }
    setIsLoading(false)
  }

  const updateSignature = async () => {
    if (!editingSignature?.$id) return
    
    setIsLoading(true)
    try {
      await signaturesService.update(editingSignature.$id, {
        name: editingSignature.name,
        content: editingSignature.content,
        is_default: editingSignature.is_default,
      })
      
      setShowEditDialog(false)
      setEditingSignature(null)
      toast.success("Signature updated!")
      fetchSignatures()
    } catch (error) {
      console.error("Error updating signature:", error)
      toast.error("Failed to update signature")
    }
    setIsLoading(false)
  }

  const deleteSignature = async (signatureId: string) => {
    try {
      await signaturesService.delete(signatureId)
      toast.success("Signature deleted")
      fetchSignatures()
    } catch (error) {
      console.error("Error deleting signature:", error)
      toast.error("Failed to delete signature")
    }
  }

  const setAsDefault = async (signatureId: string) => {
    if (!session?.user?.email) return
    
    try {
      await signaturesService.setAsDefault(session.user.email, signatureId)
      toast.success("Default signature updated")
      fetchSignatures()
    } catch (error) {
      console.error("Error setting default:", error)
      toast.error("Failed to set default signature")
    }
  }

  if (status === "loading" || !isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading signatures...</p>
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
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Email Signatures</h1>
            <p className="text-muted-foreground">Create and manage your email signatures</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Signature
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Signature</DialogTitle>
                <DialogDescription>
                  Create a reusable email signature. The name is for your reference only — only the content below will be added to your emails.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Signature Name *</Label>
                  <p className="text-xs text-muted-foreground">This name is just for identification and won't appear in your emails</p>
                  <Input
                    id="name"
                    placeholder="e.g., Professional, Casual"
                    value={newSignature.name}
                    onChange={(e) => setNewSignature({ ...newSignature, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Signature Content</Label>
                  <RichTextEditor
                    content={newSignature.content}
                    onChange={(content) => setNewSignature({ ...newSignature, content })}
                    placeholder="Enter your signature..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-default"
                    checked={newSignature.is_default}
                    onChange={(e) => setNewSignature({ ...newSignature, is_default: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <Label htmlFor="is-default" className="cursor-pointer">
                    Set as default signature
                  </Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={createSignature} 
                    disabled={isLoading || !newSignature.name.trim() || !newSignature.content.trim()}
                    className="flex-1"
                  >
                    Create Signature
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Signatures List */}
        {signatures.length > 0 ? (
          <div className="space-y-4">
            {signatures.map((signature) => (
              <Card key={signature.$id} className="group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{signature.name}</h3>
                        {signature.is_default && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <div 
                        className="text-sm text-muted-foreground prose-sm max-h-24 overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: signature.content }}
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingSignature(signature)
                          setShowEditDialog(true)
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {!signature.is_default && (
                          <DropdownMenuItem onClick={() => setAsDefault(signature.$id!)}>
                            <Star className="h-4 w-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
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
                              <AlertDialogTitle>Delete Signature</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{signature.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteSignature(signature.$id!)}
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
                  <Pen className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No signatures yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Create email signatures to quickly add to your emails
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Signature
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card className="mt-8 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">💡 Signature Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Include your name, title, and contact information</li>
              <li>• Keep it concise - 3-5 lines is ideal</li>
              <li>• Add links to your social profiles or website</li>
              <li>• Set a default signature to automatically add it to all emails</li>
            </ul>
          </CardContent>
        </Card>
      </main>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Signature</DialogTitle>
            <DialogDescription>
              Update your email signature. The name is for your reference only — only the content below will be added to your emails.
            </DialogDescription>
          </DialogHeader>
          {editingSignature && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Signature Name *</Label>
                <p className="text-xs text-muted-foreground">This name is just for identification and won't appear in your emails</p>
                <Input
                  value={editingSignature.name}
                  onChange={(e) => setEditingSignature({ ...editingSignature, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Signature Content</Label>
                <RichTextEditor
                  content={editingSignature.content}
                  onChange={(content) => setEditingSignature({ ...editingSignature, content })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-is-default"
                  checked={editingSignature.is_default}
                  onChange={(e) => setEditingSignature({ ...editingSignature, is_default: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <Label htmlFor="edit-is-default" className="cursor-pointer">
                  Set as default signature
                </Label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={updateSignature} 
                  disabled={isLoading || !editingSignature.name.trim() || !editingSignature.content.trim()}
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowEditDialog(false)
                  setEditingSignature(null)
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
