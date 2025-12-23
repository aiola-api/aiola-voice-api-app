import * as React from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  className?: string;
}

export function Tooltip({ children, content, className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div
      className={cn("relative inline-block", className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)}
    >
      {children}
      {isVisible && (
        <div className="absolute top-full right-0 transform translate-x-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10 whitespace-pre-line max-w-sm min-w-[120px]">
          {content}
          <div className="absolute bottom-full right-0 transform translate-x-0 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-900"></div>
        </div>
      )}
    </div>
  );
}
