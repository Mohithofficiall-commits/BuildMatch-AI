export type UserRole = 'homeowner' | 'engineer' | 'plumber' | 'electrician' | 'material_shop' | 'admin';

export type ProfessionalType = 'engineer' | 'plumber' | 'electrician' | 'material_shop';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
  phone?: string | null;
  location?: string | null;
}

export interface PortfolioItem {
  title: string;
  location: string;
  year: number;
  image: string;
}

export interface Engineer {
  id: string;
  user_id?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  photo_url: string;
  location: string;
  experience_years: number;
  projects_completed: number;
  rating: number;
  reviews_count: number;
  specializations: string[];
  price_per_sqft: number;
  price_min?: number | null;
  price_max?: number | null;
  qualification: string;
  verification_status: 'verified' | 'pending' | 'rejected';
  identity_verified: boolean;
  credential_verified: boolean;
  trust_score: number;
  trust_level: string;
  on_time_pct: number;
  budget_adherence_pct: number;
  quality_score: number;
  complaints_count: number;
  availability: string;
  bio: string;
  portfolio: PortfolioItem[];
}

export type ProjectStatus = 'planning' | 'active' | 'completed' | 'on_hold';

export interface Project {
  id: string;
  homeowner_id: string;
  engineer_id?: string | null;
  title: string;
  house_type: string;
  location: string;
  area_sqft: number;
  budget: number;
  construction_style: string;
  start_date: string;
  expected_completion?: string | null;
  actual_completion?: string | null;
  progress: number;
  current_milestone?: string | null;
  status: ProjectStatus;
  engineer?: Engineer | null;
}

export type MilestoneStatus = 'completed' | 'in_progress' | 'upcoming' | 'delayed';
export type VerificationStatus = 'pending' | 'verified' | 'review_required' | 'approved';

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  order_index: number;
  status: MilestoneStatus;
  planned_date?: string | null;
  actual_date?: string | null;
  verified: boolean;
  verification_status: VerificationStatus;
  payment_linked: boolean;
}

export type PaymentStatus = 'paid' | 'pending' | 'overdue';

export interface Payment {
  id: string;
  project_id: string;
  milestone_id?: string | null;
  milestone_name: string;
  amount: number;
  status: PaymentStatus;
  paid_date?: string | null;
  due_date?: string | null;
}

export interface DocumentItem {
  id: string;
  project_id: string;
  name: string;
  category: string;
  file_url?: string | null;
  uploaded_date: string;
  size_kb: number;
}

export interface Message {
  id: string;
  project_id: string;
  sender_id: string;
  receiver_id: string;
  sender_role: string;
  content: string;
  attachment_name?: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  project_id?: string | null;
  engineer_id: string;
  homeowner_name: string;
  rating: number;
  quality_rating: number;
  timeline_rating: number;
  communication_rating: number;
  budget_rating: number;
  feedback: string;
  verified: boolean;
  created_at: string;
}

export type ComplaintStatus = 'open' | 'under_review' | 'resolved';

export interface Complaint {
  id: string;
  project_id: string;
  engineer_id: string;
  homeowner_name: string;
  category: string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  created_at: string;
  resolved_at?: string | null;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskAssessment {
  id: string;
  project_id: string;
  overall_risk: RiskLevel;
  delay_risk: RiskLevel;
  budget_risk: RiskLevel;
  quality_risk: RiskLevel;
  engineer_risk: RiskLevel;
  delay_reason?: string | null;
  budget_reason?: string | null;
  quality_reason?: string | null;
  engineer_reason?: string | null;
  recommended_action?: string | null;
}

export interface MilestoneEvidence {
  id: string;
  milestone_id: string;
  project_id: string;
  image_url?: string | null;
  detected_stage: string;
  confidence: number;
  expected_milestone: string;
  evidence_tags: string[];
  result: 'verified' | 'review_required';
  human_status: 'pending' | 'approved' | 'review';
}

export interface ProjectRequirement {
  location: string;
  budget: number;
  house_type: string;
  area_sqft: number;
  construction_style: string;
  expected_completion?: string;
}

export interface MatchFactor {
  label: string;
  score: number;
  weight: number;
  weighted: number;
  reason: string;
}

export interface MatchResult {
  engineer: Engineer;
  overallScore: number;
  factors: MatchFactor[];
  explanation: string;
}

// ============================================================
// Ecosystem Extension Types
// ============================================================

export interface ProfessionalProfile {
  id: string;
  user_id: string;
  profession: 'plumber' | 'electrician' | 'material_shop';
  business_name?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  location: string;
  service_area?: string | null;
  experience_years: number;
  projects_completed: number;
  rating: number;
  reviews_count: number;
  specializations: string[];
  skills: string[];
  price_per_visit: number;
  qualification?: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  identity_verified: boolean;
  credential_verified: boolean;
  availability: string;
  bio?: string | null;
  portfolio: PortfolioItem[];
  created_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProfessionalType;
  status: 'invited' | 'active' | 'completed' | 'declined';
  invited_at: string;
  joined_at?: string | null;
  created_at: string;
}

export interface ProfessionalRequest {
  id: string;
  project_id: string;
  homeowner_id: string;
  professional_id: string;
  professional_type: ProfessionalType;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  title: string;
  description?: string | null;
  budget?: number | null;
  expected_date?: string | null;
  responded_at?: string | null;
  created_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  professional_type: ProfessionalType;
  status: 'pending' | 'verified' | 'rejected';
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  rejection_reason?: string | null;
  created_at: string;
}

export interface Certificate {
  id: string;
  verification_request_id: string;
  user_id: string;
  title: string;
  issuing_authority: string;
  certificate_number?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  file_url?: string | null;
  created_at: string;
}

export interface Material {
  id: string;
  shop_id: string;
  name: string;
  category: 'Cement' | 'Steel' | 'Bricks' | 'Sand' | 'Electrical' | 'Plumbing' | 'Tiles' | 'Paint' | 'Hardware' | 'Other';
  description?: string | null;
  price: number;
  unit: string;
  stock: number;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock';
  image_url?: string | null;
  created_at: string;
}

export interface MaterialOrder {
  id: string;
  material_id: string;
  shop_id: string;
  buyer_id: string;
  project_id?: string | null;
  quantity: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'free' | 'pro' | 'business';
  price_monthly: number;
  price_yearly: number;
  features: string[];
  max_listings?: number | null;
  max_projects?: number | null;
  priority_support: boolean;
  verified_badge: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  tier: 'free' | 'pro' | 'business';
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  billing_cycle: 'monthly' | 'yearly';
  started_at: string;
  expires_at?: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string | null;
  created_at: string;
}

// ============================================================
// Joined / Extended row types (used by professional portals)
// ============================================================

export interface ProjectMemberJoined extends ProjectMember {
  project?: {
    id: string;
    title: string;
    location: string;
    status: ProjectStatus;
    progress: number;
    current_milestone?: string | null;
    homeowner_id: string;
    engineer_id?: string | null;
    house_type?: string | null;
    budget?: number | null;
    area_sqft?: number | null;
  } | null;
  member_user?: Pick<AppUser, 'id' | 'name' | 'role' | 'avatar_url'> | null;
}

export interface ProfessionalRequestJoined extends ProfessionalRequest {
  project?: {
    id: string;
    title: string;
    location: string;
    status: ProjectStatus;
    progress: number;
    homeowner_id: string;
    engineer_id?: string | null;
  } | null;
  requester?: Pick<AppUser, 'id' | 'name' | 'avatar_url'> | null;
}

export interface VerificationRequestJoined extends VerificationRequest {
  app_user?: Pick<AppUser, 'id' | 'name' | 'email' | 'role' | 'avatar_url'> | null;
}

export interface CertificateJoined extends Certificate {
  verification_request?: { status: VerificationRequest['status']; submitted_at: string } | null;
}
