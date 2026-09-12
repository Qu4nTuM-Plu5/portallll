/**
 * Real JWT auth — bcrypt password hashing + JWT tokens in HTTP-only cookies.
 * In-memory user store (resets on cold start — fine for demo).
 *
 * For production, replace the in-memory Map with a real database.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // bcrypt hash — never store plaintext
  role: 'admin' | 'teacher' | 'student';
  name: string;
  createdAt: string;
  lastLogin?: string;
}

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  name: string;
}

// In-memory user database — seeded with demo users on startup.
// In production: use Postgres, MySQL, or MongoDB.
const users = new Map<string, User>();
const auditLog: { id: string; userId: string; action: string; ip: string; userAgent: string; timestamp: string; meta?: Record<string, unknown> }[] = [];
const comments: { id: string; userId: string; username: string; lessonId: string; message: string; createdAt: string }[] = [];
const fileUploads: { id: string; userId: string; username: string; fileName: string; fileSize: number; fileHash: string; verdict: string; createdAt: string }[] = [];
const activeSessions = new Map<string, { userId: string; createdAt: string; ip: string; userAgent: string }>();

const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-change-in-production-bloom-siem-test';
const JWT_EXPIRES_IN = '24h';

let initialized = false;
function seedUsers() {
  if (initialized) return;
  initialized = true;

  const seed: { username: string; email: string; password: string; role: User['role']; name: string }[] = [
    { username: 'admin', email: 'admin@techbridge.edu', password: 'Admin@2025', role: 'admin', name: 'System Administrator' },
    { username: 'teacher', email: 'teacher@techbridge.edu', password: 'Teacher@2025', role: 'teacher', name: 'Daw Hla Hla Win' },
    { username: 'student', email: 'student@techbridge.edu', password: 'Student@2025', role: 'student', name: 'Aung Aung' },
    { username: 'mgmg', email: 'mgmg@student.edu', password: 'MgMg@2025', role: 'student', name: 'Mg Mg' },
    { username: 'susu', email: 'susu@student.edu', password: 'SuSu@2025', role: 'student', name: 'Su Su' },
  ];

  for (const u of seed) {
    const id = 'u' + Math.random().toString(36).slice(2, 10);
    users.set(id, {
      id,
      username: u.username,
      email: u.email,
      passwordHash: bcrypt.hashSync(u.password, 10),
      role: u.role,
      name: u.name,
      createdAt: new Date().toISOString(),
    });
  }
}

export function findUserByUsername(username: string): User | null {
  seedUsers();
  for (const u of users.values()) {
    if (u.username === username) return u;
  }
  return null;
}

export function findUserByEmail(email: string): User | null {
  seedUsers();
  for (const u of users.values()) {
    if (u.email === email) return u;
  }
  return null;
}

export function findUserById(id: string): User | null {
  seedUsers();
  return users.get(id) || null;
}

export function verifyPassword(user: User, password: string): boolean {
  return bcrypt.compareSync(password, user.passwordHash);
}

export function getAllUsers(): Omit<User, 'passwordHash'>[] {
  seedUsers();
  return Array.from(users.values()).map(u => {
    const { passwordHash, ...rest } = u;
    return rest;
  });
}

export function createUser(username: string, email: string, password: string, role: User['role'] = 'student', name?: string): User {
  seedUsers();
  const id = 'u' + Math.random().toString(36).slice(2, 10);
  const user: User = {
    id,
    username,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role,
    name: name || username,
    createdAt: new Date().toISOString(),
  };
  users.set(id, user);
  return user;
}

// =====================
// JWT Token Management
// =====================

export function createToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SessionUser;
    return payload;
  } catch {
    return null;
  }
}

// =====================
// Session Tracking
// =====================

export function registerSession(sessionId: string, user: User, ip: string, userAgent: string) {
  activeSessions.set(sessionId, {
    userId: user.id,
    createdAt: new Date().toISOString(),
    ip,
    userAgent,
  });
  user.lastLogin = new Date().toISOString();
}

export function revokeSession(sessionId: string) {
  activeSessions.delete(sessionId);
}

export function getActiveSessions() {
  return Array.from(activeSessions.entries()).map(([sessionId, s]) => ({
    sessionId: sessionId.slice(0, 16) + '...',
    userId: s.userId,
    createdAt: s.createdAt,
    ip: s.ip,
    userAgent: s.userAgent.slice(0, 80),
  }));
}

// =====================
// Audit Log
// =====================

export function audit(userId: string, action: string, ip: string, userAgent: string, meta?: Record<string, unknown>) {
  auditLog.push({
    id: 'a' + Math.random().toString(36).slice(2, 10),
    userId,
    action,
    ip,
    userAgent: userAgent.slice(0, 120),
    timestamp: new Date().toISOString(),
    meta,
  });
  if (auditLog.length > 200) auditLog.shift();
}

export function getAuditLog(limit = 50) {
  return auditLog.slice(-limit).reverse();
}

// =====================
// Comments
// =====================

export function addComment(userId: string, username: string, lessonId: string, message: string) {
  const c = {
    id: 'c' + Math.random().toString(36).slice(2, 10),
    userId,
    username,
    lessonId,
    message,
    createdAt: new Date().toISOString(),
  };
  comments.push(c);
  if (comments.length > 100) comments.shift();
  return c;
}

export function getComments(lessonId?: string, limit = 50) {
  const filtered = lessonId ? comments.filter(c => c.lessonId === lessonId) : comments;
  return filtered.slice(-limit).reverse();
}

// =====================
// File Uploads
// =====================

export function recordUpload(userId: string, username: string, fileName: string, fileSize: number, fileHash: string, verdict: string) {
  const u = {
    id: 'f' + Math.random().toString(36).slice(2, 10),
    userId,
    username,
    fileName,
    fileSize,
    fileHash,
    verdict,
    createdAt: new Date().toISOString(),
  };
  fileUploads.push(u);
  if (fileUploads.length > 50) fileUploads.shift();
  return u;
}

export function getUploads(limit = 20) {
  return fileUploads.slice(-limit).reverse();
}

// =====================
// Courses (in-memory)
// =====================
const COURSES = [
  { id: 'c001', title: 'Introduction to Python Programming', category: 'Programming', students: 1245, teacher: 'Daw Hla Hla Win' },
  { id: 'c002', title: 'Web Development with React', category: 'Web', students: 892, teacher: 'U Aung Aung' },
  { id: 'c003', title: 'Data Structures and Algorithms', category: 'CS', students: 1102, teacher: 'Daw Hla Hla Win' },
  { id: 'c004', title: 'Database Design with PostgreSQL', category: 'Database', students: 567, teacher: 'U Kyaw Kyaw' },
  { id: 'c005', title: 'Machine Learning Fundamentals', category: 'AI', students: 1893, teacher: 'Dr. Thinzar Aye' },
  { id: 'c006', title: 'Mobile App Development with Flutter', category: 'Mobile', students: 734, teacher: 'U Aung Aung' },
  { id: 'c007', title: 'Cybersecurity Essentials', category: 'Security', students: 1456, teacher: 'Dr. Thinzar Aye' },
  { id: 'c008', title: 'Cloud Computing with AWS', category: 'Cloud', students: 1089, teacher: 'U Kyaw Kyaw' },
  { id: 'c009', title: 'DevOps and CI/CD Pipelines', category: 'DevOps', students: 432, teacher: 'U Aung Aung' },
  { id: 'c010', title: 'UI/UX Design Principles', category: 'Design', students: 1567, teacher: 'Daw Su Su' },
];

export function getCourses() { return COURSES; }

export function searchCourses(query: string) {
  if (!query) return [];
  const q = query.toLowerCase();
  return COURSES.filter(c =>
    c.title.toLowerCase().includes(q) ||
    c.category.toLowerCase().includes(q) ||
    c.teacher.toLowerCase().includes(q)
  );
}
