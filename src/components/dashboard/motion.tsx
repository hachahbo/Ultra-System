"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Staggered mount fade used across dashboard cards/sections. Honors
 * prefers-reduced-motion by dropping the y-translate and duration to 0
 * (CountUp inside children still jumps straight to value on its own).
 */
export function FadeUp({
  children,
  delay = 0,
  className,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.22, delay: reduced ? 0 : delay, ease: EASE }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
