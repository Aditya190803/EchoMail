"use client";

import { useEffect, useState, useCallback } from "react";

import Link from "next/link";

import {
  Users,
  Search,
  Trash2,
  Mail,
  Building,
  Phone,
  Download,
  Upload,
  CheckCircle,
  UserPlus,
  FileSpreadsheet,
  FolderPlus,
  Tag,
  MoreVertical,
  Edit,
  UserMinus,
  RefreshCw,
  CloudDownload,
} from "lucide-react";
import { toast } from "sonner";

import { Navbar } from "@/components/navbar";
import { Pagination } from "@/components/pagination";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { usePagination } from "@/hooks/usePagination";
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

interface Contact {
  $id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  tags?: string[];
  created_at: string;
  user_email: string;
}

export default function ContactsPage() {
  const { session, status } = useAuthGuard();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
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
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("contacts");
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
  const [showGmailImport, setShowGmailImport] = useState(false);
  const [gmailContacts, setGmailContacts] = useState<
    { name: string; email: string; phone?: string; company?: string }[]
  >([]);
  const [selectedGmailContacts, setSelectedGmailContacts] = useState<
    Set<string>
  >(new Set());
  const [isLoadingGmail, setIsLoadingGmail] = useState(false);
  const [gmailImportError, setGmailImportError] = useState<string | null>(null);

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

  // Reset pagination when filters change
  useEffect(() => {
    contactsPagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedGroup, selectedTag, contactsPagination.reset]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatDate = (dateValue: string) => {
    if (!isMounted) {return "";}
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

  // Fetch contacts function
  const fetchContacts = useCallback(async () => {
    if (!session?.user?.email) {return;}

    try {
      const response = await contactsService.listByUser(session.user.email);
      const contactsData = response.documents.map((doc) => {
        // Parse tags from JSON string if present
        let tags: string[] = [];
        try {
          if ((doc as any).tags) {
            tags = JSON.parse((doc as any).tags);
          }
        } catch {
          tags = [];
        }

        return {
          $id: doc.$id,
          email: doc.email,
          name: doc.name,
          company: doc.company,
          phone: doc.phone,
          tags,
          created_at: doc.created_at,
          user_email: doc.user_email,
        };
      }) as Contact[];

      setContacts(contactsData);
    } catch (error) {
      componentLogger.error(
        "Error fetching contacts",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to load contacts");
    }
  }, [session?.user?.email]);

  // Fetch groups function
  const fetchGroups = useCallback(async () => {
    if (!session?.user?.email) {return;}

    try {
      const response = await contactGroupsService.listByUser(
        session.user.email,
      );
      setGroups(response.documents);
    } catch (error) {
      componentLogger.error(
        "Error fetching groups",
        error instanceof Error ? error : undefined,
      );
    }
  }, [session?.user?.email]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    if (!session?.user?.email) {return;}

    // Initial fetch
    const loadData = async () => {
      await Promise.all([fetchContacts(), fetchGroups()]);
      setIsLoadingData(false);
    };
    loadData();

    // Subscribe to real-time updates
    const unsubscribe = contactsService.subscribeToUserContacts(
      session.user.email,
      (_response) => {
        // Refetch on any change (create, update, delete)
        fetchContacts();
      },
    );

    return () => {
      if (unsubscribe) {unsubscribe();}
    };
  }, [session?.user?.email, fetchContacts, fetchGroups]);

  const addContact = async () => {
    if (!session?.user?.email || !newContact.email.trim()) {return;}

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
    if (!editingContact?.$id) {return;}

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
    if (!contactToDelete) {return;}

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
    if (!session?.user?.email || !newGroup.name.trim()) {return;}

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
    if (!editingGroup?.$id) {return;}

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

  // Gmail import functions
  const fetchGmailContacts = async () => {
    setIsLoadingGmail(true);
    setGmailImportError(null);
    try {
      const response = await fetch("/api/import-google-contacts");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch contacts");
      }

      const data = await response.json();

      // Filter out contacts that already exist
      const existingEmails = new Set(
        contacts.map((c) => c.email.toLowerCase()),
      );
      const newContacts = data.contacts.filter(
        (c: { email: string }) => !existingEmails.has(c.email.toLowerCase()),
      );

      setGmailContacts(newContacts);
      setSelectedGmailContacts(
        new Set(newContacts.map((c: { email: string }) => c.email)),
      );

      if (newContacts.length === 0 && data.contacts.length > 0) {
        toast.info("All your Google contacts are already imported!");
      }
    } catch (error) {
      componentLogger.error(
        "Error fetching Gmail contacts",
        error instanceof Error ? error : undefined,
      );
      setGmailImportError(
        error instanceof Error
          ? error.message
          : "Failed to fetch Google contacts",
      );
    }
    setIsLoadingGmail(false);
  };

  const importSelectedGmailContacts = async () => {
    if (!session?.user?.email) {return;}

    const contactsToImport = gmailContacts.filter((c) =>
      selectedGmailContacts.has(c.email),
    );
    if (contactsToImport.length === 0) {
      toast.error("No contacts selected");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading(
      `Importing ${contactsToImport.length} contacts from Google...`,
    );
    let successCount = 0;

    for (const contact of contactsToImport) {
      try {
        await contactsService.create({
          email: contact.email,
          name: contact.name || undefined,
          company: contact.company || undefined,
          phone: contact.phone || undefined,
          user_email: session.user.email,
        });
        successCount++;
        // Update progress toast
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

    toast.success(
      `Successfully imported ${successCount} contacts from Google`,
      { id: toastId },
    );
    setShowGmailImport(false);
    setGmailContacts([]);
    setSelectedGmailContacts(new Set());
    fetchContacts();
    setIsLoading(false);
  };

  const toggleGmailContactSelection = (email: string) => {
    const newSelection = new Set(selectedGmailContacts);
    if (newSelection.has(email)) {
      newSelection.delete(email);
    } else {
      newSelection.add(email);
    }
    setSelectedGmailContacts(newSelection);
  };

  const toggleAllGmailContacts = () => {
    if (selectedGmailContacts.size === gmailContacts.length) {
      setSelectedGmailContacts(new Set());
    } else {
      setSelectedGmailContacts(new Set(gmailContacts.map((c) => c.email)));
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
    if (!file || !session?.user?.email) {return;}

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
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
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

  if (status === "unauthenticated") {return null;}

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
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

            <Button
              variant="outline"
              onClick={() => {
                setShowGmailImport(true);
                fetchGmailContacts();
              }}
            >
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

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-6">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                icon={<Search className="h-4 w-4" />}
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={
                    selectedGroup === null && selectedTag === null
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => {
                    setSelectedGroup(null);
                    setSelectedTag(null);
                  }}
                >
                  All Contacts
                </Button>
                {groups.map((group) => (
                  <Button
                    key={group.$id}
                    variant={
                      selectedGroup === group.$id ? "secondary" : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      setSelectedGroup(group.$id!);
                      setSelectedTag(null);
                    }}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${getGroupColor(group.color)}`}
                    />
                    {group.name}
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {group.contact_ids.length}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>

            {/* Tag Filters */}
            {getAllTags().length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-muted-foreground mr-2">
                  Filter by tag:
                </span>
                {getAllTags().map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTag === tag ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/20"
                    onClick={() =>
                      setSelectedTag(selectedTag === tag ? null : tag)
                    }
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {selectedTag && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTag(null)}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}

            {/* Contacts Grid */}
            {filteredContacts.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {contactsPagination.startIndex + 1} to{" "}
                    {Math.min(
                      contactsPagination.endIndex + 1,
                      filteredContacts.length,
                    )}{" "}
                    of {filteredContacts.length} contacts
                    {selectedGroup &&
                      ` in "${groups.find((g) => g.$id === selectedGroup)?.name}"`}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {contactsPagination.paginatedItems.map((contact) => {
                    const contactGroups = getContactGroups(contact.$id);
                    return (
                      <Card key={contact.$id} hover className="group">
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
                                <span className="truncate">
                                  {contact.email}
                                </span>
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
                                          removeContactFromGroup(
                                            contact.$id,
                                            group.$id!,
                                          )
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
                                      <AlertDialogTitle>
                                        Delete Contact
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete{" "}
                                        {contact.name || contact.email}? This
                                        action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          deleteContact(contact.$id)
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

                          <div className="space-y-2">
                            {contact.company && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">
                                  {contact.company}
                                </span>
                              </div>
                            )}

                            {contact.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">
                                  {contact.phone}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Contact Groups */}
                          {contactGroups.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {contactGroups.map((group) => (
                                <Badge
                                  key={group.$id}
                                  variant="secondary"
                                  className="text-xs flex items-center gap-1"
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${getGroupColor(group.color)}`}
                                  />
                                  {group.name}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Contact Tags */}
                          {contact.tags && contact.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {contact.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs flex items-center gap-1 cursor-pointer hover:bg-primary/20"
                                  onClick={() => setSelectedTag(tag)}
                                >
                                  <Tag className="h-2.5 w-2.5" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                            Added {formatDate(contact.created_at)}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Pagination */}
                {filteredContacts.length > contactsPagination.pageSize && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={contactsPagination.currentPage}
                      totalPages={contactsPagination.totalPages}
                      pageSize={contactsPagination.pageSize}
                      totalItems={contactsPagination.totalItems}
                      hasPreviousPage={contactsPagination.hasPreviousPage}
                      hasNextPage={contactsPagination.hasNextPage}
                      onPageChange={contactsPagination.goToPage}
                      onPageSizeChange={contactsPagination.setPageSize}
                      getPageNumbers={contactsPagination.getPageNumbers}
                      startIndex={contactsPagination.startIndex}
                      endIndex={contactsPagination.endIndex}
                    />
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-16">
                  <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm || selectedGroup
                        ? "No contacts found"
                        : "No contacts yet"}
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                      {searchTerm || selectedGroup
                        ? "Try adjusting your search or filter"
                        : "Get started by adding your first contact or importing a CSV file"}
                    </p>
                    {!searchTerm && !selectedGroup && (
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button onClick={() => setShowAddForm(true)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Contact
                        </Button>
                        <div className="relative">
                          <Button variant="outline">
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Import CSV
                          </Button>
                          <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileImport}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups" className="space-y-6">
            {groups.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((group) => (
                  <Card key={group.$id} hover className="group">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg ${getGroupColor(group.color)} flex items-center justify-center`}
                          >
                            <Users className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{group.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {group.contact_ids.length} contact
                              {group.contact_ids.length !== 1 ? "s" : ""}
                            </p>
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
                                setEditingGroup(group);
                                setShowEditGroup(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedGroup(group.$id!);
                                setActiveTab("contacts");
                              }}
                            >
                              <Users className="h-4 w-4 mr-2" />
                              View Contacts
                            </DropdownMenuItem>
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
                                  <AlertDialogTitle>
                                    Delete Group
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "
                                    {group.name}"? Contacts will not be deleted.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteGroup(group.$id!)}
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
                      {group.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {group.description}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedGroup(group.$id!);
                          setActiveTab("contacts");
                        }}
                      >
                        View Contacts
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-16">
                  <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Tag className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      No groups yet
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                      Create groups to organize your contacts and send targeted
                      campaigns
                    </p>
                    <Button onClick={() => setShowGroupForm(true)}>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Create Group
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Action */}
        {contacts.length > 0 && (
          <Card className="mt-8 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
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

      {/* Add to Group Dialog */}
      <Dialog open={showAddToGroup} onOpenChange={setShowAddToGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Group</DialogTitle>
            <DialogDescription>
              Select a group to add{" "}
              {selectedContactForGroup?.name || selectedContactForGroup?.email}{" "}
              to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-4">
            {groups.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No groups yet</p>
                <Button
                  onClick={() => {
                    setShowAddToGroup(false);
                    setShowGroupForm(true);
                  }}
                >
                  Create Group
                </Button>
              </div>
            ) : (
              groups.map((group) => {
                const isInGroup =
                  selectedContactForGroup &&
                  group.contact_ids.includes(selectedContactForGroup.$id);
                return (
                  <button
                    key={group.$id}
                    disabled={!!isInGroup}
                    onClick={() =>
                      selectedContactForGroup &&
                      addContactToGroup(selectedContactForGroup.$id, group.$id!)
                    }
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      isInGroup
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${getGroupColor(group.color)} flex items-center justify-center`}
                    >
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {group.contact_ids.length} contacts
                      </p>
                    </div>
                    {isInGroup && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={showEditGroup} onOpenChange={setShowEditGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>Update group details</DialogDescription>
          </DialogHeader>
          {editingGroup && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Group Name *</label>
                <Input
                  value={editingGroup.name}
                  onChange={(e) =>
                    setEditingGroup({ ...editingGroup, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={editingGroup.description || ""}
                  onChange={(e) =>
                    setEditingGroup({
                      ...editingGroup,
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
                        setEditingGroup({ ...editingGroup, color: color.value })
                      }
                      className={`w-8 h-8 rounded-full ${color.class} ${
                        editingGroup.color === color.value
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
                  onClick={updateGroup}
                  disabled={isLoading || !editingGroup.name.trim()}
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditGroup(false);
                    setEditingGroup(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Gmail Import Dialog */}
      <Dialog
        open={showGmailImport}
        onOpenChange={(open) => {
          setShowGmailImport(open);
          if (!open) {
            setGmailContacts([]);
            setSelectedGmailContacts(new Set());
            setGmailImportError(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CloudDownload className="h-5 w-5" />
              Import from Google Contacts
            </DialogTitle>
            <DialogDescription>
              Select contacts from your Google account to import
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {isLoadingGmail ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">
                  Fetching your Google contacts...
                </p>
              </div>
            ) : gmailImportError ? (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-destructive" />
                </div>
                <p className="text-destructive mb-4">{gmailImportError}</p>
                <Button onClick={fetchGmailContacts} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : gmailContacts.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  No new contacts to import
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  All your Google contacts are already imported
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        selectedGmailContacts.size === gmailContacts.length
                      }
                      onChange={toggleAllGmailContacts}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">
                      Select All ({gmailContacts.length} contacts)
                    </span>
                  </div>
                  <Badge variant="secondary">
                    {selectedGmailContacts.size} selected
                  </Badge>
                </div>

                <div className="max-h-[40vh] overflow-y-auto space-y-2">
                  {gmailContacts.map((contact) => (
                    <div
                      key={contact.email}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedGmailContacts.has(contact.email)
                          ? "bg-primary/5 border-primary/30"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => toggleGmailContactSelection(contact.email)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGmailContacts.has(contact.email)}
                        onChange={() =>
                          toggleGmailContactSelection(contact.email)
                        }
                        className="rounded border-gray-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {contact.name || contact.email}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {contact.email}
                          {contact.company && ` • ${contact.company}`}
                        </p>
                      </div>
                      {selectedGmailContacts.has(contact.email) && (
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={importSelectedGmailContacts}
                    disabled={isLoading || selectedGmailContacts.size === 0}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Import {selectedGmailContacts.size} Contact
                        {selectedGmailContacts.size !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowGmailImport(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={showEditContact} onOpenChange={setShowEditContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update contact information</DialogDescription>
          </DialogHeader>
          {editingContact && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editingContact.name || ""}
                  onChange={(e) =>
                    setEditingContact({
                      ...editingContact,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={editingContact.email}
                  onChange={(e) =>
                    setEditingContact({
                      ...editingContact,
                      email: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Company</label>
                <Input
                  value={editingContact.company || ""}
                  onChange={(e) =>
                    setEditingContact({
                      ...editingContact,
                      company: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={editingContact.phone || ""}
                  onChange={(e) =>
                    setEditingContact({
                      ...editingContact,
                      phone: e.target.value,
                    })
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
                          setEditingContact({
                            ...editingContact,
                            tags: addTagToContact(
                              editingContact.tags || [],
                              newTag,
                            ),
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
                        setEditingContact({
                          ...editingContact,
                          tags: addTagToContact(
                            editingContact.tags || [],
                            newTag,
                          ),
                        });
                        setNewTag("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                {editingContact.tags && editingContact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editingContact.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() =>
                            setEditingContact({
                              ...editingContact,
                              tags: removeTagFromContact(
                                editingContact.tags || [],
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
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={updateContact}
                  disabled={isLoading || !editingContact.email.trim()}
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditContact(false);
                    setEditingContact(null);
                    setNewTag("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
