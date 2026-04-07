"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAlert } from "@/components/ui/use-alert";
import { Department } from "@/lib/types";

interface EditDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: Department;
  onSuccess: () => void;
}

export function EditDepartmentDialog({
  open,
  onOpenChange,
  department,
  onSuccess,
}: EditDepartmentDialogProps) {
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState({
    name: department.name,
    description: department.description || "",
    parentDepartmentId: department.parentDepartmentId || "none",
  });
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [descendantIds, setDescendantIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchDepartmentsAndDescendants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, department.id]);

  useEffect(() => {
    setFormData({
      name: department.name,
      description: department.description || "",
      parentDepartmentId: department.parentDepartmentId || "none",
    });
  }, [department]);

  const fetchDepartmentsAndDescendants = async () => {
    try {
      const response = await fetch("/api/departments");
      if (response.ok) {
        const allDepts = await response.json();
        setDepartments(allDepts);

        // Calculate descendant IDs from the fetched departments
        const ids = getDescendantIds(department.id, allDepts);
        setDescendantIds(ids);
      }
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  };

  const getDescendantIds = (deptId: string, allDepts: Department[]): string[] => {
    const descendants: string[] = [];

    const findChildren = (parentId: string) => {
      const children = allDepts.filter((d: Department) => d.parentDepartmentId === parentId);
      children.forEach((child: Department) => {
        descendants.push(child.id);
        findChildren(child.id);
      });
    };

    findChildren(deptId);
    return descendants;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert "none" to empty string for API
      const submitData = {
        ...formData,
        parentDepartmentId: formData.parentDepartmentId === "none" ? "" : formData.parentDepartmentId,
      };

      const response = await fetch(`/api/departments/${department.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        onOpenChange(false);
        onSuccess();
        showAlert({
          type: "success",
          message: "Department updated successfully",
        });
      } else {
        const error = await response.json();
        showAlert({
          type: "error",
          message: error.error || "Failed to update department",
        });
      }
    } catch (error) {
      console.error("Failed to update department:", error);
      showAlert({
        type: "error",
        message: "Failed to update department",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>
            Update department information
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="parentDepartment">Parent Department (Optional)</Label>
              <Select
                value={formData.parentDepartmentId}
                onValueChange={(value) =>
                  setFormData({ ...formData, parentDepartmentId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (Top-level department)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top-level department)</SelectItem>
                  {departments
                    .filter((dept) =>
                      dept.id !== department.id && // Cannot select itself
                      !descendantIds.includes(dept.id) // Cannot select descendants
                    )
                    .map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                        {dept.parentDepartment ? ` (under ${dept.parentDepartment.name})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a parent department to make this a subdepartment. Cannot select itself or its own subdepartments.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

