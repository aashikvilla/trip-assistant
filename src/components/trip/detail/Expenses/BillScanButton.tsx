import React, { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Loader2, ScanLine } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { scan, isScanning } = useBillScan();

  // Notify parent whenever scanning state changes
  React.useEffect(() => {
    onScanningChange?.(isScanning);
  }, [isScanning, onScanningChange]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so the same file can be re-selected if needed
    e.target.value = "";

    if (!file) return;

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

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleButtonClick}
        disabled={disabled || isScanning}
        className="w-full"
      >
        {isScanning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Scanning...
          </>
        ) : (
          <>
            <ScanLine className="h-4 w-4 mr-2" />
            Scan Bill
          </>
        )}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />
    </>
  );
};
