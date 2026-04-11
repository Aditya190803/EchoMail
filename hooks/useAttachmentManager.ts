import { useCallback } from "react";

import { toast } from "sonner";

import type { ComposeAttachment } from "@/components/compose/compose-types";
import {
  LARGE_FILE_THRESHOLD,
  uploadAttachmentFile,
} from "@/lib/attachments/client";
import { componentLogger } from "@/lib/client-logger";

interface UseAttachmentManagerParams {
  setAttachments: React.Dispatch<React.SetStateAction<ComposeAttachment[]>>;
  setIsUploading: (isUploading: boolean) => void;
}

export function useAttachmentManager({
  setAttachments,
  setIsUploading,
}: UseAttachmentManagerParams) {
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      if (!files.length) {
        return;
      }

      const processingAttachments: ComposeAttachment[] = [];
      const baseId =
        Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const tempId = `temp_${baseId}_${index}_${Math.random().toString(36).substring(2, 7)}`;
        processingAttachments.push({
          tempId,
          name: file.name,
          type: file.type || "application/octet-stream",
          data: "processing",
          fileSize: file.size,
          isProcessing: true,
        });
      }

      setAttachments((prev) => [...prev, ...processingAttachments]);
      setIsUploading(true);

      const fileArray = Array.from(files);
      const processPromises = fileArray.map(async (file, index) => {
        const tempId = processingAttachments[index].tempId;

        if (file.size < LARGE_FILE_THRESHOLD) {
          try {
            componentLogger.debug(`Encoding file to base64`, {
              name: file.name,
            });
            const base64 = await fileToBase64(file);
            componentLogger.debug(`Encoded file`, { name: file.name });

            setAttachments((prev) =>
              prev.map((attachment) =>
                attachment.tempId === tempId
                  ? {
                      ...attachment,
                      data: base64,
                      isProcessing: false,
                      tempId: undefined,
                    }
                  : attachment,
              ),
            );
            return { success: true, name: file.name };
          } catch (error) {
            componentLogger.error(
              `Error reading file ${file.name}`,
              error instanceof Error ? error : undefined,
            );
            setAttachments((prev) =>
              prev.filter((attachment) => attachment.tempId !== tempId),
            );
            return { success: false, name: file.name, error };
          }
        }

        try {
          componentLogger.debug(`Uploading file to Appwrite`, {
            name: file.name,
          });
          const upload = await uploadAttachmentFile(file);
          componentLogger.debug(`Uploaded file to Appwrite`, {
            name: file.name,
          });

          setAttachments((prev) =>
            prev.map((attachment) =>
              attachment.tempId === tempId
                ? {
                    ...attachment,
                    data: "appwrite",
                    appwriteFileId: upload.fileId,
                    appwriteUrl: upload.url,
                    isProcessing: false,
                    tempId: undefined,
                  }
                : attachment,
            ),
          );
          return { success: true, name: file.name };
        } catch (error) {
          componentLogger.error(
            `Error uploading file ${file.name}`,
            error instanceof Error ? error : undefined,
          );
          setAttachments((prev) =>
            prev.filter((attachment) => attachment.tempId !== tempId),
          );
          return { success: false, name: file.name, error };
        }
      });

      const results = await Promise.all(processPromises);
      const successCount = results.filter((result) => result.success).length;
      const failCount = results.filter((result) => !result.success).length;

      if (failCount > 0) {
        toast.error(`${failCount} file(s) failed to process`);
      }
      if (successCount > 0) {
        toast.success(`${successCount} file(s) ready`);
      }

      setIsUploading(false);
    },
    [setAttachments, setIsUploading],
  );

  const removeAttachment = useCallback(
    (index: number) => {
      setAttachments((prev) =>
        prev.filter((_, currentIndex) => currentIndex !== index),
      );
    },
    [setAttachments],
  );

  return {
    handleFileUpload,
    removeAttachment,
  };
}
