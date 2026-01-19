import { useRef, useState, useCallback, useMemo } from "react";
import { useRecoilState } from "recoil";
import { Button } from "@/components/ui/button";
import {
  IconFileUpload,
} from "@tabler/icons-react";
import { conversationState, type ChatMessage } from "@/state/conversation";
import { settingsState, type SettingsState } from "@/state/settings";
import { useSTT } from "@/hooks/useSTT";
import { toast } from "sonner";
import { componentClassName } from "@/lib/utils";
import "./UploadDropzone.css";

// Helper function to get current environment settings
function getCurrentSettings(settings: SettingsState) {
  const env = settings.environment;
  return {
    apiKey: settings[env].connection.apiKey,
    baseUrl: settings[env].connection.baseUrl,
    authBaseUrl: settings[env].connection.authBaseUrl,
    workflowId: settings[env].connection.workflowId,
    environment: env,
    stt: settings[env].stt,
    tts: settings[env].tts,
  };
}

interface UploadDropzoneProps {
  onUploadComplete?: (transcript: string) => void;
}

export function UploadDropzone({ onUploadComplete }: UploadDropzoneProps) {
  const [, setConversation] = useRecoilState(conversationState);
  const [settings] = useRecoilState(settingsState);
  const currentSettings = getCurrentSettings(settings);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { transcribeFile } = useSTT();

  const acceptedTypes = useMemo(() => [".wav", ".mp3", ".mp4"], []);
  const maxFileSize = useMemo(() => 50 * 1024 * 1024, []); // 50MB

  const validateFile = useCallback((file: File): string | null => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!acceptedTypes.includes(extension)) {
      return `File type not supported. Please upload: ${acceptedTypes.join(
        ", "
      )}`;
    }
    if (file.size > maxFileSize) {
      return `File too large. Maximum size: ${Math.round(
        maxFileSize / 1024 / 1024
      )}MB`;
    }
    return null;
  }, [acceptedTypes, maxFileSize]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!currentSettings.apiKey) {
        toast.error("Please configure your API key first");
        return;
      }

      setIsUploading(true);

      // Generate unique conversation session ID for file upload
      const uploadSessionId = `upload_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 6)}`;

      // Create user message for file upload
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: `📁 ${file.name} (${Math.round(file.size / 1024)}KB)`,
        createdAt: Date.now(),
        kind: "STT File",
        status: "processing",
        fileName: file.name,
        fileType: file.type,
        conversation_session_id: uploadSessionId,
      };

      setConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      try {
        // Transcribe file using hook
        const result = await transcribeFile(file);

        const transcript = result.text;

        // Update user message to show processing is complete
        setConversation((prev) => ({
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.id === userMessage.id ? { ...msg, status: "done" } : msg
          ),
        }));

        // Create assistant message with transcription
        const transcriptionMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: transcript,
          createdAt: Date.now(),
          kind: "Transcription",
          status: "done",
          conversation_session_id: uploadSessionId,
        };

        setConversation((prev) => ({
          ...prev,
          messages: [...prev.messages, transcriptionMessage],
        }));

        onUploadComplete?.(transcript);
      } catch (error) {
        console.error("Upload Error:", error);
        toast.error("File upload failed");
        setConversation((prev) => ({
          ...prev,
          messages: prev.messages.filter((msg) => msg.id !== userMessage.id),
        }));
      } finally {
        setIsUploading(false);
      }
    },
    [currentSettings.apiKey, transcribeFile, onUploadComplete, setConversation]
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      handleUpload(file);
    },
    [validateFile, handleUpload]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };


  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  return (
    <div 
      className={`${componentClassName("UploadDropzone", "upload-dropzone")} ${isDragOver ? "drag-over" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        onChange={handleFileInputChange}
        className="upload-dropzone__file-input"
      />

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="upload-dropzone__upload-button"
      >
        <IconFileUpload className="upload-dropzone__upload-icon" />
      </Button>

    </div>
  );
}
