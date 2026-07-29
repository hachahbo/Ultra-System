"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, UtensilsCrossed } from "lucide-react";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import { formatPrice } from "@/lib/format";
import type { Category, Item } from "@/lib/types";

const FALLBACK_DISH_IMAGE = "/images/hero-default.webp";
const ACCENT = "#FF6B35";

const DISH_SAMPLE_IMAGES = [
  "/Gemini_Generated_Image_vli73mvli73mvli7.png",
  "/Gemini_Generated_Image_skvgn6skvgn6skvg.png",
  "/Gemini_Generated_Image_jx10yxjx10yxjx10.png",
  "/Gemini_Generated_Image_eepocveepocveepo (1).png",
  "/Gemini_Generated_Image_5954x25954x25954 (1).png",
  "/hero-pop-default.webp",
];

// Card geometry — the 352x524 ratio of the design, scaled to whatever width
// the column gives us. The horizontal step between neighbours keeps the
// design's 250/352 proportion so the fan reads the same at every size.
const CARD_RATIO = 524 / 352;
const STEP_RATIO = 250 / 352;
const MIN_CARD_W = 236;
const MAX_CARD_W = 330;
const DEFAULT_CARD_W = 300; // used for SSR, before the column is measured

// useLayoutEffect warns when React renders this on the server; the measuring
// pass only ever matters in the browser anyway.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** One card's worth of data: a category plus a few of its dishes. */
type CategoryCard = {
  id: string;
  title: string;
  iconUrl: string;
  items: { id: string; name: string; desc: string; imageUrl: string }[];
};

/**
 * 3D coverflow of menu categories. The active card sits flat and centred;
 * neighbours fan out behind it, rotated, scaled down and progressively
 * blurred. Navigable by arrows, dots, drag/swipe, clicking a side card, and
 * the left/right keys while the carousel has focus.
 */
export function CategoryCarousel({
  categories,
  items,
  slug,
  currency,
  itemsPerCard = 3,
}: {
  categories: Category[];
  items: Item[];
  slug: string;
  currency: string;
  itemsPerCard?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [cardW, setCardW] = useState(DEFAULT_CARD_W);
  const stageRef = useRef<HTMLDivElement>(null);

  // Only categories that actually have something in stock to show.
  const cards = useMemo<CategoryCard[]>(() => {
    let imgIdx = 0;
    return categories
      .map((c) => {
        const inStock = items.filter((i) => i.category_id === c.id && i.in_stock);
        return {
          id: c.id,
          title: c.name_fr,
          iconUrl: "/pure-eraser-result.svg",
          items: inStock.slice(0, itemsPerCard).map((i) => {
            const assignedImg = i.image_url || DISH_SAMPLE_IMAGES[imgIdx % DISH_SAMPLE_IMAGES.length];
            imgIdx++;
            return {
              id: i.id,
              name: i.name_fr,
              desc: i.description_fr || formatPrice(i.base_price, currency),
              imageUrl: assignedImg,
            };
          }),
        };
      })
      .filter((c) => c.items.length > 0);
  }, [categories, items, currency, itemsPerCard]);

  const n = cards.length;
  // Clamped during render rather than corrected in an effect, so a menu that
  // shrinks underneath us can never point at a card that no longer exists.
  const activeIndex = n > 0 ? Math.min(active, n - 1) : 0;

  const go = useCallback(
    (i: number) => {
      if (n === 0) return;
      setActive(((i % n) + n) % n);
    },
    [n],
  );
  const next = useCallback(() => go(activeIndex + 1), [go, activeIndex]);
  const prev = useCallback(() => go(activeIndex - 1), [go, activeIndex]);

  // Size the cards to the column. useLayoutEffect so the first painted frame
  // already has the real width rather than the SSR default.
  useIsomorphicLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const available = el.clientWidth;
      setCardW(Math.round(Math.min(MAX_CARD_W, Math.max(MIN_CARD_W, available * 0.62))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function handleDragEnd(_: unknown, info: PanInfo) {
    // Either a decisive flick or a drag past a third of a card advances.
    const threshold = cardW / 3;
    if (info.offset.x < -threshold || info.velocity.x < -500) next();
    else if (info.offset.x > threshold || info.velocity.x > 500) prev();
  }

  if (n === 0) return null;

  const cardH = Math.round(cardW * CARD_RATIO);
  const step = cardW * STEP_RATIO;

  return (
    <div className="flex w-full flex-col items-center">
      {/* ── Stage ─────────────────────────────────────────── */}
      <div
        ref={stageRef}
        role="group"
        aria-roledescription="carousel"
        aria-label="Catégories du menu"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            next();
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            prev();
          }
        }}
        className="relative w-full outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]/60 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent rounded-[26px]"
        style={{ height: cardH, perspective: 1600 }}
      >
        <motion.div
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
        >
          {cards.map((card, i) => {
            // Signed distance from the active card, wrapped so the fan is
            // symmetrical even when the active card is near either end.
            let off = i - activeIndex;
            if (off > n / 2) off -= n;
            if (off < -n / 2) off += n;
            const a = Math.abs(off);
            const hidden = a > 2;

            const scale = a === 0 ? 1 : a === 1 ? 0.86 : 0.72;
            const opacity = hidden ? 0 : a === 0 ? 1 : a === 1 ? 0.6 : 0.3;
            const x = off * step;
            const rotateY = 0;
            const blur = prefersReducedMotion ? 0 : a >= 2 ? 3 : a === 1 ? 1.2 : 0;

            return (
              <motion.div
                key={card.id}
                initial={false}
                animate={{ x, scale, rotateY, opacity, filter: `blur(${blur}px)` }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : {
                        x: { duration: 0.55, ease: [0.25, 0.8, 0.25, 1] },
                        scale: { duration: 0.55, ease: [0.25, 0.8, 0.25, 1] },
                        rotateY: { duration: 0.55, ease: [0.25, 0.8, 0.25, 1] },
                        opacity: { duration: 0.5 },
                        filter: { duration: 0.5 },
                      }
                }
                onClick={() => {
                  if (off !== 0) go(i);
                }}
                aria-hidden={a !== 0}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: cardW,
                  height: cardH,
                  marginLeft: -cardW / 2,
                  marginTop: -cardH / 2,
                  transformStyle: "preserve-3d",
                  zIndex: 100 - a,
                  pointerEvents: hidden ? "none" : "auto",
                  cursor: off === 0 ? "default" : "pointer",
                }}
              >
                <CategoryCardBody card={card} slug={slug} isActive={off === 0} />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* ── Controls ──────────────────────────────────────── */}
      <div className="mt-8 flex items-center gap-5">
        <button
          type="button"
          onClick={prev}
          aria-label="Catégorie précédente"
          className="flex size-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white transition-colors hover:border-[#FF6B35] hover:bg-[#FF6B35] cursor-pointer"
        >
          <ChevronLeft className="size-5" strokeWidth={2.2} />
        </button>

        <div className="flex items-center gap-2.5">
          {cards.map((card, i) => (
            <button
              key={card.id}
              type="button"
              onClick={() => go(i)}
              aria-label={card.title}
              aria-current={i === activeIndex}
              className={
                i === activeIndex
                  ? "h-2 w-6 rounded-full bg-[#FF6B35] transition-all duration-300 cursor-pointer"
                  : "size-2 rounded-full bg-white/25 transition-all duration-300 hover:bg-white/45 cursor-pointer"
              }
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          aria-label="Catégorie suivante"
          className="flex size-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white transition-colors hover:border-[#FF6B35] hover:bg-[#FF6B35] cursor-pointer"
        >
          <ChevronRight className="size-5" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

function CategoryCardBody({
  card,
  slug,
  isActive,
}: {
  card: CategoryCard;
  slug: string;
  isActive: boolean;
}) {
  return (
    <article
      className="flex size-full flex-col overflow-hidden rounded-[26px] border border-white/[0.07] bg-[#0f171e]"
      style={{
        boxShadow: isActive
          ? `0 40px 80px -30px rgba(0,0,0,.75), 0 0 0 1px ${ACCENT}2e`
          : "0 30px 60px -30px rgba(0,0,0,.6)",
      }}
    >
      {/* Icon panel */}
      <div className="relative flex h-[37%] items-center justify-center border-b border-white/5 bg-[radial-gradient(120%_120%_at_50%_0%,#17222c_0%,#0f171e_100%)]">
        <div
          className={`relative flex items-center justify-center ${
            card.iconUrl.endsWith(".svg") ? "size-[130px]" : "size-[96px]"
          }`}
        >
          <Image
            src={card.iconUrl}
            alt=""
            fill
            sizes="140px"
            className={card.iconUrl.endsWith(".svg") ? "object-contain scale-110" : "object-cover"}
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5 pt-4">
        <h3 className="font-display text-[21px] font-extrabold leading-tight tracking-tight text-white">
          {card.title}
        </h3>
        <p className="mt-1 text-[13px] text-white/55">
          {card.items.length} spécialité{card.items.length > 1 ? "s" : ""}
        </p>

        <ul className="mt-4 flex flex-1 flex-col gap-3">
          {card.items.map((it) => (
            <li key={it.id} className="flex items-center gap-3">
              <div className="relative size-11 flex-none overflow-hidden rounded-full ring-1 ring-white/35 border border-white/20 bg-[#17222c] shadow-md">
                {it.imageUrl ? (
                  <Image src={it.imageUrl} alt={it.name} fill sizes="64px" className="object-cover object-center scale-125" />
                ) : (
                  <div className="grid size-full place-items-center text-white/40">
                    <UtensilsCrossed className="size-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white">{it.name}</div>
                <div className="truncate text-xs text-white/55">{it.desc}</div>
              </div>
            </li>
          ))}
        </ul>

        <Link
          href={`/${slug}/menu`}
          tabIndex={isActive ? 0 : -1}
          className="group mt-4 flex items-center justify-center gap-3 border-t border-white/[0.07] pt-4 text-[11.5px] font-bold uppercase tracking-[2.5px] text-white/60 transition-colors hover:text-[#FF6B35]"
        >
          <span className="h-px w-5 bg-white/25 transition-colors group-hover:bg-[#FF6B35]" />
          Voir la carte
          <span className="h-px w-5 bg-white/25 transition-colors group-hover:bg-[#FF6B35]" />
        </Link>
      </div>
    </article>
  );
}
