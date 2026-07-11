"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import { HeroImages } from "@/components/site/hero-images";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword(values);
    if (error || !data.user) {
      toast.error("Email ou mot de passe incorrect");
      setSubmitting(false);
      return;
    }

    // "platform_admins self read" RLS policy lets the signed-in user check
    // their own membership directly.
    const { data: membership } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    const home = membership ? "/admin" : "/dashboard";

    const next = searchParams.get("next");
    router.replace(next?.startsWith(home) ? next : home);
    router.refresh();
  }

  const errors = form.formState.errors;

  return (
    <main className="flex min-h-dvh bg-background">
      {/* Left Side: Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-24 xl:px-32">
        <div className="mx-auto w-full max-w-sm">
          
          {/* Logo */}
          <div className="mb-10 flex justify-center">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded bg-primary font-display font-bold text-primary-foreground">
                D
              </div>
              <span className="font-display text-xl font-bold tracking-tight">Darna</span>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="mb-10 text-center">
            <h1 className="mb-2 font-display text-4xl font-bold tracking-tight text-foreground">
              Good Morning!
            </h1>
            <p className="text-sm text-muted-foreground">
              Connectez-vous à votre{" "}
              <span className="font-medium text-foreground">Espace Restaurateur</span>
            </p>
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Type your email address"
                  autoComplete="email"
                  className="h-12 rounded-xl pl-11 shadow-sm"
                  aria-invalid={!!errors.email}
                  {...form.register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Type your password"
                  autoComplete="current-password"
                  className="h-12 rounded-xl pl-11 pr-11 shadow-sm"
                  aria-invalid={!!errors.password}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="mt-6 h-12 w-full rounded-xl text-base font-semibold shadow"
              disabled={submitting}
            >
              {submitting ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
        </div>
      </div>

      {/* Right Side: HeroImages */}
      <div className="hidden w-1/2 items-center justify-center bg-zinc-50 dark:bg-zinc-950/50 lg:flex">
        <HeroImages />
      </div>
    </main>
  );
}
