
export enum AppState {
  LOCKED = 'LOCKED',
  INITIALIZING = 'INITIALIZING',
  ACTIVE = 'ACTIVE'
}

export interface UserProfile {
  name: string;
  relation: string;
  preferences: string;
  lastLogin: string;
}

export interface SystemLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'ai';
}

export interface GroundingSource {
  title: string;
  uri: string;
}
