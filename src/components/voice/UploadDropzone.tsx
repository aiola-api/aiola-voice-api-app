import { useRef, useState, useCallback, useMemo } from "react";
import { useRecoilState } from "recoil";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconFileUpload,
} from "@tabler/icons-react";
import { conversationState, type ChatMessage } from "@/state/conversation";
import { settingsState, type SettingsState } from "@/state/settings";
import { useSTT } from "@/hooks/useSTT";
import { useBufferStreamPipeline } from "@/hooks/useBufferStreamPipeline";
import { useAudioSourceLoader } from "@/hooks/useAudioSourceLoader";
import { toast } from "sonner";
import { componentClassName } from "@/lib/utils";
import { StreamSourcePanel } from "./StreamSourcePanel";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { transcribeFile } = useSTT();
  const { startBufferStream, stopBufferStream, isStreaming: isBufferStreaming } = useBufferStreamPipeline();
  const loader = useAudioSourceLoader();

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
        .substring(2, 8)}`;

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

  // Stream handlers (URL or local file)
  const handleStartStream = useCallback(async (source: string | File) => {
    if (!currentSettings.apiKey) {
      toast.error("Please configure your API key first");
      return;
    }

    try {
      const result = typeof source === "string"
        ? await loader.loadFromUrl(source)
        : await loader.loadFromFile(source);

      setDialogOpen(false);

      // Get keywords and schema values from settings
      const keywords = currentSettings.stt.keywords || [];
      const keywordsObj: Record<string, string> = {};
      keywords.forEach((keyword: string) => {
        keywordsObj[keyword] = keyword;
      });
      const schemaValues = currentSettings.stt.schemaValues || {};

      startBufferStream(result.arrayBuffer, result.metadata, keywordsObj, schemaValues);
    } catch {
      // Error is already set in loader state
    }
  }, [currentSettings.apiKey, currentSettings.stt.keywords, currentSettings.stt.schemaValues, loader, startBufferStream]);

  const handleStopStream = useCallback(() => {
    stopBufferStream();
  }, [stopBufferStream]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isUploading || isBufferStreaming}
          className={componentClassName("UploadDropzone", "upload-dropzone__trigger-button")}
        >
          <IconFileUpload className="upload-dropzone__upload-icon" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] upload-dropzone-dialog">
        <DialogHeader>
          <DialogTitle>Transcribe or Stream Audio</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="file" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">Transcribe File</TabsTrigger>
            <TabsTrigger value="stream">Stream File</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-4 space-y-4">
            <div
              className={`upload-dropzone__dropzone ${isDragOver ? "drag-over" : ""}`}
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

              <div className="upload-dropzone__dropzone-content">
                <IconFileUpload size={48} className="upload-dropzone__dropzone-icon" />
                <h3 className="upload-dropzone__dropzone-title">
                  Drop audio file here
                </h3>
                <p className="upload-dropzone__dropzone-description">
                  or click to browse
                </p>
                <p className="upload-dropzone__dropzone-hint">
                  Supported: {acceptedTypes.join(", ")} (max {Math.round(maxFileSize / 1024 / 1024)}MB)
                </p>
              </div>

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="upload-dropzone__browse-button"
              >
                Browse Files
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="stream" className="mt-4 space-y-4">
            <StreamSourcePanel
              onStartStream={handleStartStream}
              onStopStream={handleStopStream}
              isStreaming={isBufferStreaming}
              error={loader.error}
              status={loader.status}
              validateUrl={loader.validateUrl}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
