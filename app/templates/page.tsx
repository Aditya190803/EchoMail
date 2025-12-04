"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor } from "@/components/rich-text-editor";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Sparkles,
} from "lucide-react";
import {
  templatesService,
  type EmailTemplate,
  type TemplateVersion,
} from "@/lib/appwrite";
import { toast } from "sonner";
import { componentLogger } from "@/lib/client-logger";
import { History, RotateCcw } from "lucide-react";

const TEMPLATE_CATEGORIES = [
  { value: "marketing", label: "Marketing", color: "bg-blue-500" },
  { value: "newsletter", label: "Newsletter", color: "bg-green-500" },
  { value: "transactional", label: "Transactional", color: "bg-purple-500" },
  { value: "announcement", label: "Announcement", color: "bg-orange-500" },
  { value: "personal", label: "Personal", color: "bg-pink-500" },
  { value: "other", label: "Other", color: "bg-gray-500" },
];

// Default templates that users can quickly add
const DEFAULT_TEMPLATES = [
  {
    name: "Welcome Email",
    subject: "Welcome to {{company}}, {{name}}! 🎉",
    content: `<p>Hi {{name}},</p>
<p>Welcome aboard! We're thrilled to have you join us.</p>
<p>Here's what you can do next:</p>
<ul>
<li>Explore our features</li>
<li>Set up your profile</li>
<li>Connect with our community</li>
</ul>
<p>If you have any questions, just reply to this email — we're here to help!</p>
<p>Best regards,<br/>The {{company}} Team</p>`,
    category: "transactional",
    icon: "👋",
  },
  {
    name: "Thank You",
    subject: "Thank you, {{name}}!",
    content: `<p>Dear {{name}},</p>
<p>Thank you so much for your support! We truly appreciate it.</p>
<p>Your trust means the world to us, and we're committed to delivering the best experience possible.</p>
<p>Warm regards,<br/>{{sender_name}}</p>`,
    category: "personal",
    icon: "🙏",
  },
  {
    name: "Meeting Request",
    subject: "Meeting Request: {{topic}}",
    content: `<p>Hi {{name}},</p>
<p>I hope this email finds you well.</p>
<p>I'd like to schedule a meeting to discuss <strong>{{topic}}</strong>. Would any of the following times work for you?</p>
<ul>
<li>Option 1: {{date_option_1}}</li>
<li>Option 2: {{date_option_2}}</li>
</ul>
<p>Please let me know what works best for you, or suggest an alternative time.</p>
<p>Looking forward to connecting!</p>
<p>Best,<br/>{{sender_name}}</p>`,
    category: "personal",
    icon: "📅",
  },
  {
    name: "Event Invitation",
    subject: "You're Invited: {{event_name}}",
    content: `<p>Dear {{name}},</p>
<p>We're excited to invite you to <strong>{{event_name}}</strong>!</p>
<p><strong>📅 Date:</strong> {{event_date}}<br/>
<strong>🕐 Time:</strong> {{event_time}}<br/>
<strong>📍 Location:</strong> {{event_location}}</p>
<p>This is a great opportunity to {{event_benefit}}.</p>
<p>Please RSVP by {{rsvp_date}} to confirm your attendance.</p>
<p>We hope to see you there!</p>
<p>Best regards,<br/>{{organizer_name}}</p>`,
    category: "announcement",
    icon: "🎪",
  },
  {
    name: "Newsletter",
    subject: "{{newsletter_title}} - {{month}} Update",
    content: `<p>Hi {{name}},</p>
<p>Here's what's new this month:</p>
<h3>📰 Headlines</h3>
<p>{{headline_1}}</p>
<h3>✨ Featured</h3>
<p>{{featured_content}}</p>
<h3>📅 Upcoming</h3>
<p>{{upcoming_events}}</p>
<p>Thanks for being part of our community!</p>
<p>— The Team</p>`,
    category: "newsletter",
    icon: "📰",
  },
  {
    name: "Follow-up",
    subject: "Following up: {{topic}}",
    content: `<p>Hi {{name}},</p>
<p>I wanted to follow up on our previous conversation about <strong>{{topic}}</strong>.</p>
<p>Have you had a chance to think about it? I'd love to hear your thoughts or answer any questions you might have.</p>
<p>Looking forward to your response!</p>
<p>Best,<br/>{{sender_name}}</p>`,
    category: "personal",
    icon: "🔄",
  },
  {
    name: "Feedback Request",
    subject: "We'd love your feedback, {{name}}!",
    content: `<p>Hi {{name}},</p>
<p>We hope you've been enjoying {{product_or_service}}!</p>
<p>Your feedback is incredibly valuable to us. Would you take a moment to share your thoughts?</p>
<p><strong>Quick questions:</strong></p>
<ul>
<li>What do you like most?</li>
<li>What could we improve?</li>
<li>Would you recommend us to others?</li>
</ul>
<p>Simply reply to this email with your feedback — we read every response!</p>
<p>Thank you for your time,<br/>{{company}} Team</p>`,
    category: "marketing",
    icon: "💬",
  },
  {
    name: "Announcement",
    subject: "📢 Important Update: {{announcement_title}}",
    content: `<p>Dear {{name}},</p>
<p>We have some exciting news to share with you!</p>
<p><strong>{{announcement_title}}</strong></p>
<p>{{announcement_details}}</p>
<p><strong>What this means for you:</strong></p>
<ul>
<li>{{benefit_1}}</li>
<li>{{benefit_2}}</li>
<li>{{benefit_3}}</li>
</ul>
<p>If you have any questions, please don't hesitate to reach out.</p>
<p>Best regards,<br/>{{sender_name}}</p>`,
    category: "announcement",
    icon: "📢",
  },
  {
    name: "Certificate Delivery",
    subject: "🎓 Your Certificate: {{certificate_name}}",
    content: `<p>Dear {{name}},</p>
<p>Congratulations on completing <strong>{{course_or_event}}</strong>! 🎉</p>
<p>Please find your certificate attached to this email.</p>
<p>This is a well-deserved achievement, and we're proud of your accomplishment.</p>
<p>Keep up the great work!</p>
<p>Best wishes,<br/>{{organizer_name}}</p>`,
    category: "transactional",
    icon: "🎓",
  },
  {
    name: "Reminder",
    subject: "⏰ Reminder: {{reminder_subject}}",
    content: `<p>Hi {{name}},</p>
<p>This is a friendly reminder about <strong>{{reminder_subject}}</strong>.</p>
<p><strong>Details:</strong></p>
<ul>
<li>📅 Date: {{date}}</li>
<li>🕐 Time: {{time}}</li>
<li>📍 Location/Link: {{location}}</li>
</ul>
<p>Please make sure to {{action_required}}.</p>
<p>See you soon!</p>
<p>Best,<br/>{{sender_name}}</p>`,
    category: "transactional",
    icon: "⏰",
  },
];

export default function TemplatesPage() {
  const { session, status, router } = useAuthGuard();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(
    null,
  );
  const [showVersionsDialog, setShowVersionsDialog] = useState(false);
  const [versioningTemplate, setVersioningTemplate] =
    useState<EmailTemplate | null>(null);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [saveVersion, setSaveVersion] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    subject: "",
    content: "",
    category: "other",
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatDate = (dateValue: string) => {
    if (!isMounted) return "";
    try {
      return new Date(dateValue).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!session?.user?.email) return;

    try {
      const response = await templatesService.listByUser(session.user.email);
      const templatesData = response.documents.map((doc) => ({
        $id: doc.$id,
        name: (doc as any).name,
        subject: (doc as any).subject,
        content: (doc as any).content,
        category: (doc as any).category,
        user_email: (doc as any).user_email,
        created_at: (doc as any).created_at,
        updated_at: (doc as any).updated_at,
      })) as EmailTemplate[];

      setTemplates(templatesData);
    } catch (error) {
      componentLogger.error(
        "Error fetching templates",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to load templates");
    }
  }, [session?.user?.email]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    if (!session?.user?.email) return;

    const loadData = async () => {
      await fetchTemplates();
      setIsLoadingData(false);
    };
    loadData();

    const unsubscribe = templatesService.subscribeToUserTemplates(
      session.user.email,
      () => fetchTemplates(),
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [session?.user?.email, fetchTemplates]);

  const createTemplate = async () => {
    if (
      !session?.user?.email ||
      !newTemplate.name.trim() ||
      !newTemplate.subject.trim()
    )
      return;

    // Create an optimistic template with a temporary ID
    const tempId = `temp-${Date.now()}`;
    const optimisticTemplate: EmailTemplate = {
      $id: tempId,
      name: newTemplate.name.trim(),
      subject: newTemplate.subject.trim(),
      content: newTemplate.content,
      category: newTemplate.category,
      user_email: session.user.email,
      created_at: new Date().toISOString(),
    };

    // Optimistically update UI
    setTemplates((prev) => [optimisticTemplate, ...prev]);
    setNewTemplate({ name: "", subject: "", content: "", category: "other" });
    setShowCreateDialog(false);
    toast.success("Template created successfully!");

    try {
      await templatesService.create({
        name: optimisticTemplate.name,
        subject: optimisticTemplate.subject,
        content: optimisticTemplate.content,
        category: optimisticTemplate.category,
        user_email: session.user.email,
      });

      // Refetch to get actual ID
      fetchTemplates();
    } catch (error) {
      // Revert on error
      setTemplates((prev) => prev.filter((t) => t.$id !== tempId));
      componentLogger.error(
        "Error creating template",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to create template - changes reverted");
    }
  };

  // Add a default template to user's collection
  const addDefaultTemplate = async (
    defaultTemplate: (typeof DEFAULT_TEMPLATES)[0],
  ) => {
    if (!session?.user?.email) return;

    try {
      await templatesService.create({
        name: defaultTemplate.name,
        subject: defaultTemplate.subject,
        content: defaultTemplate.content,
        category: defaultTemplate.category,
        user_email: session.user.email,
      });

      toast.success(`"${defaultTemplate.name}" template added!`);
      fetchTemplates();
    } catch (error) {
      componentLogger.error(
        "Error adding default template",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to add template");
    }
  };

  // Add all default templates
  const addAllDefaultTemplates = async () => {
    if (!session?.user?.email) return;

    setIsLoading(true);
    try {
      // Filter out templates that already exist (by name)
      const existingNames = templates.map((t) => t.name.toLowerCase());
      const templatesToAdd = DEFAULT_TEMPLATES.filter(
        (dt) => !existingNames.includes(dt.name.toLowerCase()),
      );

      if (templatesToAdd.length === 0) {
        toast.info("All starter templates are already in your collection!");
        setIsLoading(false);
        return;
      }

      const toastId = toast.loading(
        `Adding ${templatesToAdd.length} starter templates...`,
      );
      let addedCount = 0;

      for (const defaultTemplate of templatesToAdd) {
        await templatesService.create({
          name: defaultTemplate.name,
          subject: defaultTemplate.subject,
          content: defaultTemplate.content,
          category: defaultTemplate.category,
          user_email: session.user.email,
        });
        addedCount++;
        toast.loading(
          `Adding templates... (${addedCount}/${templatesToAdd.length})`,
          { id: toastId },
        );
      }

      toast.success(`Added ${templatesToAdd.length} starter templates!`, {
        id: toastId,
      });
      fetchTemplates();
    } catch (error) {
      componentLogger.error(
        "Error adding default templates",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to add some templates");
    }
    setIsLoading(false);
  };

  // Apply a default template directly (without saving)
  const applyDefaultTemplate = (
    defaultTemplate: (typeof DEFAULT_TEMPLATES)[0],
  ) => {
    sessionStorage.setItem(
      "selectedTemplate",
      JSON.stringify({
        subject: defaultTemplate.subject,
        content: defaultTemplate.content,
      }),
    );
    router.push("/compose");
    toast.success("Template loaded in composer");
  };

  const updateTemplate = async () => {
    if (!editingTemplate?.$id) return;

    setIsLoading(true);
    try {
      await templatesService.update(editingTemplate.$id, {
        name: editingTemplate.name,
        subject: editingTemplate.subject,
        content: editingTemplate.content,
        category: editingTemplate.category,
        saveVersion,
        changeNote: changeNote.trim() || undefined,
      });

      setShowEditDialog(false);
      setEditingTemplate(null);
      setSaveVersion(false);
      setChangeNote("");
      toast.success(
        saveVersion ? "Template updated (version saved)" : "Template updated!",
      );
      fetchTemplates();
    } catch (error) {
      componentLogger.error(
        "Error updating template",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to update template");
    }
    setIsLoading(false);
  };

  const deleteTemplate = async (templateId: string) => {
    // Store for potential rollback
    const templateToDelete = templates.find((t) => t.$id === templateId);
    if (!templateToDelete) return;

    // Optimistically remove from UI
    setTemplates((prev) => prev.filter((t) => t.$id !== templateId));
    toast.success("Template deleted");

    try {
      await templatesService.delete(templateId);
      // Real-time subscription will handle sync
    } catch (error) {
      // Revert on error
      setTemplates((prev) => [...prev, templateToDelete]);
      componentLogger.error(
        "Error deleting template",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to delete template - restored");
    }
  };

  const duplicateTemplate = async (template: EmailTemplate) => {
    if (!session?.user?.email) return;

    try {
      await templatesService.create({
        name: `${template.name} (Copy)`,
        subject: template.subject,
        content: template.content,
        category: template.category,
        user_email: session.user.email,
      });

      toast.success("Template duplicated!");
      fetchTemplates();
    } catch (error) {
      componentLogger.error(
        "Error duplicating template",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to duplicate template");
    }
  };

  const applyTemplate = (template: EmailTemplate) => {
    // Store template in sessionStorage and redirect to compose
    sessionStorage.setItem(
      "selectedTemplate",
      JSON.stringify({
        subject: template.subject,
        content: template.content,
      }),
    );
    router.push("/compose");
    toast.success("Template loaded in composer");
  };

  // Fetch version history for a template
  const fetchVersions = async (template: EmailTemplate) => {
    if (!template.$id) return;

    setIsLoadingVersions(true);
    setVersioningTemplate(template);
    setShowVersionsDialog(true);

    try {
      const response = await templatesService.getVersions(template.$id);
      setVersions(response.documents as unknown as TemplateVersion[]);
    } catch (error) {
      componentLogger.error(
        "Error fetching template versions",
        error instanceof Error ? error : undefined,
      );
      // Collection might not exist yet
      setVersions([]);
    }
    setIsLoadingVersions(false);
  };

  // Restore a previous version
  const restoreVersion = async (version: TemplateVersion) => {
    if (!versioningTemplate?.$id) return;

    setIsLoading(true);
    try {
      await templatesService.restoreVersion(
        versioningTemplate.$id,
        version.$id!,
      );
      toast.success(`Restored to version ${version.version}`);
      setShowVersionsDialog(false);
      setVersioningTemplate(null);
      fetchTemplates();
    } catch (error) {
      componentLogger.error(
        "Error restoring template version",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to restore version");
    }
    setIsLoading(false);
  };

  const getCategoryInfo = (category?: string) => {
    return (
      TEMPLATE_CATEGORIES.find((c) => c.value === category) ||
      TEMPLATE_CATEGORIES[5]
    );
  };

  // Filter templates - must be before usePagination hook
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        !selectedCategory || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchTerm, selectedCategory]);

  // Use pagination hook for templates - must be called unconditionally before any early returns
  const {
    paginatedItems: paginatedTemplates,
    currentPage,
    totalPages,
    pageSize,
    setPageSize,
    goToPage,
    hasPreviousPage,
    hasNextPage,
  } = usePagination(filteredTemplates, { pageSize: 12, initialPage: 1 });

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
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Email Templates
            </h1>
            <p className="text-muted-foreground">
              Create and manage reusable email templates
            </p>
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
                      onChange={(e) =>
                        setNewTemplate({ ...newTemplate, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      value={newTemplate.category}
                      onChange={(e) =>
                        setNewTemplate({
                          ...newTemplate,
                          category: e.target.value,
                        })
                      }
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {TEMPLATE_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
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
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        subject: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{{name}}"}, {"{{email}}"}, etc. for personalization
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Email Content</Label>
                  <RichTextEditor
                    content={newTemplate.content}
                    onChange={(content) =>
                      setNewTemplate({ ...newTemplate, content })
                    }
                    placeholder="Compose your template content..."
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={createTemplate}
                    disabled={
                      isLoading ||
                      !newTemplate.name.trim() ||
                      !newTemplate.subject.trim()
                    }
                    className="flex-1"
                  >
                    Create Template
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
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
            {TEMPLATE_CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant={
                  selectedCategory === cat.value ? "secondary" : "outline"
                }
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
                Showing {paginatedTemplates.length} of{" "}
                {filteredTemplates.length} templates
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedTemplates.map((template) => {
                const categoryInfo = getCategoryInfo(template.category);
                return (
                  <Card
                    key={template.$id}
                    hover
                    className="group flex flex-col"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="secondary"
                              className="text-xs"
                              style={{
                                backgroundColor: categoryInfo.color.replace(
                                  "bg-",
                                  "",
                                ),
                              }}
                            >
                              {categoryInfo.label}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg truncate">
                            {template.name}
                          </CardTitle>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="opacity-0 group-hover:opacity-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => applyTemplate(template)}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Use Template
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingTemplate(template);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => duplicateTemplate(template)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => fetchVersions(template)}
                            >
                              <History className="h-4 w-4 mr-2" />
                              Version History
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
                                  <AlertDialogTitle>
                                    Delete Template
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "
                                    {template.name}"? This action cannot be
                                    undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      deleteTemplate(template.$id!)
                                    }
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
                          <span className="truncate text-muted-foreground">
                            {template.subject}
                          </span>
                        </div>
                        <div
                          className="text-sm text-muted-foreground line-clamp-3 prose-sm"
                          dangerouslySetInnerHTML={{
                            __html:
                              template.content
                                ?.replace(/<[^>]*>/g, " ")
                                .slice(0, 150) || "No content",
                          }}
                        />
                      </div>
                    </CardContent>
                    <div className="px-6 pb-4 pt-2 border-t mt-auto">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(
                            template.updated_at || template.created_at || "",
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => applyTemplate(template)}
                        >
                          Use
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredTemplates.length}
                  hasPreviousPage={hasPreviousPage}
                  hasNextPage={hasNextPage}
                  onPageChange={goToPage}
                  onPageSizeChange={setPageSize}
                  getPageNumbers={() =>
                    Array.from({ length: totalPages }, (_, i) => i + 1)
                  }
                  startIndex={(currentPage - 1) * pageSize}
                  endIndex={Math.min(
                    currentPage * pageSize - 1,
                    filteredTemplates.length - 1,
                  )}
                />
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm || selectedCategory
                    ? "No templates found"
                    : "No templates yet"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  {searchTerm || selectedCategory
                    ? "Try adjusting your search or filter"
                    : "Create your first email template to speed up your workflow"}
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

        {/* Starter Templates Section */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Starter Templates
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Quick-start templates with placeholders for personalization
              </p>
            </div>
            <Button
              variant="outline"
              onClick={addAllDefaultTemplates}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add All to My Templates
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {DEFAULT_TEMPLATES.map((template, index) => {
              const categoryInfo = getCategoryInfo(template.category);
              const isAlreadyAdded = templates.some(
                (t) => t.name.toLowerCase() === template.name.toLowerCase(),
              );

              return (
                <Card
                  key={index}
                  className={`group transition-all hover:shadow-md ${
                    isAlreadyAdded ? "opacity-60" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{template.icon}</span>
                        <div>
                          <h3 className="font-medium text-sm">
                            {template.name}
                          </h3>
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {categoryInfo.label}
                          </Badge>
                        </div>
                      </div>
                      {isAlreadyAdded && (
                        <Badge variant="secondary" className="text-[10px]">
                          Added
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {template.subject}
                    </p>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => applyDefaultTemplate(template)}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Use
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => addDefaultTemplate(template)}
                        disabled={isAlreadyAdded}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {isAlreadyAdded ? "Added" : "Save"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Personalization hint */}
          <Card className="mt-6 bg-muted/30 border-dashed">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">
                    Personalization Placeholders
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    These templates use placeholders that get replaced with
                    actual data when sending:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "{{name}}",
                      "{{email}}",
                      "{{company}}",
                      "{{date}}",
                      "{{topic}}",
                    ].map((placeholder) => (
                      <code
                        key={placeholder}
                        className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                      >
                        {placeholder}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>Update your email template</DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    value={editingTemplate.category || "other"}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        category: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Subject *</Label>
                <Input
                  value={editingTemplate.subject}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      subject: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Email Content</Label>
                <RichTextEditor
                  content={editingTemplate.content}
                  onChange={(content) =>
                    setEditingTemplate({ ...editingTemplate, content })
                  }
                />
              </div>
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="saveVersion"
                    checked={saveVersion}
                    onChange={(e) => setSaveVersion(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label
                    htmlFor="saveVersion"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Save current version before updating (allows restoring
                    later)
                  </Label>
                </div>
                {saveVersion && (
                  <div className="space-y-2 ml-6">
                    <Label htmlFor="changeNote" className="text-sm">
                      Change note (optional)
                    </Label>
                    <Input
                      id="changeNote"
                      placeholder="e.g., Updated header styling"
                      value={changeNote}
                      onChange={(e) => setChangeNote(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={updateTemplate}
                  disabled={
                    isLoading ||
                    !editingTemplate.name.trim() ||
                    !editingTemplate.subject.trim()
                  }
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingTemplate(null);
                    setSaveVersion(false);
                    setChangeNote("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showVersionsDialog} onOpenChange={setShowVersionsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </DialogTitle>
            <DialogDescription>
              {versioningTemplate?.name} - View and restore previous versions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {isLoadingVersions ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No version history</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Version history will appear here when you save versions while
                  editing this template.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Current version indicator */}
                <div className="flex items-center gap-4 p-4 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    {versioningTemplate?.version || "?"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        Version {versioningTemplate?.version || "?"}
                      </span>
                      <Badge>Current</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Last updated{" "}
                      {formatDate(versioningTemplate?.updated_at || "")}
                    </p>
                  </div>
                </div>

                {/* Previous versions */}
                {versions.map((version) => (
                  <div
                    key={version.$id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                      {version.version}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Version {version.version}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {version.change_note ||
                          `Saved on ${formatDate(version.created_at)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Subject: {version.subject}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isLoading}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Restore Version {version.version}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will replace the current template content with
                            version {version.version}. The current version will
                            be saved to history before restoring.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => restoreVersion(version)}
                          >
                            Restore
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowVersionsDialog(false);
                setVersioningTemplate(null);
                setVersions([]);
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
