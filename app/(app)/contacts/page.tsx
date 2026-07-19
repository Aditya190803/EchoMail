"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  Users,
  Trash2,
  Mail,
  Building,
  Phone,
  Download,
  Upload,
  UserPlus,
  FolderPlus,
  Tag,
  MoreVertical,
  Edit,
  UserMinus,
  CloudDownload,
  Clock,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { ContactGroupsTab } from "@/components/contacts/contact-groups-tab";
import { ContactListTab } from "@/components/contacts/contact-list-tab";
import { ContactManagementDialogs } from "@/components/contacts/contact-management-dialogs";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useContactsData, type Contact } from "@/hooks/useContactsData";
import { useGmailContactsImport } from "@/hooks/useGmailContactsImport";
import { usePagination } from "@/hooks/usePagination";
import { useVirtualScroll } from "@/hooks/useVirtualScroll";
import {
  contactsService,
  contactGroupsService,
  type ContactGroup,
} from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

const GROUP_COLORS = [
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "pink", label: "Pink", class: "bg-pink-500" },
  { value: "red", label: "Red", class: "bg-red-500" },
  { value: "yellow", label: "Yellow", class: "bg-yellow-500" },
  { value: "gray", label: "Gray", class: "bg-gray-500" },
];

export default function ContactsPage() {
  const { session, status } = useAuthGuard();
  const {
    contacts,
    setContacts,
    groups,
    isLoadingData,
    fetchContacts,
    fetchGroups,
  } = useContactsData(session?.user?.email ?? undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [showAddToGroup, setShowAddToGroup] = useState(false);
  const [selectedContactForGroup, setSelectedContactForGroup] =
    useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("contacts");
  const [viewMode, setViewMode] = useState<"grid" | "virtual">("grid");
  const [newContact, setNewContact] = useState({
    email: "",
    name: "",
    company: "",
    phone: "",
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showEditContact, setShowEditContact] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    color: "blue",
  });

  // Filtered contacts - moved before conditional returns to ensure hook order is consistent
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.tags?.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    const matchesGroup =
      !selectedGroup ||
      groups
        .find((g) => g.$id === selectedGroup)
        ?.contact_ids.includes(contact.$id);

    const matchesTag = !selectedTag || contact.tags?.includes(selectedTag);

    return matchesSearch && matchesGroup && matchesTag;
  });

  // Pagination hook for contacts - must be called before any conditional returns
  const contactsPagination = usePagination(filteredContacts, { pageSize: 12 });

  // Virtual scroll hook for large lists
  const virtualScroll = useVirtualScroll(filteredContacts, {
    itemHeight: 80,
    containerHeight: 600,
    overscan: 5,
  });

  // Reset pagination when filters change
  useEffect(() => {
    contactsPagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedGroup, selectedTag, contactsPagination.reset]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatDate = (dateValue: string) => {
    if (!isMounted) {
      return "";
    }
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

  const renderContactCard = (contact: Contact) => {
    const contactGroups = getContactGroups(contact.$id);
    return (
      <Card
        key={contact.$id}
        className="group h-full hover:shadow-md transition-all"
      >
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 min-w-0">
              {contact.name && (
                <h3 className="font-semibold text-foreground truncate mb-1">
                  {contact.name}
                </h3>
              )}
              <div className="flex items-center gap-2 text-sm text-primary">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{contact.email}</span>
              </div>
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
                  onClick={() => {
                    setEditingContact(contact);
                    setShowEditContact(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Contact
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedContactForGroup(contact);
                    setShowAddToGroup(true);
                  }}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Add to Group
                </DropdownMenuItem>
                {contactGroups.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {contactGroups.map((group) => (
                      <DropdownMenuItem
                        key={group.$id}
                        onClick={() =>
                          removeContactFromGroup(contact.$id, group.$id!)
                        }
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Remove from {group.name}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                <DropdownMenuSeparator />
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
                      <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete{" "}
                        {contact.name || contact.email}? This action cannot be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteContact(contact.$id)}
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

          <div className="space-y-2">
            {contact.company && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{contact.company}</span>
              </div>
            )}

            {contact.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{contact.phone}</span>
              </div>
            )}
          </div>

          {/* Contact Groups */}
          {contactGroups.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-4">
              {contactGroups.map((group) => (
                <Badge
                  key={group.$id}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full mr-1 ${getGroupColor(group.color)}`}
                  />
                  {group.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {contact.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Added {formatDate(contact.created_at)}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              asChild
            >
              <Link href={`/compose?to=${encodeURIComponent(contact.email)}`}>
                <Send className="h-3 w-3 mr-1" />
                Send
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const {
    showGmailImport,
    gmailContacts,
    selectedGmailContacts,
    isLoadingGmail,
    gmailImportError,
    isImporting,
    openGmailImportDialog,
    closeGmailImportDialog,
    importSelectedGmailContacts,
    toggleGmailContactSelection,
    toggleAllGmailContacts,
    fetchGmailContacts,
  } = useGmailContactsImport({
    userEmail: session?.user?.email ?? undefined,
    existingContacts: contacts,
    onImportComplete: fetchContacts,
  });

  const addContact = async () => {
    if (!session?.user?.email || !newContact.email.trim()) {
      return;
    }

    // Create an optimistic contact with a temporary ID
    const tempId = `temp-${Date.now()}`;
    const optimisticContact = {
      $id: tempId,
      email: newContact.email.trim(),
      name: newContact.name.trim() || undefined,
      company: newContact.company.trim() || undefined,
      phone: newContact.phone.trim() || undefined,
      tags: newContact.tags.length > 0 ? newContact.tags : undefined,
      user_email: session.user.email,
      created_at: new Date().toISOString(),
    };

    // Optimistically update UI
    setContacts((prev) => [optimisticContact, ...prev]);
    setNewContact({ email: "", name: "", company: "", phone: "", tags: [] });
    setNewTag("");
    setShowAddForm(false);
    toast.success("Contact added successfully!");

    try {
      // Perform the actual API call in background
      await contactsService.create({
        email: optimisticContact.email,
        name: optimisticContact.name,
        company: optimisticContact.company,
        phone: optimisticContact.phone,
        tags: optimisticContact.tags,
        user_email: session.user.email,
      });

      // Refetch to get the actual ID
      fetchContacts();
    } catch (error) {
      // Revert on error
      setContacts((prev) => prev.filter((c) => c.$id !== tempId));
      componentLogger.error(
        "Error adding contact",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to add contact - changes reverted");
    }
  };

  const updateContact = async () => {
    if (!editingContact?.$id) {
      return;
    }

    // Store the previous state for rollback
    const previousContacts = [...contacts];
    const updatedContact = {
      ...editingContact,
      email: editingContact.email.trim(),
      name: editingContact.name?.trim() || undefined,
      company: editingContact.company?.trim() || undefined,
      phone: editingContact.phone?.trim() || undefined,
      tags: editingContact.tags?.length ? editingContact.tags : undefined,
    };

    // Optimistically update UI
    setContacts((prev) =>
      prev.map((c) => (c.$id === editingContact.$id ? updatedContact : c)),
    );
    setShowEditContact(false);
    setEditingContact(null);
    toast.success("Contact updated!");

    try {
      await contactsService.update(editingContact.$id, {
        email: updatedContact.email,
        name: updatedContact.name,
        company: updatedContact.company,
        phone: updatedContact.phone,
        tags: updatedContact.tags,
      });

      // Refetch to ensure sync
      fetchContacts();
    } catch (error) {
      // Revert on error
      setContacts(previousContacts);
      componentLogger.error(
        "Error updating contact",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to update contact - changes reverted");
    }
  };

  const deleteContact = async (contactId: string) => {
    // Store the contact for potential rollback
    const contactToDelete = contacts.find((c) => c.$id === contactId);
    if (!contactToDelete) {
      return;
    }

    // Optimistically remove from UI
    setContacts((prev) => prev.filter((c) => c.$id !== contactId));
    toast.success("Contact deleted");

    try {
      await contactsService.delete(contactId);
      // No need to refetch, real-time subscription will update
    } catch (error) {
      // Revert on error
      setContacts((prev) => [...prev, contactToDelete]);
      componentLogger.error(
        "Error deleting contact",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to delete contact - restored");
    }
  };

  // Group functions
  const createGroup = async () => {
    if (!session?.user?.email || !newGroup.name.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await contactGroupsService.create({
        name: newGroup.name.trim(),
        description: newGroup.description.trim() || undefined,
        color: newGroup.color,
        contact_ids: [],
        user_email: session.user.email,
      });

      setNewGroup({ name: "", description: "", color: "blue" });
      setShowGroupForm(false);
      toast.success("Group created!");
      fetchGroups();
    } catch (error) {
      componentLogger.error(
        "Error creating group",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to create group");
    }
    setIsLoading(false);
  };

  const updateGroup = async () => {
    if (!editingGroup?.$id) {
      return;
    }

    setIsLoading(true);
    try {
      await contactGroupsService.update(editingGroup.$id, {
        name: editingGroup.name,
        description: editingGroup.description,
        color: editingGroup.color,
      });

      setShowEditGroup(false);
      setEditingGroup(null);
      toast.success("Group updated!");
      fetchGroups();
    } catch (error) {
      componentLogger.error(
        "Error updating group",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to update group");
    }
    setIsLoading(false);
  };

  const deleteGroup = async (groupId: string) => {
    try {
      await contactGroupsService.delete(groupId);
      toast.success("Group deleted");
      if (selectedGroup === groupId) {
        setSelectedGroup(null);
      }
      fetchGroups();
    } catch (error) {
      componentLogger.error(
        "Error deleting group",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to delete group");
    }
  };

  const addContactToGroup = async (contactId: string, groupId: string) => {
    try {
      await contactGroupsService.addContacts(groupId, [contactId]);
      toast.success("Contact added to group!");
      setShowAddToGroup(false);
      setSelectedContactForGroup(null);
      fetchGroups();
    } catch (error) {
      componentLogger.error(
        "Error adding contact to group",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to add contact to group");
    }
  };

  const removeContactFromGroup = async (contactId: string, groupId: string) => {
    try {
      await contactGroupsService.removeContacts(groupId, [contactId]);
      toast.success("Contact removed from group");
      fetchGroups();
    } catch (error) {
      componentLogger.error(
        "Error removing contact from group",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to remove contact from group");
    }
  };

  const getContactGroups = (contactId: string): ContactGroup[] => {
    return groups.filter((group) => group.contact_ids.includes(contactId));
  };

  const getGroupColor = (color?: string) => {
    return GROUP_COLORS.find((c) => c.value === color)?.class || "bg-gray-500";
  };

  // Get all unique tags from all contacts
  const getAllTags = (): string[] => {
    const tagSet = new Set<string>();
    contacts.forEach((contact) => {
      contact.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

  // Tag helper functions
  const addTagToContact = (tagList: string[], tag: string): string[] => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tagList.includes(trimmedTag)) {
      return [...tagList, trimmedTag];
    }
    return tagList;
  };

  const removeTagFromContact = (tagList: string[], tag: string): string[] => {
    return tagList.filter((t) => t !== tag);
  };

  const exportContacts = () => {
    if (contacts.length === 0) {
      toast.error("No contacts to export");
      return;
    }

    const csvContent = [
      ["Email", "Name", "Company", "Phone"],
      ...contacts.map((contact) => [
        contact.email,
        contact.name || "",
        contact.company || "",
        contact.phone || "",
      ]),
    ]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `contacts_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Contacts exported!");
  };

  const handleFileImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !session?.user?.email) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        const dataLines = lines.slice(1);

        const contactsToImport = dataLines
          .map((line) => {
            const [email, name, company, phone] = line
              .split(",")
              .map((field) => field.replace(/"/g, "").trim());
            return { email, name, company, phone };
          })
          .filter((contact) => contact.email && contact.email.includes("@"));

        if (contactsToImport.length > 0) {
          const toastId = toast.loading(
            `Importing ${contactsToImport.length} contacts...`,
          );
          let successCount = 0;
          const userEmail = session?.user?.email;

          if (!userEmail) {
            toast.error("User email not found", { id: toastId });
            return;
          }

          for (const contact of contactsToImport) {
            try {
              await contactsService.create({
                email: contact.email,
                name: contact.name || undefined,
                company: contact.company || undefined,
                phone: contact.phone || undefined,
                user_email: userEmail,
              });
              successCount++;
              // Update progress toast every 5 contacts
              if (successCount % 5 === 0) {
                toast.loading(
                  `Importing contacts... (${successCount}/${contactsToImport.length})`,
                  { id: toastId },
                );
              }
            } catch (error) {
              componentLogger.error(
                "Error importing contact",
                error instanceof Error ? error : undefined,
              );
            }
          }

          toast.success(`Successfully imported ${successCount} contacts`, {
            id: toastId,
          });
          fetchContacts();
        } else {
          toast.error("No valid email addresses found");
        }
      } catch (error) {
        componentLogger.error(
          "File processing error",
          error instanceof Error ? error : undefined,
        );
        toast.error("Error processing file");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  if (status === "loading" || !isMounted || isLoadingData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <Skeleton className="h-8 w-40 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-36" />
            </div>
          </div>

          {/* Tabs Skeleton */}
          <Skeleton className="h-10 w-64 mb-6" />

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div>
                      <Skeleton className="h-6 w-8 mb-1" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search and Filter Row */}
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-40" />
          </div>

          {/* Contact List Skeleton */}
          <div className="space-y-3">
            {[...Array(5)].map((_, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-40 mb-1" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Contacts</h1>
            <p className="text-muted-foreground">
              Manage your email contacts and groups
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                  <DialogDescription>
                    Add a new contact to your list
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      placeholder="John Doe"
                      value={newContact.name}
                      onChange={(e) =>
                        setNewContact({ ...newContact, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={newContact.email}
                      onChange={(e) =>
                        setNewContact({ ...newContact, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company</label>
                    <Input
                      placeholder="Acme Corp"
                      value={newContact.company}
                      onChange={(e) =>
                        setNewContact({
                          ...newContact,
                          company: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      placeholder="+1 (555) 123-4567"
                      value={newContact.phone}
                      onChange={(e) =>
                        setNewContact({ ...newContact, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tags</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (newTag.trim()) {
                              setNewContact({
                                ...newContact,
                                tags: addTagToContact(newContact.tags, newTag),
                              });
                              setNewTag("");
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (newTag.trim()) {
                            setNewContact({
                              ...newContact,
                              tags: addTagToContact(newContact.tags, newTag),
                            });
                            setNewTag("");
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    {newContact.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {newContact.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() =>
                                setNewContact({
                                  ...newContact,
                                  tags: removeTagFromContact(
                                    newContact.tags,
                                    tag,
                                  ),
                                })
                              }
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Press Enter or click Add to add a tag
                    </p>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={addContact}
                      disabled={
                        isLoading ||
                        !newContact.name.trim() ||
                        !newContact.email.trim()
                      }
                      className="flex-1"
                    >
                      Add Contact
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showGroupForm} onOpenChange={setShowGroupForm}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Group</DialogTitle>
                  <DialogDescription>
                    Organize your contacts into groups
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Group Name *</label>
                    <Input
                      placeholder="e.g., VIP Clients"
                      value={newGroup.name}
                      onChange={(e) =>
                        setNewGroup({ ...newGroup, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      placeholder="Optional description..."
                      value={newGroup.description}
                      onChange={(e) =>
                        setNewGroup({
                          ...newGroup,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {GROUP_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() =>
                            setNewGroup({ ...newGroup, color: color.value })
                          }
                          className={`w-8 h-8 rounded-full ${color.class} ${
                            newGroup.color === color.value
                              ? "ring-2 ring-offset-2 ring-primary"
                              : ""
                          }`}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={createGroup}
                      disabled={isLoading || !newGroup.name.trim()}
                      className="flex-1"
                    >
                      Create Group
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowGroupForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={exportContacts}
              disabled={contacts.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <div className="relative">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            <Button variant="outline" onClick={openGmailImportDialog}>
              <CloudDownload className="h-4 w-4 mr-2" />
              Import from Gmail
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contacts
              <Badge variant="secondary" className="ml-1">
                {contacts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Groups
              <Badge variant="secondary" className="ml-1">
                {groups.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <ContactListTab
            searchTerm={searchTerm}
            selectedGroup={selectedGroup}
            selectedTag={selectedTag}
            viewMode={viewMode}
            groups={groups}
            filteredContacts={filteredContacts}
            contactsPagination={contactsPagination}
            virtualScroll={virtualScroll}
            renderContactCard={renderContactCard}
            getAllTags={getAllTags}
            getGroupColor={getGroupColor}
            onSearchTermChange={setSearchTerm}
            onSetViewMode={setViewMode}
            onResetFilters={() => {
              setSelectedGroup(null);
              setSelectedTag(null);
            }}
            onSelectGroup={(groupId) => {
              setSelectedGroup(groupId);
              setSelectedTag(null);
            }}
            onSetSelectedTag={setSelectedTag}
            onSetEditingContact={setEditingContact}
            onSetShowEditContact={setShowEditContact}
            onSetSelectedContactForGroup={setSelectedContactForGroup}
            onSetShowAddToGroup={setShowAddToGroup}
            onDeleteContact={deleteContact}
            onOpenAddContact={() => setShowAddForm(true)}
            onHandleFileImport={handleFileImport}
          />

          <ContactGroupsTab
            groups={groups}
            getGroupColor={getGroupColor}
            onSetSelectedGroup={(groupId) => setSelectedGroup(groupId)}
            onSetActiveTab={setActiveTab}
            onEditGroup={(group) => {
              setEditingGroup(group);
              setShowEditGroup(true);
            }}
            onDeleteGroup={deleteGroup}
            onOpenCreateGroup={() => setShowGroupForm(true)}
          />
        </Tabs>

        {/* Quick Action */}
        {contacts.length > 0 && (
          <Card className="mt-8 bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Ready to send?</h3>
                  <p className="text-muted-foreground">
                    Use your contacts in an email campaign
                  </p>
                </div>
                <Button asChild>
                  <Link href="/compose">
                    <Mail className="h-4 w-4 mr-2" />
                    Compose Email
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <ContactManagementDialogs
        groups={groups}
        groupColors={GROUP_COLORS}
        getGroupColor={getGroupColor}
        showAddToGroup={showAddToGroup}
        selectedContactForGroup={selectedContactForGroup}
        showEditGroup={showEditGroup}
        editingGroup={editingGroup}
        showEditContact={showEditContact}
        editingContact={editingContact}
        newTag={newTag}
        showGmailImport={showGmailImport}
        gmailContacts={gmailContacts}
        selectedGmailContacts={selectedGmailContacts}
        isLoadingGmail={isLoadingGmail}
        isImporting={isImporting}
        gmailImportError={gmailImportError}
        onSetShowAddToGroup={setShowAddToGroup}
        onSetShowGroupForm={setShowGroupForm}
        onAddContactToGroup={addContactToGroup}
        onSetShowEditGroup={setShowEditGroup}
        onSetEditingGroup={setEditingGroup}
        onUpdateGroup={updateGroup}
        onSetShowEditContact={setShowEditContact}
        onSetEditingContact={setEditingContact}
        onSetNewTag={setNewTag}
        onAddTagToContact={addTagToContact}
        onRemoveTagFromContact={removeTagFromContact}
        onUpdateContact={updateContact}
        onGmailOpenChange={(open) => {
          if (open) {
            fetchGmailContacts();
          } else {
            closeGmailImportDialog();
          }
        }}
        onGmailRetry={fetchGmailContacts}
        onGmailToggleAll={toggleAllGmailContacts}
        onGmailToggleContact={toggleGmailContactSelection}
        onGmailImport={importSelectedGmailContacts}
      />
    </div>
  );
}
