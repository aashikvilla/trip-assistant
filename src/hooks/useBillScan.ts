import { useState } from "react";

export interface ExtractedExpenseData {
  amount?: number;
  description?: string;
  date?: string;
  category?: "food" | "travel" | "accommodation" | "activities" | "others";
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix ("data:<mime>;base64,")
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to encode image"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function useBillScan() {
  const [isScanning, setIsScanning] = useState(false);

  async function scan(file: File): Promise<ExtractedExpenseData> {
    setIsScanning(true);
    try {
      const imageBase64 = await readFileAsBase64(file);

      const response = await fetch("/api/ai/scan-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: file.type }),
      });

      if (!response.ok) {
        let message = "Scan failed, please try again";
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          // ignore parse error
        }

        if (response.status === 401) message = "Please sign in to scan bills";
        else if (response.status === 400) message = "Invalid image data";
        else if (response.status === 422) message = "Could not read receipt, please enter values manually";
        else if (response.status === 504) message = "Scan timed out, please try again";
        else if (response.status === 502) message = "AI service unavailable, please try again";

        throw new Error(message);
      }

      const data = (await response.json()) as ExtractedExpenseData;
      return data;
    } finally {
      setIsScanning(false);
    }
  }

  return { scan, isScanning };
}
