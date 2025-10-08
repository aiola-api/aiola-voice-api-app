import { useRef, useState } from "react";
import { useRecoilState } from "recoil";
import { Button } from "@/components/ui/button";
import {
  IconFileUpload,
  IconFile,
  IconX,
  IconCheck,
} from "@tabler/icons-react";
import { conversationState, type ChatMessage } from "@/state/conversation";
import { settingsState } from "@/state/settings";
import { useSTT } from "@/hooks/useSTT";
import { toast } from "sonner";
import { componentClassName } from "@/lib/utils";
import "./UploadDropzone.css";

// Helper function to get current environment settings
function getCurrentSettings(settings: any) {
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { transcribeFile } = useSTT();

  const acceptedTypes = [".wav", ".mp3", ".mp4"];
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const validateFile = (file: File): string | null => {
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
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setSelectedFile(file);
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    if (!currentSettings.apiKey) {
      toast.error("Please configure your API key first");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

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
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      // Transcribe file using hook
      const result = await transcribeFile(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

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

      setSelectedFile(null);
      onUploadComplete?.(transcript);
    } catch (error) {
      console.error("Upload Error:", error);
      toast.error("File upload failed");
      setConversation((prev) => ({
        ...prev,
        messages: prev.messages.filter((msg) => msg.id !== userMessage.id),
      }));
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={componentClassName("UploadDropzone", "upload-dropzone")}>
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
        disabled
        className="upload-dropzone__upload-button"
      >
        <IconFileUpload className="upload-dropzone__upload-icon" />
      </Button>

      {selectedFile && (
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3 min-w-0 border border-slate-200 dark:border-slate-600">
          <IconFile className="h-4 w-4 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {selectedFile.name}
            </div>
            {isUploading && (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(uploadProgress)}%
                </span>
              </div>
            )}
            {!isUploading && uploadProgress === 100 && (
              <div className="flex items-center gap-1 text-green-600">
                <IconCheck className="h-3 w-3" />
                <span className="text-xs">Complete</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFile}
            className="h-6 w-6 p-0"
          >
            <IconX className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
