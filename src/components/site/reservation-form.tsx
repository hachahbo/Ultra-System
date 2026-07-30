"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarCheck,
  Calendar as CalendarIcon,
  Armchair,
  Clock,
  MapPin,
  Phone,
  Send,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { makePhoneSchema } from "@/lib/schemas";
import { dateFnsLocale } from "@/lib/date-locale";
import { useIsMobile } from "@/hooks/use-mobile";

// Validation messages come from the active locale, so the schema is built per
// render rather than once at module scope.
type ValidationMessages = {
  name: string;
  phone: string;
  date: string;
  datePast: string;
  time: string;
  partyNumber: string;
  partyMin: string;
  partyMax: string;
};

function buildFormSchema(m: ValidationMessages) {
  return z.object({
    customer_name: z.string().trim().min(1, m.name).max(100),
    customer_phone: makePhoneSchema(m.phone),
    date: z
      .string()
      .min(1, m.date)
      .refine((d) => d >= format(new Date(), "yyyy-MM-dd"), m.datePast),
    time: z.string().min(1, m.time),
    table_number: z.number().int().optional(),
    party_size: z
      .number({ message: m.partyNumber })
      .int()
      .min(1, m.partyMin)
      .max(50, m.partyMax),
    note: z.string().trim().max(500).optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildFormSchema>>;

interface ReservationFormProps {
  slug: string;
  restaurantName?: string;
  address?: string | null;
  hours?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  featureImage?: string | null;
}

export function ReservationForm({
  slug,
  restaurantName,
  address,
  hours,
  phone,
  whatsappNumber,
  featureImage,
}: ReservationFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const t = useTranslations("Reservation");
  const tErrors = useTranslations("Errors");
  const locale = useLocale();

  const formSchema = useMemo(
    () =>
      buildFormSchema({
        name: t("errorName"),
        phone: t("errorPhone"),
        date: t("errorDate"),
        datePast: t("errorDatePast"),
        time: t("errorTime"),
        partyNumber: t("errorPartyNumber"),
        partyMin: t("errorPartyMin"),
        partyMax: t("errorPartyMax"),
      }),
    [t],
  );

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
        toast.error(data.error ?? tErrors("generic"));
        return;
      }
      setDone(true);
    } catch {
      toast.error(tErrors("network"));
    } finally {
      setSubmitting(false);
    }
  }

  const errors = form.formState.errors;

  return (
    <div className="bg-[#fcf8f3] dark:bg-[#12100e] min-h-screen text-[#1a1715] dark:text-gray-100 py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-16">
        {/* Main Grid: Left Details & Right Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left Column (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-0.5 w-6 bg-[#cd6133]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#cd6133]">
                  {t("badge")}
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
                {t("titleLead")} <br />
                <span className="italic font-normal text-[#cd6133]">{t("titleAccent")}</span>
              </h1>

              <p className="text-[#78716c] dark:text-gray-400 text-base sm:text-lg leading-relaxed pt-2">
                {t("intro")}
              </p>
            </div>

            {/* Info List — only what this restaurant actually filled in. */}
            <div className="space-y-5 pt-2">
              {address && (
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f7e9e2] text-[#cd6133] dark:bg-[#2c1912] dark:text-[#f08556]">
                    <MapPin className="size-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#a8a29e] dark:text-gray-400">
                      {t("labelAddress")}
                    </p>
                    <p className="font-bold text-base text-[#1a1715] dark:text-white leading-snug">
                      {address}
                    </p>
                  </div>
                </div>
              )}

              {hours && (
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f7e9e2] text-[#cd6133] dark:bg-[#2c1912] dark:text-[#f08556]">
                    <Clock className="size-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#a8a29e] dark:text-gray-400">
                      {t("labelHours")}
                    </p>
                    <p className="font-bold text-base text-[#1a1715] dark:text-white leading-snug">
                      {hours}
                    </p>
                  </div>
                </div>
              )}

              {phone && (
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f7e9e2] text-[#cd6133] dark:bg-[#2c1912] dark:text-[#f08556]">
                    <Phone className="size-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#a8a29e] dark:text-gray-400">
                      {t("labelPhone")}
                    </p>
                    <a
                      href={`tel:${phone.replace(/\s/g, "")}`}
                      className="font-bold text-base text-[#1a1715] dark:text-white leading-snug hover:text-[#cd6133] transition-colors"
                    >
                      {phone}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Privatisation Feature Card */}
            <div className="rounded-[2.5rem] bg-[#2a1710] dark:bg-[#25150f] p-6 text-white border border-[#cd6133]/30 shadow-2xl space-y-5 mt-6">
              <div className="relative h-48 sm:h-56 w-full overflow-hidden rounded-2xl shadow-md border border-white/10">
                <Image
                  src={featureImage || "/images/orendezvous/orendezvous.tanger_1777049699_3882496730299010586_73557593345.jpg"}
                  alt={t("privatizationImageAlt")}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display text-2xl font-bold text-white tracking-tight">
                  {t("privatizationTitle")}
                </h3>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                  {t("privatizationText")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.setValue("note", t("privatizationNote"));
                  toast.success(t("privatizationToast"));
                }}
                className="w-full sm:w-auto rounded-full border border-white/30 bg-white/10 text-white hover:bg-white/20 text-xs font-bold uppercase tracking-wider py-4 px-6"
              >
                {t("privatizationCta")}
              </Button>
            </div>
          </div>

          {/* Right Column: Reservation Form Card (7 cols) */}
          <div className="lg:col-span-7">
            <div className="rounded-[2.5rem] bg-white dark:bg-[#1c1917] p-6 sm:p-10 shadow-2xl border border-[#e7e5e4] dark:border-white/10">
              {done ? (
                <div className="flex flex-col items-center py-16 text-center space-y-4">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <CalendarCheck className="size-8" />
                  </div>
                  <h2 className="font-display text-2xl font-bold">{t("successTitle")}</h2>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    {t("successText")}
                  </p>
                  <Button
                    onClick={() => setDone(false)}
                    className="mt-4 rounded-full bg-[#cd6133] hover:bg-[#b55026] text-white px-6 py-2 text-xs uppercase font-bold"
                  >
                    {t("newRequest")}
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                  noValidate
                >
                  <div>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1a1715] dark:text-white">
                      {t("formTitle")}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#78716c] dark:text-gray-400 mt-1">
                      {t("formSubtitle")}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date" className="font-bold text-foreground dark:text-white">{t("date")} <span className="ml-2 inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-500 ring-1 ring-inset ring-red-500/20">{t("required")}</span></Label>
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
                                {field.value ? (
                                  format(parseISO(field.value), "PPP", { locale: dateFnsLocale(locale) })
                                ) : (
                                  <span>{t("pickDate")}</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                locale={dateFnsLocale(locale)}
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
                      <Label htmlFor="time" className="font-bold text-foreground dark:text-white">{t("time")} <span className="ml-2 inline-flex items-center rounded-md bg-red-500/20 px-2 py-1 text-[10px] font-medium text-red-500 ring-1 ring-inset ring-red-500/20">{t("required")}</span></Label>
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
                    <Label htmlFor="party_size" className="font-bold text-foreground dark:text-white">{t("partySize")} <span className="ml-2 inline-flex items-center rounded-md bg-red-500/20 px-2 py-1 text-[10px] font-medium text-red-500 ring-1 ring-inset ring-red-500/20">{t("required")}</span></Label>
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
                    <Label className="font-bold text-foreground dark:text-white">{t("table")}</Label>
                    <Controller
                      control={form.control}
                      name="table_number"
                      render={({ field }) => (
                        <TableSelector value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer_name" className="font-bold text-foreground dark:text-white">{t("name")} <span className="ml-2 inline-flex items-center rounded-md bg-red-500/20 px-2 py-1 text-[10px] font-medium text-red-500 ring-1 ring-inset ring-red-500/20">{t("required")}</span></Label>
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
                    <Label htmlFor="customer_phone" className="font-bold text-foreground dark:text-white">{t("phone")} <span className="ml-2 inline-flex items-center rounded-md bg-red-500/20 px-2 py-1 text-[10px] font-medium text-red-500 ring-1 ring-inset ring-red-500/20">{t("required")}</span></Label>
                    <Input
                      id="customer_phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder={t("phonePlaceholder")}
                      aria-invalid={!!errors.customer_phone}
                      className={cn("bg-white dark:bg-[#18181A] border-gray-200 dark:border-white/5 rounded-xl h-12 text-foreground dark:text-white px-4", errors.customer_phone && "border-destructive focus-visible:ring-destructive")}
                      {...form.register("customer_phone")}
                    />
                    <FieldError message={errors.customer_phone?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="note" className="font-bold text-foreground dark:text-white">{t("note")} <span className="text-[#e2a84a]">{t("optional")}</span></Label>
                    <Textarea
                      id="note"
                      placeholder={t("notePlaceholder")}
                      className="bg-white dark:bg-[#18181A] border-gray-200 dark:border-white/5 rounded-xl min-h-[90px] text-foreground dark:text-white p-4 resize-none"
                      {...form.register("note")}
                    />
                  </div>

                  <Button
                    size="lg"
                    type="submit"
                    className="w-full font-bold shadow-lg h-12 mt-4 rounded-full bg-[#cd6133] hover:bg-[#b55026] text-white uppercase tracking-wider text-xs transition-all duration-300"
                    disabled={submitting}
                  >
                    {submitting ? t("submitting") : t("submit")}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

// ── Shared table definitions ─────────────────────────────────
const TABLE_DEFS_FORM = [
  { id: 1, span: 1, reserved: false },
  { id: 2, span: 2, reserved: false },
  { id: 3, span: 1, reserved: false },
  { id: 4, span: 1, reserved: false },
  { id: 5, span: 1, reserved: true  },
  { id: 6, span: 2, reserved: false },
  { id: 7, span: 1, reserved: false },
  { id: 8, span: 2, reserved: false },
  { id: 9, span: 1, reserved: false },
];

// ── Legend ────────────────────────────────────────────────────
function TableLegendForm() {
  const t = useTranslations("Reservation");

  return (
    <div className="flex items-center gap-4 text-[11px] mt-2 font-medium">
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded-sm bg-primary dark:bg-[#DF6C32]" />
        <span className="text-muted-foreground">{t("legendSelected")}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded-sm bg-muted/80" />
        <span className="text-muted-foreground">{t("legendReserved")}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
        <span className="text-muted-foreground">{t("legendAvailable")}</span>
      </div>
    </div>
  );
}

// ── Grid ──────────────────────────────────────────────────────
function TableGridForm({ value, onSelect }: { value?: number; onSelect: (id: number) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4 mx-auto">
      {TABLE_DEFS_FORM.map((t) => {
        const isSelected = value === t.id;
        const spanCol = t.span === 2 ? "col-span-2" : "col-span-1";
        return (
          <button
            key={t.id}
            type="button"
            disabled={t.reserved}
            onClick={() => onSelect(t.id)}
            className={cn(
              "relative flex items-center justify-center rounded-2xl border-2 border-transparent py-7 font-bold text-lg transition-all",
              spanCol,
              isSelected
                ? "bg-primary text-primary-foreground scale-95 shadow-md border-primary/20 dark:bg-[#DF6C32] dark:text-white dark:border-[#DF6C32]/20"
                : t.reserved
                ? "bg-muted/40 text-muted-foreground opacity-50 cursor-not-allowed"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
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
  );
}

// ── Confirm button ────────────────────────────────────────────
function ConfirmTableButton({ value, onConfirm }: { value?: number; onConfirm?: () => void }) {
  const t = useTranslations("Reservation");

  return (
    <Button
      size="lg"
      type="button"
      onClick={onConfirm}
      className={cn(
        "w-full font-bold shadow-md transition-colors",
        !value
          ? "bg-muted text-muted-foreground hover:bg-muted"
          : "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-[#DF6C32] dark:text-white dark:hover:bg-[#C95A26]"
      )}
    >
      {value ? t("confirmTable", { number: value }) : t("selectTablePrompt")}
    </Button>
  );
}

// ── TableSelector: Drawer on mobile, Dialog on desktop ────────
function TableSelector({
  value,
  onChange,
}: {
  value?: number;
  onChange: (val: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const t = useTranslations("Reservation");

  function handleSelect(id: number) {
    onChange(id);
  }

  function handleConfirm() {
    if (value) setOpen(false);
  }

  // Shared trigger button
  const triggerButton = (
    <Button
      variant="outline"
      className={cn(
        "w-full justify-between font-normal bg-white dark:bg-[#18181A] border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-[#202024] hover:text-foreground dark:hover:text-white rounded-xl h-12 text-foreground dark:text-white px-4",
        !value && "text-muted-foreground"
      )}
    >
      <div className="flex items-center gap-3">
        <Armchair className="size-5 text-[#a16246]" />
        <span className="text-foreground dark:text-white font-medium">
          {value ? t("tableSelected", { number: value }) : t("pickTable")}
        </span>
      </div>
      <span className="text-muted-foreground">&rsaquo;</span>
    </Button>
  );

  // ── Mobile → Drawer ──────────────────────────────────────────
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent className="dark:bg-[#0a0a0c] dark:border-border max-h-[85vh]">
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="text-left px-4">
              <DrawerTitle className="text-lg">{t("pickTable")}</DrawerTitle>
              <TableLegendForm />
            </DrawerHeader>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <TableGridForm value={value} onSelect={handleSelect} />
            </div>
            <DrawerFooter className="pt-2 px-4 pb-6">
              <DrawerClose asChild>
                <ConfirmTableButton value={value} onConfirm={handleConfirm} />
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // ── Desktop → Dialog / Modal ──────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" className="w-full" onClick={() => setOpen(true)}>
        {triggerButton}
      </button>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "sm:max-w-[460px] rounded-2xl p-0 overflow-hidden gap-0",
          "dark:bg-[#0a0a0c] dark:border-border"
        )}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">{t("pickTable")}</DialogTitle>
            <DialogClose asChild>
              <button
                type="button"
                aria-label={t("close")}
                className="w-8 h-8 rounded-full grid place-items-center bg-white/[0.08] border border-white/[0.1] text-white/50 hover:bg-white/[0.14] hover:text-white transition-all"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                </svg>
              </button>
            </DialogClose>
          </div>
          <TableLegendForm />
        </DialogHeader>

        {/* Grid */}
        <div className="p-5 pt-4">
          <TableGridForm value={value} onSelect={handleSelect} />
        </div>

        {/* Confirm */}
        <div className="px-5 pb-6 pt-1">
          <ConfirmTableButton value={value} onConfirm={handleConfirm} />
        </div>
      </DialogContent>
    </Dialog>
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
  const t = useTranslations("Reservation");
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
          {value || <span>{t("pickTime")}</span>}
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
