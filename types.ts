
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  CLASSIC = 'CLASSIC',
  MEDIUM = 'MEDIUM',
  PROFESSIONAL = 'PROFESSIONAL'
}

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  credits: number;
  role: UserRole;
  plan: SubscriptionPlan;
  createdAt: string;
}

export interface Clip {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  videoUrl: string;
  startTime: number;
  endTime: number;
}

export interface GenerationSettings {
  durationRange: '30-60' | '60-90' | '90-120' | '120-150' | '150-180';
  subtitleStyle: {
    color: string;
    size: 'small' | 'medium' | 'large';
    hasShadow: boolean;
  };
}

export interface PlanDetails {
  id: SubscriptionPlan;
  name: string;
  credits: number;
  price: number;
  description: string;
  highlight?: string;
}
