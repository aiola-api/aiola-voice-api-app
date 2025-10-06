import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Creates a standardized component class name by converting PascalCase to kebab-case
 * and merging with additional classes for DOM readability and debugging
 *
 * @param componentName - The PascalCase component name (e.g., 'ChatMessage')
 * @param additionalClasses - Additional classes to merge
 * @returns Combined class string with component identifier and additional classes
 *
 * @example
 * componentClassName('ChatMessage', 'bg-white p-4')
 * // Returns: 'chat-message bg-white p-4'
 *
 * @example
 * componentClassName('VoiceControls')
 * // Returns: 'voice-controls'
 */
export function componentClassName(
  componentName: string,
  ...additionalClasses: ClassValue[]
): string {
  // Convert PascalCase to kebab-case
  const kebabCase = componentName
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();

  return cn(kebabCase, ...additionalClasses);
}

/**
 * Creates base component class combinations following SOLID principles
 * Consolidates common patterns to avoid duplication
 *
 * @param baseClass - Base class from base.css (e.g., 'base-button')
 * @param variant - Variant modifier (e.g., 'primary', 'secondary')
 * @param size - Size modifier (e.g., 'sm', 'md', 'lg')
 * @param additionalClasses - Additional classes to merge
 * @returns Combined class string
 *
 * @example
 * baseClassName('base-button', 'primary', 'lg', 'w-full')
 * // Returns: 'base-button base-button--primary base-button--lg w-full'
 */
export function baseClassName(
  baseClass: string,
  variant?: string,
  size?: string,
  ...additionalClasses: ClassValue[]
): string {
  const classes = [baseClass];

  if (variant) {
    classes.push(`${baseClass}--${variant}`);
  }

  if (size) {
    classes.push(`${baseClass}--${size}`);
  }

  return cn(classes, ...additionalClasses);
}

/**
 * Formats duration from milliseconds to a readable counter format
 *
 * @param durationMs - Duration in milliseconds
 * @returns Formatted duration string (e.g., "8.5s", "1m 23s", "1h 2m")
 *
 * @example
 * formatDuration(8500) // Returns: "8.5s"
 * formatDuration(83000) // Returns: "1m 23s"
 * formatDuration(3723000) // Returns: "1h 2m"
 */
export function formatDuration(durationMs?: number): string {
  if (!durationMs || durationMs <= 0) {
    return "0s";
  }

  const totalSeconds = durationMs / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    // Show hours and minutes for long recordings
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    // Show minutes and seconds
    return `${minutes}m ${Math.floor(seconds)}s`;
  } else {
    // Show seconds with one decimal place for short recordings
    return `${seconds.toFixed(1)}s`;
  }
}
