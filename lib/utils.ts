import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes conditionally
 * Combines clsx for conditional classes and tailwind-merge to handle conflicts
 *
 * @param inputs - Class values to merge (strings, arrays, objects)
 * @returns Merged and deduplicated class string
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-blue-500", { "text-white": isLight })
 * // Returns merged classes with proper Tailwind precedence
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string or object into a human-readable format
 *
 * @param date - Date string or object
 * @returns Formatted date string
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Get a cookie value by name (client-side)
 *
 * @param name - Name of the cookie to retrieve
 * @returns Cookie value or undefined if not found
 */
export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
  return undefined;
}
