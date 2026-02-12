import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

const TAG = "CopyButton";

interface CopyButtonProps {
  value: string;
}

export function CopyButton({ value }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      const displayValue = value.length > 20 
        ? `${value.substring(0, 10)}...${value.substring(value.length - 5)}`
        : value;
      
      toast.success(`Copied: ${displayValue}`);
    } catch (err) {
      logger.error(TAG, "Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="config-dialog__copy-button"
      title="Copy to clipboard"
      type="button"
    >
      {copied ? (
        <Check size={14} className="config-dialog__copy-icon--success" />
      ) : (
        <Copy size={14} />
      )}
    </button>
  );
}
