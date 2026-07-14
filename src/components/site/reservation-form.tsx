"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarCheck, Calendar as CalendarIcon, Armchair, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { phoneSchema } from "@/lib/schemas";

const formSchema = z.object({
  customer_name: z.string().trim().min(1, "Nom requis").max(100),
  customer_phone: phoneSchema,
  date: z
    .string()
    .min(1, "Date requise")
    .refine(
      (d) => d >= format(new Date(), "yyyy-MM-dd"),
      "La date est déjà passée",
    ),
  time: z.string().min(1, "Heure requise"),
  table_number: z.number().int().optional(),
  party_size: z
    .number({ message: "Nombre invalide" })
    .int()
    .min(1, "Minimum 1 personne")
    .max(50, "Maximum 50"),
  note: z.string().trim().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function ReservationForm({ slug }: { slug: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_name: "",
      customer_phone: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "20:00",
      table_number: undefined,
      party_size: 2,
      note: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_slug: slug, ...values }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Une erreur est survenue. Réessayez.");
        return;
      }
      setDone(true);
    } catch {
      toast.error("Connexion impossible. Vérifiez votre réseau.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <CalendarCheck className="size-16 text-primary" />
        <h2 className="mt-4 font-display text-2xl font-semibold">
          Demande envoyée !
        </h2>
        <p className="mt-2 max-w-sm text-muted-foreground">
          Le restaurant vous confirmera votre table très vite par téléphone ou
          WhatsApp.
        </p>
      </div>
    );
  }

  const errors = form.formState.errors;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mt-8 space-y-5"
      noValidate
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date" className="font-bold text-foreground dark:text-white">Date <span className="ml-2 inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-500 ring-1 ring-inset ring-red-500/20">Requis</span></Label>
          <Controller
            control={form.control}
            name="date"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white dark:bg-[#18181A] border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-[#202024] hover:text-foreground dark:hover:text-white rounded-xl h-12 text-foreground dark:text-white px-4",
                      !field.value && "text-muted-foreground",
                      errors.date && "border-destructive focus-visible:ring-destructive text-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-5 w-5 text-[#FF6B35]" />
                    {field.value ? format(parseISO(field.value), "PPP", { locale: fr }) : <span>Choisir une date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? parseISO(field.value) : undefined}
                    onSelect={(d) => d && field.onChange(format(d, "yyyy-MM-dd"))}
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          <FieldError message={errors.date?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time" className="font-bold text-foreground dark:text-white">Heure <span className="ml-2 inline-flex items-center rounded-md bg-red-500/20 px-2 py-1 text-[10px] font-medium text-red-500 ring-1 ring-inset ring-red-500/20">Requis</span></Label>
          <Controller
            control={form.control}
            name="time"
            render={({ field }) => (
              <TimeSelector
                value={field.value}
                onChange={field.onChange}
                hasError={!!errors.time}
              />
            )}
          />
          <FieldError message={errors.time?.message} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="party_size" className="font-bold text-foreground dark:text-white">Nombre de personnes <span className="ml-2 inline-flex items-center rounded-md bg-red-500/20 px-2 py-1 text-[10px] font-medium text-red-500 ring-1 ring-inset ring-red-500/20">Requis</span></Label>
        <Input
          id="party_size"
          type="number"
          min={1}
          max={50}
          inputMode="numeric"
          aria-invalid={!!errors.party_size}
          className={cn("bg-white dark:bg-[#18181A] border-gray-200 dark:border-white/5 rounded-xl h-12 text-foreground dark:text-white px-4", errors.party_size && "border-destructive focus-visible:ring-destructive")}
          {...form.register("party_size", { valueAsNumber: true })}
        />
        <FieldError message={errors.party_size?.message} />
      </div>
      <div className="space-y-2">
        <Label className="font-bold text-foreground dark:text-white">Table</Label>
        <Controller
          control={form.control}
          name="table_number"
          render={({ field }) => (
            <TableSelector value={field.value} onChange={field.onChange} />
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customer_name" className="font-bold text-foreground dark:text-white">Nom <span className="ml-2 inline-flex items-center rounded-md bg-red-500/20 px-2 py-1 text-[10px] font-medium text-red-500 ring-1 ring-inset ring-red-500/20">Requis</span></Label>
        <Input
          id="customer_name"
          autoComplete="name"
          aria-invalid={!!errors.customer_name}
          className={cn("bg-white dark:bg-[#18181A] border-gray-200 dark:border-white/5 rounded-xl h-12 text-foreground dark:text-white px-4", errors.customer_name && "border-destructive focus-visible:ring-destructive")}
          {...form.register("customer_name")}
        />
        <FieldError message={errors.customer_name?.message} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customer_phone" className="font-bold text-foreground dark:text-white">Téléphone <span className="ml-2 inline-flex items-center rounded-md bg-red-500/20 px-2 py-1 text-[10px] font-medium text-red-500 ring-1 ring-inset ring-red-500/20">Requis</span></Label>
        <Input
          id="customer_phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="06 12 34 56 78"
          aria-invalid={!!errors.customer_phone}
          className={cn("bg-white dark:bg-[#18181A] border-gray-200 dark:border-white/5 rounded-xl h-12 text-foreground dark:text-white px-4", errors.customer_phone && "border-destructive focus-visible:ring-destructive")}
          {...form.register("customer_phone")}
        />
        <FieldError message={errors.customer_phone?.message} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="note" className="font-bold text-foreground dark:text-white">Note <span className="text-[#e2a84a]">(optionnel)</span></Label>
        <Textarea
          id="note"
          placeholder="Anniversaire, terrasse, chaise bébé…"
          className="bg-white dark:bg-[#18181A] border-gray-200 dark:border-white/5 rounded-xl min-h-[100px] text-foreground dark:text-white p-4"
          {...form.register("note")}
        />
      </div>
      <Button size="lg" type="submit" className="w-full font-bold shadow-md h-12 mt-4" disabled={submitting}>
        {submitting ? "Envoi…" : "Demander la réservation"}
      </Button>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

function TableSelector({
  value,
  onChange,
}: {
  value?: number;
  onChange: (val: number) => void;
}) {
  const [open, setOpen] = useState(false);
  
  // Custom mock layout based on the design requested
  const tables = [
    { id: 1, shape: "square", status: "available", span: 1 },
    { id: 2, shape: "rect", status: "available", span: 2 },
    { id: 3, shape: "square", status: "available", span: 1 },
    { id: 4, shape: "square", status: "available", span: 1 },
    { id: 5, shape: "square", status: "reserved", span: 1 },
    { id: 6, shape: "rect", status: "available", span: 2 },
    { id: 7, shape: "square", status: "available", span: 1 },
    { id: 8, shape: "rect", status: "available", span: 2 },
    { id: 9, shape: "square", status: "available", span: 1 },
  ];

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between font-normal bg-white dark:bg-[#18181A] border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-[#202024] hover:text-foreground dark:hover:text-white rounded-xl h-12 text-foreground dark:text-white px-4",
            !value && "text-muted-foreground",
          )}
        >
          <div className="flex items-center gap-3">
            <Armchair className="size-5 text-[#a16246]" />
            <span className="text-foreground dark:text-white font-medium">
              {value ? `Table ${value} sélectionnée` : "Choisir une table"}
            </span>
          </div>
          <span className="text-muted-foreground">&rsaquo;</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="dark:bg-[#0a0a0c] dark:border-border max-h-[85vh]">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left px-4">
            <DrawerTitle className="text-lg">Choisir une table</DrawerTitle>
            <div className="flex items-center gap-4 text-[11px] mt-2 font-medium">
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded-sm bg-primary dark:bg-[#DF6C32]"></div>
                <span className="text-muted-foreground">Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded-sm bg-muted/80"></div>
                <span className="text-muted-foreground">Reserved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"></div>
                <span className="text-muted-foreground">Available</span>
              </div>
            </div>
          </DrawerHeader>
          <div className="p-4 overflow-y-auto max-h-[50vh]">
            <div className="grid grid-cols-3 gap-3 md:gap-4 mx-auto">
              {tables.map((t) => {
                const isSelected = value === t.id;
                const isReserved = t.status === "reserved";
                const spanCol = t.span === 2 ? "col-span-2" : "col-span-1";

                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={isReserved}
                    onClick={() => onChange(t.id)}
                    className={cn(
                      "relative flex items-center justify-center rounded-2xl border-2 border-transparent py-7 font-bold text-lg transition-all",
                      spanCol,
                      isSelected
                        ? "bg-primary text-primary-foreground scale-95 shadow-md border-primary/20 dark:bg-[#DF6C32] dark:text-white dark:border-[#DF6C32]/20"
                        : isReserved
                        ? "bg-muted/40 text-muted-foreground opacity-50 cursor-not-allowed"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    )}
                  >
                    {/* Tiny "chairs" details */}
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-foreground/10 rounded-full" />
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-foreground/10 rounded-full" />
                    {t.span === 2 && (
                      <>
                        <div className="absolute top-0 left-1/4 w-6 h-1.5 bg-foreground/10 rounded-full" />
                        <div className="absolute top-0 right-1/4 w-6 h-1.5 bg-foreground/10 rounded-full" />
                        <div className="absolute bottom-0 left-1/4 w-6 h-1.5 bg-foreground/10 rounded-full" />
                        <div className="absolute bottom-0 right-1/4 w-6 h-1.5 bg-foreground/10 rounded-full" />
                      </>
                    )}
                    {t.span === 1 && (
                      <>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-foreground/10 rounded-full" />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-foreground/10 rounded-full" />
                      </>
                    )}
                    {t.id}
                  </button>
                );
              })}
            </div>
          </div>
          <DrawerFooter className="pt-2 px-4 pb-6">
            <DrawerClose asChild>
              <Button 
                size="lg" 
                className={cn(
                  "w-full font-bold shadow-md transition-colors", 
                  !value 
                    ? "bg-muted text-muted-foreground hover:bg-muted" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-[#DF6C32] dark:text-white dark:hover:bg-[#C95A26]"
                )}
              >
                Sélectionnez une table
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function TimeSelector({
  value,
  onChange,
  hasError,
}: {
  value?: string;
  onChange: (val: string) => void;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const times = [
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", 
    "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00"
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-white dark:bg-[#18181A] border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-[#202024] hover:text-foreground dark:hover:text-white rounded-xl h-12 text-foreground dark:text-white px-4",
            !value && "text-muted-foreground",
            hasError && "border-destructive focus-visible:ring-destructive text-destructive"
          )}
        >
          <Clock className="mr-3 h-5 w-5 text-[#FF6B35]" />
          {value || <span>Choisir une heure</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 dark:bg-[#0a0a0c] dark:border-border" align="start">
        <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1 [scrollbar-width:thin]">
          {times.map((t) => (
            <Button
              key={t}
              type="button"
              variant={value === t ? "default" : "outline"}
              className={cn("h-10 text-sm font-medium rounded-lg", value === t ? "bg-primary text-primary-foreground shadow-sm dark:bg-[#DF6C32] dark:text-white dark:border-[#DF6C32]/20 border border-transparent" : "bg-transparent dark:border-white/10 dark:hover:bg-white/5 text-foreground dark:text-white")}
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
            >
              {t}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
