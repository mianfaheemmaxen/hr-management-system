import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-logger";

// PUT update evaluation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; evaluationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["super_admin", "hr_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: employeeId, evaluationId } = await params;
    const body = await request.json();
    const {
      evaluationType,
      name,
      totalMarks,
      obtainedMarks,
      status,
      notes,
      wasRetaken,
      evaluationDate,
    } = body;

    // Validation
    if (!evaluationType || !name || !status) {
      return NextResponse.json(
        { error: "Evaluation type, name, and status are required" },
        { status: 400 }
      );
    }

    if (!["test", "interview"].includes(evaluationType)) {
      return NextResponse.json(
        { error: "Invalid evaluation type. Must be 'test' or 'interview'" },
        { status: 400 }
      );
    }

    if (!["pass", "fail"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'pass' or 'fail'" },
        { status: 400 }
      );
    }

    // Validate marks for tests
    if (evaluationType === "test") {
      if (totalMarks !== null && totalMarks !== undefined && obtainedMarks !== null && obtainedMarks !== undefined) {
        if (obtainedMarks > totalMarks) {
          return NextResponse.json(
            { error: "Obtained marks cannot exceed total marks" },
            { status: 400 }
          );
        }
      }
    }

    // Verify evaluation exists
    const existingEvaluation = await prisma.employeeEvaluation.findUnique({
      where: { id: evaluationId },
      include: {
        employee: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!existingEvaluation) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    if (existingEvaluation.employeeId !== employeeId) {
      return NextResponse.json(
        { error: "Evaluation does not belong to this employee" },
        { status: 400 }
      );
    }

    // Update evaluation
    const updatedEvaluation = await prisma.employeeEvaluation.update({
      where: { id: evaluationId },
      data: {
        evaluationType,
        name,
        totalMarks: evaluationType === "test" ? totalMarks : null,
        obtainedMarks: evaluationType === "test" ? obtainedMarks : null,
        status,
        notes: notes || null,
        wasRetaken: wasRetaken || false,
        evaluationDate: evaluationDate ? new Date(evaluationDate) : existingEvaluation.evaluationDate,
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      action: "UPDATE",
      entityType: "employee",
      entityId: employeeId,
      description: `updated ${evaluationType} evaluation "${name}" for ${existingEvaluation.employee.user.firstName} ${existingEvaluation.employee.user.lastName}`,
      oldValue: {
        evaluationId: existingEvaluation.id,
        evaluationType: existingEvaluation.evaluationType,
        name: existingEvaluation.name,
        status: existingEvaluation.status,
        totalMarks: existingEvaluation.totalMarks,
        obtainedMarks: existingEvaluation.obtainedMarks,
      },
      newValue: {
        evaluationId: updatedEvaluation.id,
        evaluationType,
        name,
        status,
        totalMarks,
        obtainedMarks,
      },
    });

    return NextResponse.json(updatedEvaluation);
  } catch (error) {
    console.error("Error updating evaluation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE evaluation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; evaluationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["super_admin", "hr_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: employeeId, evaluationId } = await params;

    // Verify evaluation exists
    const evaluation = await prisma.employeeEvaluation.findUnique({
      where: { id: evaluationId },
      include: {
        employee: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!evaluation) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    if (evaluation.employeeId !== employeeId) {
      return NextResponse.json(
        { error: "Evaluation does not belong to this employee" },
        { status: 400 }
      );
    }

    // Delete evaluation
    await prisma.employeeEvaluation.delete({
      where: { id: evaluationId },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      action: "DELETE",
      entityType: "employee",
      entityId: employeeId,
      description: `deleted ${evaluation.evaluationType} evaluation "${evaluation.name}" for ${evaluation.employee.user.firstName} ${evaluation.employee.user.lastName}`,
      oldValue: {
        evaluationId: evaluation.id,
        evaluationType: evaluation.evaluationType,
        name: evaluation.name,
        status: evaluation.status,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting evaluation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

