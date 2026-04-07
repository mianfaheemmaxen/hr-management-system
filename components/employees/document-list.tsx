"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Download,
  Trash2,
  MoreHorizontal,
  File,
  FileImage,
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

interface DocumentListProps {
  employeeId: string;
  documents: Document[];
  onDocumentDeleted?: () => void;
  canDelete?: boolean;
}

export function DocumentList({
  employeeId,
  documents,
  onDocumentDeleted,
  canDelete = true,
}: DocumentListProps) {
  const { showAlert, showConfirm } = useAlert();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getDocumentTypeLabel = (type: string) => {
    const docType = DOCUMENT_TYPES.find((t) => t.value === type);
    return docType?.label || type;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <FileImage className="h-5 w-5 text-blue-500" />;
    }
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
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
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Upload Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getFileIcon(document.mimeType)}
                  <div>
                    <p className="font-medium">{document.originalName}</p>
                    {document.label && (
                      <p className="text-sm text-muted-foreground">
                        {document.label}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {getDocumentTypeLabel(document.documentType)}
                </Badge>
              </TableCell>
              <TableCell>{formatFileSize(document.fileSize)}</TableCell>
              <TableCell>
                {format(new Date(document.createdAt), "MMM dd, yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deletingId === document.id}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload(document)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    {canDelete && (
                      <DropdownMenuItem
                        onClick={() => handleDelete(document)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

