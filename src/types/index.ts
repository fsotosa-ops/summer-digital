import React from "react";

export type UserRole = "Subscriber" | "Participant" | "Admin" | "SuperAdmin";
export type UserRank = "Semilla" | "Brote" | "Árbol" | "Bosque" | "Oasis";

export interface Medal {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  dateEarned: string; // ISO Date
}

export interface Organization {
  id: string;
  name: string;
  type: "Empresa" | "Colegio" | "Universidad" | "ONG" | "Otro";
  logoUrl?: string;
  adminIds: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  oasisScore: number; // 0-100
  rank: UserRank;
  medals: Medal[];
  organizationId?: string;
  avatarUrl?: string;
  lastConnection: string; // ISO Date
}

export type NodeType =
  | "video"
  | "quiz"
  | "workshop"
  | "article"
  | "challenge"
  | "typeform"
  | "feedback"
  | "pdf"
  | "presentation"
  | "kahoot";
export type NodeStatus = "locked" | "available" | "completed" | "in-progress";

export interface Activity {
  id: string;
  title: string;
  type: "Taller" | "Evento";
  visibility: "Abierta" | "Cerrada";
  journeyId: string;
  description?: string;
  date?: string; // ISO Date if it has a specific time
}

export interface JourneyNode {
  id: string;
  title: string;
  description: string;
  type: NodeType;
  status: NodeStatus;
  x: number; // For map coordinate
  y: number; // For map coordinate
  connections: string[]; // IDs of nodes this node connects TO
  // Specific data for new types
  externalUrl?: string; // For typeform
  videoUrl?: string; // For video
  embedUrl?: string; // Universal embed URL from config.resource
  videoWatched?: boolean;
}

export interface Journey {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed';
  category?: string;
  progress: number; // 0-100
  nodes: JourneyNode[];
}

// CRM Types
export interface NavItem {
  label: string;
  href: string;
  icon?: React.ElementType;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string; // ISO Date
  type: 'info' | 'alert' | 'event';
  authorId: string;
}

export interface UserActivityLog {
  id: string;
  userId: string;
  activityType: 'journey_step' | 'resource_view' | 'login' | 'medal_earned';
  description: string;
  date: string; // ISO Date
  scoreEarned?: number;
}
