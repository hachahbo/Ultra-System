"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createRestaurantSchema, type CreateRestaurantInput } from "@/lib/schemas";

export function CreateRestaurantDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateRestaurantInput>({
    resolver: zodResolver(createRestaurantSchema),
    defaultValues: {
      name: "",
      slug: "",
      city: "",
      plan: "free",
      currency: "MAD",
      ownerEmail: "",
      ownerPassword: "",
    },
  });
  const errors = form.formState.errors;
  const plan = form.watch("plan");

  async function onSubmit(values: CreateRestaurantInput) {
    setSubmitting(true);
    const res = await fetch("/api/admin/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error?.message ?? "Création impossible");
      return;
    }
    toast.success("Restaurant créé");
    setOpen(false);
    form.reset();
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Nouveau restaurant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un restaurant</DialogTitle>
          <DialogDescription>
            Crée le restaurant et le compte propriétaire. Le mot de passe devra être
            changé à la première connexion.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" {...form.register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" placeholder="mon-restaurant" {...form.register("slug")} />
            {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">Ville</Label>
            <Input id="city" {...form.register("city")} />
          </div>
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select
              value={plan ?? "free"}
              onValueChange={(v) => form.setValue("plan", v as CreateRestaurantInput["plan"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Devise</Label>
            <Input id="currency" placeholder="MAD" {...form.register("currency")} />
            {errors.currency && (
              <p className="text-sm text-destructive">{errors.currency.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ownerEmail">Email du propriétaire</Label>
            <Input id="ownerEmail" type="email" {...form.register("ownerEmail")} />
            {errors.ownerEmail && (
              <p className="text-sm text-destructive">{errors.ownerEmail.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ownerPassword">Mot de passe temporaire</Label>
            <Input id="ownerPassword" type="text" {...form.register("ownerPassword")} />
            {errors.ownerPassword && (
              <p className="text-sm text-destructive">{errors.ownerPassword.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
