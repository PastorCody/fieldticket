"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Plus,
  Star,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Building2,
  Search,
  FileSliders,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Contact } from "@/types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [templateContactIds, setTemplateContactIds] = useState<Set<string>>(
    new Set()
  );
  const supabase = createClient();

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [contactsRes, templatesRes] = await Promise.all([
      supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("is_favorite", { ascending: false })
        .order("name"),
      supabase
        .from("contact_templates")
        .select("contact_id")
        .eq("user_id", user.id),
    ]);

    setContacts((contactsRes.data as Contact[]) || []);
    setTemplateContactIds(
      new Set((templatesRes.data || []).map((t) => t.contact_id))
    );
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", company: "" });
    setDialogOpen(true);
  }

  function openEdit(contact: Contact) {
    setEditing(contact);
    setForm({
      name: contact.name,
      email: contact.email,
      phone: contact.phone || "",
      company: contact.company || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (form.phone && !/^[\d\s\-\(\)\+]+$/.test(form.phone)) {
      toast.error("Phone number contains invalid characters");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const trimmed = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
    };

    if (editing) {
      await supabase
        .from("contacts")
        .update({
          ...trimmed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id);
      toast.success("Contact updated");
    } else {
      await supabase.from("contacts").insert({
        user_id: user.id,
        ...trimmed,
      });
      toast.success("Contact added");
    }

    setDialogOpen(false);
    loadContacts();
  }

  async function handleDelete(id: string) {
    await supabase.from("contacts").delete().eq("id", id);
    setDeleteTarget(null);
    toast.success("Contact deleted");
    loadContacts();
  }

  async function toggleFavorite(contact: Contact) {
    await supabase
      .from("contacts")
      .update({ is_favorite: !contact.is_favorite })
      .eq("id", contact.id);
    loadContacts();
  }

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="h-11 pl-10"
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openAdd}
              className="h-11 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit Contact" : "Add Contact"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jane Doe"
                  className="h-11"
                  required
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jane@company.com"
                  className="h-11"
                  required
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(432) 555-5678"
                  className="h-11"
                />
              </div>
              <div>
                <Label>Company</Label>
                <Input
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  placeholder="Permian Basin Oil Co"
                  className="h-11"
                />
              </div>
              <Button
                onClick={handleSave}
                className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white"
                disabled={!form.name || !form.email}
              >
                {editing ? "Update" : "Add"} Contact
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No contacts yet</p>
          <p className="text-sm mt-1">Add someone to send tickets to</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((contact) => (
            <Card key={contact.id} className="border-border bg-card">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <button
                  onClick={() => toggleFavorite(contact)}
                  className="shrink-0"
                >
                  <Star
                    className={`h-5 w-5 ${
                      contact.is_favorite
                        ? "text-orange-400 fill-orange-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">
                      {contact.name}
                    </p>
                    {templateContactIds.has(contact.id) && (
                      <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500">
                        Template
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" />
                      {contact.email}
                    </span>
                    {contact.company && (
                      <span className="flex items-center gap-1 truncate">
                        <Building2 className="h-3 w-3" />
                        {contact.company}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Link href={`/contacts/${contact.id}/template`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      title="Edit template"
                    >
                      <FileSliders className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(contact)}
                    className="h-8 w-8 text-muted-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(contact)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
