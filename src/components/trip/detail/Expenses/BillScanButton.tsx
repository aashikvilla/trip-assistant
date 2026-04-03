import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Loader2, Camera, Upload } from "lucide-react";
import { useBillScan, type ExtractedExpenseData } from "@/hooks/useBillScan";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

interface BillScanButtonProps {
  onExtracted: (data: ExtractedExpenseData) => void;
  onError: (message: string) => void;
  onScanningChange?: (isScanning: boolean) => void;
  disabled?: boolean;
}

export const BillScanButton: React.FC<BillScanButtonProps> = ({
  onExtracted,
  onError,
  onScanningChange,
  disabled = false,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { scan, isScanning } = useBillScan();
  const [showOptions, setShowOptions] = useState(false);

  React.useEffect(() => {
    onScanningChange?.(isScanning);
  }, [isScanning, onScanningChange]);

  const processFile = async (file: File) => {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      onError("Please upload a JPEG, PNG, WEBP, or HEIC image");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      onError("File must be under 10 MB");
      return;
    }
    try {
      const data = await scan(file);
      onExtracted(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Scan failed, please try again";
      onError(message);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await processFile(file);
    setShowOptions(false);
  };

  if (isScanning) {
    return (
      <Button type="button" variant="outline" disabled className="w-full">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Extracting bill details...
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      {!showOptions ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowOptions(true)}
          disabled={disabled}
          className="w-full"
        >
          <Camera className="h-4 w-4 mr-2" />
          Add Bill Photo
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled}
            className="text-sm"
          >
            <Camera className="h-4 w-4 mr-1.5" />
            Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="text-sm"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Upload Image
          </Button>
        </div>
      )}

      {/* Camera capture input (opens camera on mobile PWA) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      {/* Regular file upload input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />
    </div>
  );
};
