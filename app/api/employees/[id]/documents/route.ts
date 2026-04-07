import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { storageService } from "@/lib/storage/storage-service";
import { logDocumentEvent } from "@/lib/audit-logger";

// GET - List all documents for an employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: employeeId } = await params;

    const documents = await prisma.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Upload a new document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: employeeId } = await params;
    const formData = await request.formData();

    const file = formData.get("file") as File;
    const documentType = formData.get("documentType") as string;
    const label = formData.get("label") as string | null;

    // Get employee name for audit log
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const employeeName = `${employee.user.firstName} ${employee.user.lastName}`;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!documentType) {
      return NextResponse.json(
        { error: "Document type is required" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX" },
        { status: 400 }
      );
    }

    // Upload file using storage service
    console.log('Starting file upload...');
    const uploadResult = await storageService.upload(
      file,
      file.name,
      `employees/${employeeId}/documents`
    );
    console.log('File uploaded successfully:', uploadResult);

    // Save document metadata to database
    console.log('Prisma object:', prisma);
    console.log('Prisma.employeeDocument:', prisma?.employeeDocument);

    if (!prisma) {
      throw new Error('Prisma client is not initialized');
    }

    const document = await prisma.employeeDocument.create({
      data: {
        employeeId,
        documentType,
        fileName: uploadResult.fileName,
        originalName: file.name,
        filePath: uploadResult.filePath,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        label: label || null,
        uploadedBy: session.user.id,
      },
    });

    // Log document upload
    await logDocumentEvent({
      action: "CREATE",
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      documentId: document.id,
      documentName: file.name,
      employeeName,
      context: {
        documentType,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        label: label || undefined,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error uploading document:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

