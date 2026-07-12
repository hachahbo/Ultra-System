"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schema = z
  .object({
    password: z.string().min(8, "8 caractères minimum"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const res = await fetch("/api/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: values.password }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("Mise à jour impossible");
      return;
    }
    toast.success("Mot de passe mis à jour");
    router.replace("/dashboard");
    router.refresh();
  }

  const errors = form.formState.errors;

  return (
    <main className="grid min-h-dvh place-items-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Choisissez un mot de passe
          </CardTitle>
          <CardDescription>
            Pour des raisons de sécurité, vous devez définir un nouveau mot de
            passe avant de continuer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...form.register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirm}
                {...form.register("confirm")}
              />
              {errors.confirm && (
                <p className="text-sm text-destructive">{errors.confirm.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Enregistrement…" : "Continuer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
