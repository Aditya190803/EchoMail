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
import { Skeleton } from "@/components/ui/skeleton"
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
  FileText,
  Plus,
  Search,
  Trash2,
  Edit,
  Copy,
  MoreVertical,
  Mail,
  Clock,
  FolderOpen,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { templatesService, type EmailTemplate } from "@/lib/appwrite"
import { toast } from "sonner"

const TEMPLATE_CATEGORIES = [
  { value: "marketing", label: "Marketing", color: "bg-blue-500" },
  { value: "newsletter", label: "Newsletter", color: "bg-green-500" },
  { value: "transactional", label: "Transactional", color: "bg-purple-500" },
  { value: "announcement", label: "Announcement", color: "bg-orange-500" },
  { value: "personal", label: "Personal", color: "bg-pink-500" },
  { value: "other", label: "Other", color: "bg-gray-500" },
]

export default function TemplatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    subject: "",
    content: "",
    category: "other",
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const formatDate = (dateValue: string) => {
    if (!isMounted) return ""
    try {
      return new Date(dateValue).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return "Invalid date"
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!session?.user?.email) return
    
    try {
      const response = await templatesService.listByUser(session.user.email)
      const templatesData = response.documents.map(doc => ({
        $id: doc.$id,
        name: (doc as any).name,
        subject: (doc as any).subject,
        content: (doc as any).content,
        category: (doc as any).category,
        user_email: (doc as any).user_email,
        created_at: (doc as any).created_at,
        updated_at: (doc as any).updated_at,
      })) as EmailTemplate[]
      
      setTemplates(templatesData)
    } catch (error) {
      console.error("Error fetching templates:", error)
      toast.error("Failed to load templates")
    }
  }, [session?.user?.email])

  // Initial fetch and real-time subscription
  useEffect(() => {
    if (!session?.user?.email) return
    
    const loadData = async () => {
      await fetchTemplates()
      setIsLoadingData(false)
    }
    loadData()
    
    const unsubscribe = templatesService.subscribeToUserTemplates(
      session.user.email,
      () => fetchTemplates()
    )
    
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [session?.user?.email, fetchTemplates])

  const createTemplate = async () => {
    if (!session?.user?.email || !newTemplate.name.trim() || !newTemplate.subject.trim()) return
    
    setIsLoading(true)
    try {
      await templatesService.create({
        name: newTemplate.name.trim(),
        subject: newTemplate.subject.trim(),
        content: newTemplate.content,
        category: newTemplate.category,
        user_email: session.user.email,
      })
      
      setNewTemplate({ name: "", subject: "", content: "", category: "other" })
      setShowCreateDialog(false)
      toast.success("Template created successfully!")
      fetchTemplates()
    } catch (error) {
      console.error("Error creating template:", error)
      toast.error("Failed to create template")
    }
    setIsLoading(false)
  }

  const updateTemplate = async () => {
    if (!editingTemplate?.$id) return
    
    setIsLoading(true)
    try {
      await templatesService.update(editingTemplate.$id, {
        name: editingTemplate.name,
        subject: editingTemplate.subject,
        content: editingTemplate.content,
        category: editingTemplate.category,
      })
      
      setShowEditDialog(false)
      setEditingTemplate(null)
      toast.success("Template updated!")
      fetchTemplates()
    } catch (error) {
      console.error("Error updating template:", error)
      toast.error("Failed to update template")
    }
    setIsLoading(false)
  }

  const deleteTemplate = async (templateId: string) => {
    try {
      await templatesService.delete(templateId)
      toast.success("Template deleted")
      fetchTemplates()
    } catch (error) {
      console.error("Error deleting template:", error)
      toast.error("Failed to delete template")
    }
  }

  const duplicateTemplate = async (template: EmailTemplate) => {
    if (!session?.user?.email) return
    
    try {
      await templatesService.create({
        name: `${template.name} (Copy)`,
        subject: template.subject,
        content: template.content,
        category: template.category,
        user_email: session.user.email,
      })
      
      toast.success("Template duplicated!")
      fetchTemplates()
    } catch (error) {
      console.error("Error duplicating template:", error)
      toast.error("Failed to duplicate template")
    }
  }

  const applyTemplate = (template: EmailTemplate) => {
    // Store template in sessionStorage and redirect to compose
    sessionStorage.setItem('selectedTemplate', JSON.stringify({
      subject: template.subject,
      content: template.content,
    }))
    router.push('/compose')
    toast.success("Template loaded in composer")
  }

  const getCategoryInfo = (category?: string) => {
    return TEMPLATE_CATEGORIES.find(c => c.value === category) || TEMPLATE_CATEGORIES[5]
  }

  if (status === "loading" || !isMounted || isLoadingData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-72" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>

          {/* Search and Filter Row */}
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-40" />
          </div>

          {/* Templates Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full mb-4" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (status === "unauthenticated") return null

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Email Templates</h1>
            <p className="text-muted-foreground">Create and manage reusable email templates</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
                <DialogDescription>
                  Create a reusable email template for your campaigns
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Welcome Email"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      value={newTemplate.category}
                      onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {TEMPLATE_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="Enter email subject line..."
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{{name}}"}, {"{{email}}"}, etc. for personalization
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Email Content</Label>
                  <RichTextEditor
                    content={newTemplate.content}
                    onChange={(content) => setNewTemplate({ ...newTemplate, content })}
                    placeholder="Compose your template content..."
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={createTemplate} 
                    disabled={isLoading || !newTemplate.name.trim() || !newTemplate.subject.trim()}
                    className="flex-1"
                  >
                    Create Template
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? "secondary" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {TEMPLATE_CATEGORIES.map(cat => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.value)}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {filteredTemplates.length} of {templates.length} templates
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const categoryInfo = getCategoryInfo(template.category)
                return (
                  <Card key={template.$id} hover className="group flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant="secondary" 
                              className="text-xs"
                              style={{ backgroundColor: categoryInfo.color.replace('bg-', '') }}
                            >
                              {categoryInfo.label}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => applyTemplate(template)}>
                              <Mail className="h-4 w-4 mr-2" />
                              Use Template
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setEditingTemplate(template)
                              setShowEditDialog(true)
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateTemplate(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
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
                                  <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{template.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteTemplate(template.$id!)}
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
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate text-muted-foreground">{template.subject}</span>
                        </div>
                        <div 
                          className="text-sm text-muted-foreground line-clamp-3 prose-sm"
                          dangerouslySetInnerHTML={{ 
                            __html: template.content?.replace(/<[^>]*>/g, ' ').slice(0, 150) || 'No content' 
                          }}
                        />
                      </div>
                    </CardContent>
                    <div className="px-6 pb-4 pt-2 border-t mt-auto">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(template.updated_at || template.created_at || '')}
                        </div>
                        <Button size="sm" onClick={() => applyTemplate(template)}>
                          Use
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm || selectedCategory ? "No templates found" : "No templates yet"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  {searchTerm || selectedCategory
                    ? "Try adjusting your search or filter"
                    : "Create your first email template to speed up your workflow"
                  }
                </p>
                {!searchTerm && !selectedCategory && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Starter Templates Card */}
        {templates.length === 0 && (
          <Card className="mt-8 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Need inspiration?</h3>
                    <p className="text-muted-foreground">
                      Use placeholders like {"{{name}}"} for personalization in your templates
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update your email template
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    value={editingTemplate.category || 'other'}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    {TEMPLATE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Subject *</Label>
                <Input
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Content</Label>
                <RichTextEditor
                  content={editingTemplate.content}
                  onChange={(content) => setEditingTemplate({ ...editingTemplate, content })}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={updateTemplate} 
                  disabled={isLoading || !editingTemplate.name.trim() || !editingTemplate.subject.trim()}
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowEditDialog(false)
                  setEditingTemplate(null)
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
