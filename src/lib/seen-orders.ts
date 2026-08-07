"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "darna_seen_orders";
const EVENT_NAME = "darna_seen_orders_updated";

function getStoredSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function markOrderSeen(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const current = getStoredSeenIds();
    if (!current.has(id)) {
      current.add(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(current)));
      window.dispatchEvent(new Event(EVENT_NAME));
    }
  } catch (e) {
    console.error(e);
  }
}

export function markMultipleOrdersSeen(ids: string[]) {
  if (typeof window === "undefined" || !ids.length) return;
  try {
    const current = getStoredSeenIds();
    let updated = false;
    for (const id of ids) {
      if (id && !current.has(id)) {
        current.add(id);
        updated = true;
      }
    }
    if (updated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(current)));
      window.dispatchEvent(new Event(EVENT_NAME));
    }
  } catch (e) {
    console.error(e);
  }
}

export function useSeenOrders(): Set<string> {
  const [seenIds, setSeenIds] = useState<Set<string>>(() => getStoredSeenIds());

  useEffect(() => {
    const handleUpdate = () => {
      setSeenIds(getStoredSeenIds());
    };
    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return seenIds;
}
