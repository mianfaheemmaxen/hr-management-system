-- Create Engineering department
INSERT INTO Department (id, name, description, createdAt, updatedAt)
VALUES ('dept_engineering', 'Engineering', 'Software Engineering Team', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = name;

-- Create admin user (password is 'admin123' hashed with bcrypt)
INSERT INTO User (id, email, password, firstName, lastName, role, isActive, createdAt, updatedAt)
VALUES (
  'user_admin',
  'admin@company.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEgEjqG',
  'System',
  'Admin',
  'super_admin',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE email = email;

-- Create employee record for admin
INSERT INTO Employee (
  id,
  userId,
  employeeCode,
  phone,
  departmentId,
  designation,
  dateOfJoining,
  employmentType,
  employmentStatus,
  status,
  createdAt,
  updatedAt
)
VALUES (
  'emp_admin',
  'user_admin',
  'EMP001',
  '+1234567890',
  'dept_engineering',
  'System Administrator',
  '2020-01-01',
  'full_time',
  'permanent',
  'active',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE employeeCode = employeeCode;

