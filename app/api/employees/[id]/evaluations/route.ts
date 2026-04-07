import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-logger";

// GET all evaluations for an employee
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

    // Fetch all evaluations for this employee
    const evaluations = await prisma.employeeEvaluation.findMany({
      where: { employeeId },
      orderBy: { evaluationDate: "desc" },
    });

    // Transform dates to ISO strings
    const transformedEvaluations = evaluations.map((evaluation) => ({
      id: evaluation.id,
      employeeId: evaluation.employeeId,
      evaluationType: evaluation.evaluationType,
      name: evaluation.name,
      totalMarks: evaluation.totalMarks,
      obtainedMarks: evaluation.obtainedMarks,
      status: evaluation.status,
      notes: evaluation.notes,
      wasRetaken: evaluation.wasRetaken,
      evaluationDate: evaluation.evaluationDate.toISOString(),
      createdBy: evaluation.createdBy,
      createdAt: evaluation.createdAt.toISOString(),
      updatedAt: evaluation.updatedAt.toISOString(),
    }));

    return NextResponse.json(transformedEvaluations);
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create new evaluation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["super_admin", "hr_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: employeeId } = await params;
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

    // Verify employee exists
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

    // Create evaluation
    const evaluation = await prisma.employeeEvaluation.create({
      data: {
        employeeId,
        evaluationType,
        name,
        totalMarks: evaluationType === "test" ? totalMarks : null,
        obtainedMarks: evaluationType === "test" ? obtainedMarks : null,
        status,
        notes: notes || null,
        wasRetaken: wasRetaken || false,
        evaluationDate: evaluationDate ? new Date(evaluationDate) : new Date(),
        createdBy: session.user.id,
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      action: "CREATE",
      entityType: "employee",
      entityId: employeeId,
      description: `created ${evaluationType} evaluation "${name}" for ${employee.user.firstName} ${employee.user.lastName}`,
      newValue: {
        evaluationId: evaluation.id,
        evaluationType,
        name,
        status,
      },
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error) {
    console.error("Error creating evaluation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

