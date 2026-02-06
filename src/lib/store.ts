// Simple in-memory store for classroom state (no backend)
import { useState, useCallback, useSyncExternalStore } from "react";

export interface Student {
  id: string;
  name: string;
  joinedAt: Date;
  isPresent: boolean;
  tabSwitchCount: number;
  isTabActive: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  isActive: boolean;
  createdAt: Date;
}

export interface QuizAnswer {
  studentId: string;
  studentName: string;
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
}

export interface SharedFile {
  id: string;
  name: string;
  url: string;
  sharedAt: Date;
}

export interface Classroom {
  id: string;
  code: string;
  teacherName: string;
  isActive: boolean;
  students: Student[];
  quizzes: Quiz[];
  quizAnswers: QuizAnswer[];
  sharedFiles: SharedFile[];
  attendanceMarked: boolean;
}

// Generate a 6-char alphanumeric code
export function generateClassCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Simple global store
let classrooms: Classroom[] = [];
let listeners: Set<() => void> = new Set();

function emitChange() {
  listeners.forEach((l) => l());
}

export function getClassrooms() {
  return classrooms;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function createClassroom(teacherName: string): Classroom {
  const classroom: Classroom = {
    id: crypto.randomUUID(),
    code: generateClassCode(),
    teacherName,
    isActive: true,
    students: [],
    quizzes: [],
    quizAnswers: [],
    sharedFiles: [],
    attendanceMarked: false,
  };
  classrooms = [...classrooms, classroom];
  emitChange();
  return classroom;
}

export function joinClassroom(code: string, studentName: string): { classroom: Classroom; student: Student } | null {
  const idx = classrooms.findIndex((c) => c.code === code && c.isActive);
  if (idx === -1) return null;
  const student: Student = {
    id: crypto.randomUUID(),
    name: studentName,
    joinedAt: new Date(),
    isPresent: true,
    tabSwitchCount: 0,
    isTabActive: true,
  };
  classrooms = classrooms.map((c, i) =>
    i === idx ? { ...c, students: [...c.students, student] } : c
  );
  emitChange();
  return { classroom: classrooms[idx], student };
}

export function updateStudentTab(classroomId: string, studentId: string, isActive: boolean) {
  classrooms = classrooms.map((c) =>
    c.id === classroomId
      ? {
          ...c,
          students: c.students.map((s) =>
            s.id === studentId
              ? { ...s, isTabActive: isActive, tabSwitchCount: isActive ? s.tabSwitchCount : s.tabSwitchCount + 1 }
              : s
          ),
        }
      : c
  );
  emitChange();
}

export function markAttendance(classroomId: string) {
  classrooms = classrooms.map((c) =>
    c.id === classroomId ? { ...c, attendanceMarked: true } : c
  );
  emitChange();
}

export function toggleStudentPresence(classroomId: string, studentId: string) {
  classrooms = classrooms.map((c) =>
    c.id === classroomId
      ? {
          ...c,
          students: c.students.map((s) =>
            s.id === studentId ? { ...s, isPresent: !s.isPresent } : s
          ),
        }
      : c
  );
  emitChange();
}

export function addQuiz(classroomId: string, quiz: Omit<Quiz, "id" | "createdAt" | "isActive">) {
  const newQuiz: Quiz = { ...quiz, id: crypto.randomUUID(), createdAt: new Date(), isActive: true };
  classrooms = classrooms.map((c) =>
    c.id === classroomId ? { ...c, quizzes: [...c.quizzes, newQuiz] } : c
  );
  emitChange();
  return newQuiz;
}

export function submitQuizAnswer(classroomId: string, answer: Omit<QuizAnswer, "isCorrect">, correctIndex: number) {
  const fullAnswer: QuizAnswer = { ...answer, isCorrect: answer.selectedIndex === correctIndex };
  classrooms = classrooms.map((c) =>
    c.id === classroomId ? { ...c, quizAnswers: [...c.quizAnswers, fullAnswer] } : c
  );
  emitChange();
}

export function shareFile(classroomId: string, file: { name: string; url: string }) {
  const shared: SharedFile = { id: crypto.randomUUID(), ...file, sharedAt: new Date() };
  classrooms = classrooms.map((c) =>
    c.id === classroomId ? { ...c, sharedFiles: [...c.sharedFiles, shared] } : c
  );
  emitChange();
}

export function stopClassroom(classroomId: string) {
  classrooms = classrooms.map((c) =>
    c.id === classroomId ? { ...c, isActive: false } : c
  );
  emitChange();
}

export function useClassroom(classroomId: string): Classroom | undefined {
  return useSyncExternalStore(subscribe, () =>
    getClassrooms().find((c) => c.id === classroomId)
  );
}

export function useClassrooms() {
  return useSyncExternalStore(subscribe, getClassrooms);
}
