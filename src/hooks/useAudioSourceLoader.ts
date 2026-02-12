import { useState, useCallback } from "react";
import { logger } from "@/lib/logger";

const TAG = "AudioSourceLoader";

export interface AudioSourceError {
  type: "validation" | "fetch" | "cors" | "network" | "file";
  message: string;
}

export type AudioSourceStatus = "idle" | "fetching" | "reading" | "ready";

export interface SourceMetadata {
  source: "url" | "file";
  label: string;
  sourceUrl?: string;
  sourceFileName?: string;
}

export interface LoadResult {
  arrayBuffer: ArrayBuffer;
  metadata: SourceMetadata;
}

const AUDIO_EXTENSIONS = /\.(mp3|wav|mp4|m4a|ogg|flac|webm)$/i;
const ACCEPTED_FILE_TYPES = [".mp3", ".wav", ".mp4", ".m4a", ".ogg", ".flac", ".webm"];
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const LARGE_URL_SIZE = 100 * 1024 * 1024; // 100MB warning threshold

/**
 * Pure data-loading hook for URL and file audio sources.
 * No AudioContext/WebSocket concerns - just fetches/reads data.
 */
export function useAudioSourceLoader() {
  const [error, setError] = useState<AudioSourceError | null>(null);
  const [status, setStatus] = useState<AudioSourceStatus>("idle");

  const validateUrl = useCallback((url: string): boolean => {
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(url)) {
      setError({
        type: "validation",
        message: "Please enter a valid URL (http:// or https://)",
      });
      return false;
    }

    if (!AUDIO_EXTENSIONS.test(url)) {
      setError({
        type: "validation",
        message: "URL must point to an audio file (.mp3, .wav, .mp4, .m4a, .ogg, .flac, .webm)",
      });
      return false;
    }

    setError(null);
    return true;
  }, []);

  const loadFromUrl = useCallback(async (url: string): Promise<LoadResult> => {
    setStatus("fetching");
    setError(null);

    try {
      const response = await fetch(url, { mode: "cors" });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Audio file not found at this URL");
        }
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const contentLength = response.headers.get("Content-Length");
      if (contentLength) {
        const sizeInMB = parseInt(contentLength) / (1024 * 1024);
        if (sizeInMB > LARGE_URL_SIZE / (1024 * 1024)) {
          logger.warn(TAG, `Large file detected (${sizeInMB.toFixed(1)}MB). Streaming may take time.`);
        }
      }

      const arrayBuffer = await response.arrayBuffer();

      setStatus("ready");
      return {
        arrayBuffer,
        metadata: {
          source: "url",
          label: url,
          sourceUrl: url,
        },
      };
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("Failed to fetch")) {
        setError({
          type: "cors",
          message: "Cannot access URL due to CORS restrictions. Ensure the server allows cross-origin requests.",
        });
      } else if (err instanceof Error) {
        setError({
          type: "network",
          message: err.message,
        });
      } else {
        setError({
          type: "network",
          message: "An unexpected error occurred",
        });
      }
      setStatus("idle");
      throw err;
    }
  }, []);

  const loadFromFile = useCallback(async (file: File): Promise<LoadResult> => {
    setStatus("reading");
    setError(null);

    // Validate file type
    const extension = "." + (file.name.split(".").pop()?.toLowerCase() || "");
    if (!ACCEPTED_FILE_TYPES.includes(extension)) {
      const err: AudioSourceError = {
        type: "file",
        message: `File type not supported. Accepted: ${ACCEPTED_FILE_TYPES.join(", ")}`,
      };
      setError(err);
      setStatus("idle");
      throw new Error(err.message);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const err: AudioSourceError = {
        type: "file",
        message: `File too large. Maximum size: ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`,
      };
      setError(err);
      setStatus("idle");
      throw new Error(err.message);
    }

    try {
      const arrayBuffer = await file.arrayBuffer();

      setStatus("ready");
      return {
        arrayBuffer,
        metadata: {
          source: "file",
          label: file.name,
          sourceFileName: file.name,
        },
      };
    } catch (err) {
      const error: AudioSourceError = {
        type: "file",
        message: err instanceof Error ? err.message : "Failed to read file",
      };
      setError(error);
      setStatus("idle");
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setStatus("idle");
  }, []);

  return {
    validateUrl,
    loadFromUrl,
    loadFromFile,
    reset,
    error,
    status,
  };
}
