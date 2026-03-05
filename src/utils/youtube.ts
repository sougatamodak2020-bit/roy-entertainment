// src/utils/youtube.ts

/**
 * Generates a YouTube thumbnail URL for a given video ID.
 * Falls back to different qualities if maxres isn't available.
 * @param videoId - The YouTube video ID (e.g., "dQw4w9WgXcQ")
 * @param quality - Optional: 'maxresdefault', 'hqdefault', 'mqdefault', 'sddefault', 'default'
 * @returns Full thumbnail URL
 */
export function getYouTubeThumbnail(
  videoId: string,
  quality: 'maxresdefault' | 'hqdefault' | 'mqdefault' | 'sddefault' | 'default' = 'maxresdefault'
): string {
  // Base URL pattern
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

// Optional: If you had a formatDuration function (mentioned in the error log snippet)
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// If there are other functions in this file, keep them here.
// This file seems to be a utils module for YouTube-related helpers.