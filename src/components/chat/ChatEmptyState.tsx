export function ChatEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 bg-[#212529] rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-2xl">AI</span>
        </div>
        <h3 className="text-[#212529] text-xl font-semibold mb-2">
          Aiola Api APP
        </h3>
        <p className="text-[#6c757d] text-sm leading-relaxed">
          Transcribe voice recordings or upload audio files. Use the microphone
          to record speech or upload files for transcription.
        </p>
      </div>
    </div>
  );
}

