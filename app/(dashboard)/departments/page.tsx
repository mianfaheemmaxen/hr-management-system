"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Building2, Users } from "lucide-react";
import { AddDepartmentDialog } from "@/components/departments/add-department-dialog";
import { EditDepartmentDialog } from "@/components/departments/edit-department-dialog";
import { useAlert } from "@/components/ui/use-alert";
import { Header } from "@/components/layout/header";
import { Department } from "@/lib/types";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );
  const { showAlert, showConfirm } = useAlert();

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments");
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: "Delete Department",
      message:
        "Are you sure you want to delete this department? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchDepartments();
        showAlert({
          type: "success",
          message: "Department deleted successfully",
        });
      } else {
        const error = await response.json();
        showAlert({
          type: "error",
          message: error.error || "Failed to delete department",
        });
      }
    } catch (error) {
      console.error("Failed to delete department:", error);
      showAlert({
        type: "error",
        message: "Failed to delete department",
      });
    }
  };

  const handleToggleStatus = async (dept: Department) => {
    try {
      const response = await fetch(`/api/departments/${dept.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !dept.isActive }),
      });

      if (response.ok) {
        fetchDepartments();
      }
    } catch (error) {
      console.error("Failed to update department:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a2937]/5">
        <Header title="Departments" description="Manage company departments" />
        <div className="p-8 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a2937]/5">
      <Header
        title="Departments"
        description="Manage company departments"
      ></Header>

      <div className="p-4 sm:p-6 flex justify-end pb-2">
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-[#1a2937] hover:bg-[#1a2937]/90 text-white shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {departments.length === 0 ? (
          <Card className="border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-[#1a2937]/5 p-6 mb-4">
                <Building2 className="h-12 w-12 text-[#1a2937]/60" />
              </div>
              <h3 className="text-lg font-semibold text-[#1a2937] mb-2">
                No departments found
              </h3>
              <p className="text-sm text-muted-foreground mb-6 text-center px-4">
                Get started by creating your first department
              </p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-[#1a2937] hover:bg-[#1a2937]/90 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Department
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {departments.map((dept) => (
              <Card
                key={dept.id}
                className="border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in group flex flex-col relative overflow-visible"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="rounded-lg bg-[#1a2937]/5 p-2.5 group-hover:bg-[#1a2937]/10 transition-colors shrink-0">
                        <Building2 className="h-5 w-5 text-[#1a2937]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg font-bold text-[#1a2937] break-words pr-2">
                          {dept.name}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={`mt-1.5 text-xs ${
                            dept.isActive
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                        >
                          {dept.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-[#1a2937]/5 hover:text-[#1a2937]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingDepartment(dept);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(dept.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {dept.description || "No description provided"}
                  </p>

                  {dept.parentDepartment && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                      <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="text-blue-700 truncate">
                        Under:{" "}
                        <span className="font-medium">
                          {dept.parentDepartment.name}
                        </span>
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <div className="rounded-md bg-[#1a2937]/5 p-1.5 shrink-0">
                        <Users className="h-4 w-4 text-[#1a2937]" />
                      </div>
                      <span className="font-medium text-[#1a2937]">
                        {dept._count?.employees || 0}
                      </span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {dept._count?.employees === 1
                          ? "employee"
                          : "employees"}
                      </span>
                    </div>

                    {(dept.childDepartmentsCount ?? 0) > 0 && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <div className="rounded-md bg-purple-50 p-1.5 shrink-0">
                          <Building2 className="h-4 w-4 text-purple-600" />
                        </div>
                        <span className="font-medium text-purple-700">
                          {dept.childDepartmentsCount}
                        </span>
                        <span className="text-purple-600 whitespace-nowrap">
                          {dept.childDepartmentsCount === 1
                            ? "subdept"
                            : "subdepts"}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddDepartmentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchDepartments}
      />

      {editingDepartment && (
        <EditDepartmentDialog
          open={!!editingDepartment}
          onOpenChange={(open) => !open && setEditingDepartment(null)}
          department={editingDepartment}
          onSuccess={fetchDepartments}
        />
      )}
    </div>
  );
}
