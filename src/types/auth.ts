export type UserRoleType = 'admin' | 'user';

export type AccountStatus = 'active' | 'suspended' | 'pending';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  avatarUrl?: string | null;
  provider?: 'Google' | 'Facebook' | string;
  role?: UserRoleType;
  status: AccountStatus;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRoleType;
  assigned_at: string;
}

export interface ToolSettingRecord {
  id: string;
  name: string;
  is_enabled: boolean;
  is_visible: boolean;
  maintenance_message?: string;
  updated_at: string;
}

export interface WebsiteSettingRecord {
  id: string;
  site_name: string;
  tagline: string;
  contact_email: string;
  is_maintenance_mode: boolean;
  maintenance_message?: string;
  adsense_publisher_id?: string;
  ads_enabled: boolean;
  header_notice?: string;
  updated_at: string;
}

export interface AISettingRecord {
  id: string;
  is_ai_assistant_enabled: boolean;
  is_tool_ai_enabled: boolean;
  preferred_provider: string;
  default_model: string;
  max_input_chars: number;
  allowed_actions: string[];
  supported_languages: string[];
  updated_at: string;
}

export interface AuditLogRecord {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface FeedbackRecord {
  id: string;
  user_id?: string;
  tool_id?: string;
  rating?: number;
  comment: string;
  status: 'new' | 'reviewed' | 'archived';
  created_at: string;
}

export interface ContactRecord {
  id: string;
  name?: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'replied';
  created_at: string;
}
