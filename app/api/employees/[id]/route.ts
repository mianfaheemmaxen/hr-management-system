import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logEmployeeEvent } from "@/lib/audit-logger";

// GET single employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
          },
        },
        department: true,
        manager: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const transformed = {
      id: employee.id,
      odooEmployeeId: employee.employeeCode,
      firstName: employee.user.firstName,
      lastName: employee.user.lastName,
      email: employee.user.email,
      phone: employee.phone || "",
      department: employee.department?.name || "",
      departmentId: employee.departmentId,
      designation: employee.designation || "",
      managerId: employee.managerId,
      managerName: employee.manager ? `${employee.manager.user.firstName} ${employee.manager.user.lastName}` : null,
      role: employee.user.role,
      status: employee.status,
      employmentStatus: employee.employmentStatus,
      dateOfJoining: employee.dateOfJoining.toISOString().split("T")[0],
      employeeId: employee.employeeCode,
      biometricId: employee.biometricId || "",
      gender: employee.gender || null,
      dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.toISOString().split("T")[0] : null,
      nationality: employee.nationality || null,
      probationCompleteDate: employee.probationCompleteDate ? employee.probationCompleteDate.toISOString().split("T")[0] : null,
      emergencyContactName: employee.emergencyContactName || null,
      emergencyContactNumber: employee.emergencyContactNumber || null,
      emergencyContactRelation: employee.emergencyContactRelation || null,
      cnicNumber: employee.cnicNumber || null,
      passportNumber: employee.passportNumber || null,
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["super_admin", "hr_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      firstName, lastName, email, phone, departmentId, designation, managerId, role, status, isActive,
      employmentStatus, biometricId, gender, dateOfJoining,
      dateOfBirth, nationality, probationCompleteDate, emergencyContactName,
      emergencyContactNumber, emergencyContactRelation, cnicNumber, passportNumber
    } = body;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: true,
        department: true,
        manager: {
          include: {
            user: true
          }
        }
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Track changes for history
    const historyRecords: any[] = [];
    const changedBy = session.user.id;

    // Build update data for user (only include fields that are provided)
    const userUpdateData: any = {};
    if (firstName !== undefined && firstName !== employee.user.firstName) {
      userUpdateData.firstName = firstName;
      historyRecords.push({
        employeeId: id,
        field: "firstName",
        oldValue: employee.user.firstName,
        newValue: firstName,
        changedBy,
      });
    }
    if (lastName !== undefined && lastName !== employee.user.lastName) {
      userUpdateData.lastName = lastName;
      historyRecords.push({
        employeeId: id,
        field: "lastName",
        oldValue: employee.user.lastName,
        newValue: lastName,
        changedBy,
      });
    }
    if (email !== undefined && email !== employee.user.email) {
      userUpdateData.email = email;
      historyRecords.push({
        employeeId: id,
        field: "email",
        oldValue: employee.user.email,
        newValue: email,
        changedBy,
      });
    }
    if (role !== undefined && role !== employee.user.role) {
      userUpdateData.role = role;
      historyRecords.push({
        employeeId: id,
        field: "role",
        oldValue: employee.user.role,
        newValue: role,
        changedBy,
      });
    }
    if (isActive !== undefined && isActive !== employee.user.isActive) {
      userUpdateData.isActive = isActive;
      historyRecords.push({
        employeeId: id,
        field: "isActive",
        oldValue: employee.user.isActive.toString(),
        newValue: isActive.toString(),
        changedBy,
      });
    }

    // Build update data for employee (only include fields that are provided)
    const employeeUpdateData: any = {};
    if (phone !== undefined && phone !== employee.phone) {
      employeeUpdateData.phone = phone;
      historyRecords.push({
        employeeId: id,
        field: "phone",
        oldValue: employee.phone || "",
        newValue: phone,
        changedBy,
      });
    }
    if (designation !== undefined && designation !== employee.designation) {
      employeeUpdateData.designation = designation;
      historyRecords.push({
        employeeId: id,
        field: "designation",
        oldValue: employee.designation || "",
        newValue: designation,
        changedBy,
      });
    }
    if (status !== undefined && status !== employee.status) {
      employeeUpdateData.status = status;
      historyRecords.push({
        employeeId: id,
        field: "status",
        oldValue: employee.status,
        newValue: status,
        changedBy,
      });
    }
    if (employmentStatus !== undefined && employmentStatus !== employee.employmentStatus) {
      employeeUpdateData.employmentStatus = employmentStatus;
      historyRecords.push({
        employeeId: id,
        field: "employmentStatus",
        oldValue: employee.employmentStatus,
        newValue: employmentStatus,
        changedBy,
      });
    }
    if (biometricId !== undefined && biometricId !== employee.biometricId) {
      employeeUpdateData.biometricId = biometricId || null;
      historyRecords.push({
        employeeId: id,
        field: "biometricId",
        oldValue: employee.biometricId || "",
        newValue: biometricId || "",
        changedBy,
      });
    }
    if (gender !== undefined && gender !== employee.gender) {
      employeeUpdateData.gender = gender || null;
      historyRecords.push({
        employeeId: id,
        field: "gender",
        oldValue: employee.gender || "",
        newValue: gender || "",
        changedBy,
      });
    }
    if (dateOfJoining !== undefined) {
      const newDateOfJoining = dateOfJoining ? new Date(dateOfJoining) : null;
      const oldDateOfJoining = employee.dateOfJoining;
      if (newDateOfJoining && oldDateOfJoining && newDateOfJoining.getTime() !== oldDateOfJoining.getTime()) {
        employeeUpdateData.dateOfJoining = newDateOfJoining;
        historyRecords.push({
          employeeId: id,
          field: "dateOfJoining",
          oldValue: oldDateOfJoining.toISOString().split('T')[0],
          newValue: newDateOfJoining.toISOString().split('T')[0],
          changedBy,
        });
      }
    }
    if (dateOfBirth !== undefined) {
      const newDateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      const oldDateOfBirth = employee.dateOfBirth;
      if (newDateOfBirth?.getTime() !== oldDateOfBirth?.getTime()) {
        employeeUpdateData.dateOfBirth = newDateOfBirth;
        historyRecords.push({
          employeeId: id,
          field: "dateOfBirth",
          oldValue: oldDateOfBirth ? oldDateOfBirth.toISOString().split('T')[0] : "",
          newValue: newDateOfBirth ? newDateOfBirth.toISOString().split('T')[0] : "",
          changedBy,
        });
      }
    }
    if (nationality !== undefined && nationality !== employee.nationality) {
      employeeUpdateData.nationality = nationality || null;
      historyRecords.push({
        employeeId: id,
        field: "nationality",
        oldValue: employee.nationality || "",
        newValue: nationality || "",
        changedBy,
      });
    }
    if (probationCompleteDate !== undefined) {
      const newProbationDate = probationCompleteDate ? new Date(probationCompleteDate) : null;
      const oldProbationDate = employee.probationCompleteDate;
      if (newProbationDate?.getTime() !== oldProbationDate?.getTime()) {
        employeeUpdateData.probationCompleteDate = newProbationDate;
        historyRecords.push({
          employeeId: id,
          field: "probationCompleteDate",
          oldValue: oldProbationDate ? oldProbationDate.toISOString().split('T')[0] : "",
          newValue: newProbationDate ? newProbationDate.toISOString().split('T')[0] : "",
          changedBy,
        });
      }
    }
    if (emergencyContactName !== undefined && emergencyContactName !== employee.emergencyContactName) {
      employeeUpdateData.emergencyContactName = emergencyContactName || null;
      historyRecords.push({
        employeeId: id,
        field: "emergencyContactName",
        oldValue: employee.emergencyContactName || "",
        newValue: emergencyContactName || "",
        changedBy,
      });
    }
    if (emergencyContactNumber !== undefined && emergencyContactNumber !== employee.emergencyContactNumber) {
      employeeUpdateData.emergencyContactNumber = emergencyContactNumber || null;
      historyRecords.push({
        employeeId: id,
        field: "emergencyContactNumber",
        oldValue: employee.emergencyContactNumber || "",
        newValue: emergencyContactNumber || "",
        changedBy,
      });
    }
    if (emergencyContactRelation !== undefined && emergencyContactRelation !== employee.emergencyContactRelation) {
      employeeUpdateData.emergencyContactRelation = emergencyContactRelation || null;
      historyRecords.push({
        employeeId: id,
        field: "emergencyContactRelation",
        oldValue: employee.emergencyContactRelation || "",
        newValue: emergencyContactRelation || "",
        changedBy,
      });
    }
    if (cnicNumber !== undefined && cnicNumber !== employee.cnicNumber) {
      employeeUpdateData.cnicNumber = cnicNumber || null;
      historyRecords.push({
        employeeId: id,
        field: "cnicNumber",
        oldValue: employee.cnicNumber || "",
        newValue: cnicNumber || "",
        changedBy,
      });
    }
    if (passportNumber !== undefined && passportNumber !== employee.passportNumber) {
      employeeUpdateData.passportNumber = passportNumber || null;
      historyRecords.push({
        employeeId: id,
        field: "passportNumber",
        oldValue: employee.passportNumber || "",
        newValue: passportNumber || "",
        changedBy,
      });
    }

    // Handle department relationship
    if (departmentId !== undefined && departmentId !== employee.departmentId) {
      if (departmentId) {
        employeeUpdateData.department = { connect: { id: departmentId } };
        // Get department name for history
        const newDept = await prisma.department.findUnique({ where: { id: departmentId } });
        historyRecords.push({
          employeeId: id,
          field: "department",
          oldValue: employee.department?.name || "None",
          newValue: newDept?.name || "Unknown",
          changedBy,
        });
      } else {
        employeeUpdateData.department = { disconnect: true };
        historyRecords.push({
          employeeId: id,
          field: "department",
          oldValue: employee.department?.name || "None",
          newValue: "None",
          changedBy,
        });
      }
    }

    // Handle manager relationship
    if (managerId !== undefined && managerId !== employee.managerId) {
      if (managerId) {
        employeeUpdateData.manager = { connect: { id: managerId } };
        // Get manager name for history
        const newManager = await prisma.employee.findUnique({
          where: { id: managerId },
          include: { user: true }
        });
        historyRecords.push({
          employeeId: id,
          field: "manager",
          oldValue: employee.manager ? `${employee.manager.user.firstName} ${employee.manager.user.lastName}` : "None",
          newValue: newManager ? `${newManager.user.firstName} ${newManager.user.lastName}` : "Unknown",
          changedBy,
        });
      } else {
        employeeUpdateData.manager = { disconnect: true };
        historyRecords.push({
          employeeId: id,
          field: "manager",
          oldValue: employee.manager ? `${employee.manager.user.firstName} ${employee.manager.user.lastName}` : "None",
          newValue: "None",
          changedBy,
        });
      }
    }

    // Update user if there are fields to update
    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: employee.userId },
        data: userUpdateData,
      });
    }

    // Update employee if there are fields to update
    if (Object.keys(employeeUpdateData).length > 0) {
      await prisma.employee.update({
        where: { id },
        data: employeeUpdateData,
      });
    }

    // Create history records
    if (historyRecords.length > 0) {
      await prisma.employeeHistory.createMany({
        data: historyRecords,
      });

      // Log employee update to audit log
      const oldValues: Record<string, unknown> = {};
      const newValues: Record<string, unknown> = {};
      historyRecords.forEach((record) => {
        oldValues[record.field] = record.oldValue;
        newValues[record.field] = record.newValue;
      });

      await logEmployeeEvent({
        action: "UPDATE",
        userId: session.user.id,
        userName: `${session.user.firstName} ${session.user.lastName}`,
        userEmail: session.user.email,
        employeeId: id,
        employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
        oldValue: oldValues,
        newValue: newValues,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: true,
        department: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Log employee deletion before actually deleting
    await logEmployeeEvent({
      action: "DELETE",
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      userEmail: session.user.email,
      employeeId: id,
      employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
      oldValue: {
        email: employee.user.email,
        firstName: employee.user.firstName,
        lastName: employee.user.lastName,
        role: employee.user.role,
        employeeCode: employee.employeeCode,
        department: employee.department?.name,
        designation: employee.designation,
      },
    });

    // Delete the user (cascades to employee)
    await prisma.user.delete({
      where: { id: employee.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

