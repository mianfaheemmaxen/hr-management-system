"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Download,
  Trash2,
  File,
  FileImage,
  Eye,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useAlert } from "@/components/ui/use-alert";
import { DOCUMENT_TYPES } from "./document-upload";

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  label?: string;
  createdAt: string;
}

interface DocumentPreviewGridProps {
  employeeId: string;
  documents: Document[];
  onDocumentDeleted?: () => void;
  canDelete?: boolean;
}

export function DocumentPreviewGrid({
  employeeId,
  documents,
  onDocumentDeleted,
  canDelete = true,
}: DocumentPreviewGridProps) {
  const { showAlert, showConfirm } = useAlert();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const getDocumentTypeLabel = (type: string) => {
    const docType = DOCUMENT_TYPES.find((t) => t.value === type);
    return docType?.label || type;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  const isImage = (mimeType: string) => {
    return mimeType.startsWith("image/");
  };

  const isPDF = (mimeType: string) => {
    return mimeType === "application/pdf";
  };

  const isDocx = (mimeType: string) => {
    return (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    );
  };

  const canPreview = (mimeType: string) => {
    return isImage(mimeType) || isPDF(mimeType) || isDocx(mimeType);
  };

  const handlePreview = async (document: Document) => {
    setPreviewDocument(document);

    if (canPreview(document.mimeType)) {
      try {
        const response = await fetch(
          `/api/employees/${employeeId}/documents/${document.id}`
        );
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      } catch (error) {
        console.error("Failed to load preview:", error);
      }
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewDocument(null);
    setPreviewUrl(null);
  };

  const handleDownload = async (document: Document) => {
    try {
      const response = await fetch(
        `/api/employees/${employeeId}/documents/${document.id}`
      );

      if (!response.ok) {
        throw new Error("Failed to download document");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = document.originalName;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);

      showAlert({
        type: "success",
        message: "Document downloaded successfully",
      });
    } catch (error) {
      showAlert({
        type: "error",
        message: "Failed to download document",
      });
    }
  };

  const handleDelete = async (document: Document) => {
    const confirmed = await showConfirm({
      title: "Delete Document",
      message: `Are you sure you want to delete "${document.originalName}"? This action cannot be undone.`,
    });

    if (!confirmed) return;

    setDeletingId(document.id);

    try {
      const response = await fetch(
        `/api/employees/${employeeId}/documents/${document.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      showAlert({
        type: "success",
        message: "Document deleted successfully",
      });
      if (onDocumentDeleted) {
        onDocumentDeleted();
      }
    } catch (error) {
      showAlert({
        type: "error",
        message: "Failed to delete document",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <File className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {documents.map((document) => (
          <Card key={document.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative aspect-video bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
              {isImage(document.mimeType) ? (
                <img
                  src={`/uploads/${document.filePath}`}
                  alt={document.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to icon if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="flex items-center justify-center w-full h-full"><svg class="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                    }
                  }}
                />
              ) : isPDF(document.mimeType) ? (
                <div className="flex flex-col items-center justify-center">
                  <FileText className="h-16 w-16 text-red-500 mb-2" />
                  <span className="text-xs text-gray-600 font-medium">PDF Document</span>
                </div>
              ) : isDocx(document.mimeType) ? (
                <div className="flex flex-col items-center justify-center">
                  <FileText className="h-16 w-16 text-blue-500 mb-2" />
                  <span className="text-xs text-gray-600 font-medium">Word Document</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <File className="h-16 w-16 text-gray-500 mb-2" />
                  <span className="text-xs text-gray-600 font-medium">Document</span>
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs shadow-sm">
                  {getDocumentTypeLabel(document.documentType)}
                </Badge>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div>
                  <p className="font-medium text-sm truncate" title={document.originalName}>
                    {document.originalName}
                  </p>
                  {document.label && (
                    <p className="text-xs text-muted-foreground truncate">
                      {document.label}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatFileSize(document.fileSize)}</span>
                  <span>{format(new Date(document.createdAt), "MMM dd, yyyy")}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePreview(document)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(document)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(document)}
                      disabled={deletingId === document.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewDocument} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{previewDocument?.originalName}</DialogTitle>
            <DialogDescription>
              {previewDocument && (
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="outline">
                    {getDocumentTypeLabel(previewDocument.documentType)}
                  </Badge>
                  <span>{formatFileSize(previewDocument.fileSize)}</span>
                  <span>{format(new Date(previewDocument.createdAt), "MMMM dd, yyyy")}</span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {previewDocument && previewUrl && (
              <>
                {isImage(previewDocument.mimeType) && (
                  <div className="relative w-full">
                    <img
                      src={previewUrl}
                      alt={previewDocument.originalName}
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                )}
                {isPDF(previewDocument.mimeType) && (
                  <iframe
                    src={previewUrl}
                    className="w-full h-150 rounded-lg border"
                    title={previewDocument.originalName}
                  />
                )}
                {isDocx(previewDocument.mimeType) && (
                  <div className="space-y-4">
                    <iframe
                      src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + '/api/employees/' + employeeId + '/documents/' + previewDocument.id)}`}
                      className="w-full h-150 rounded-lg border"
                      title={previewDocument.originalName}
                    />
                    <div className="text-sm text-muted-foreground text-center">
                      If preview doesn't load, try downloading the document
                    </div>
                  </div>
                )}
              </>
            )}
            {previewDocument && !canPreview(previewDocument.mimeType) && (
              <div className="text-center py-12">
                <File className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Preview not available for this file type
                </p>
                <Button onClick={() => handleDownload(previewDocument)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download to View
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


