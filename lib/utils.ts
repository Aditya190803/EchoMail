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
