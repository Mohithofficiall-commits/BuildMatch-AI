import { supabase, isSupabaseConfigured } from './supabase';
import type {
  Engineer, Project, Milestone, Payment, DocumentItem, Message,
  Review, Complaint, RiskAssessment, MilestoneEvidence, AppUser,
  ProfessionalProfile, ProfessionalRequest, ProfessionalRequestJoined, VerificationRequest, VerificationRequestJoined, Certificate,
  Material, MaterialOrder, SubscriptionPlan, Subscription, Notification,
  ProjectMember, ProjectMemberJoined, ProfessionalType,
} from './types';

// Demo user IDs
export const DEMO_HOMEOWNER_ID = 'a1000000-0000-0000-0000-000000000001';
export const DEMO_ENGINEER_USER_ID = 'a1000000-0000-0000-0000-000000000003';
export const DEMO_ENGINEER_ID = 'e2000000-0000-0000-0000-000000000001';
export const DEMO_PROJECT_ID = 'b1000000-0000-0000-0000-000000000001';
export const DEMO_PLUMBER_USER_ID = 'a1000000-0000-0000-0000-000000000010';
export const DEMO_ELECTRICIAN_USER_ID = 'a1000000-0000-0000-0000-000000000011';
export const DEMO_MATERIAL_SHOP_USER_ID = 'a1000000-0000-0000-0000-000000000012';

export async function fetchEngineers(): Promise<Engineer[]> {
  const { data, error } = await supabase.from('engineers').select('*').order('trust_score', { ascending: false });
  if (error || !data) throw error ?? new Error('No engineers');
  return data as Engineer[];
}

export async function fetchEngineer(id: string): Promise<Engineer | null> {
  const { data, error } = await supabase.from('engineers').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Engineer | null;
}

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
  if (error || !data) throw error ?? new Error('No projects');
  const projects = data as Project[];
  const engineers = await fetchEngineers();
  return projects.map((p) => ({
    ...p,
    engineer: engineers.find((e) => e.id === p.engineer_id) ?? null,
  }));
}

export async function fetchProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const project = data as Project;
  if (project.engineer_id) {
    project.engineer = await fetchEngineer(project.engineer_id);
  }
  return project;
}

export async function fetchMilestones(projectId: string): Promise<Milestone[]> {
  const { data, error } = await supabase.from('milestones').select('*').eq('project_id', projectId).order('order_index', { ascending: true });
  if (error || !data) throw error ?? new Error('No milestones');
  return data as Milestone[];
}

export async function fetchPayments(projectId: string): Promise<Payment[]> {
  const { data, error } = await supabase.from('payments').select('*').eq('project_id', projectId).order('due_date', { ascending: true });
  if (error || !data) throw error ?? new Error('No payments');
  return data as Payment[];
}

export async function fetchDocuments(projectId: string): Promise<DocumentItem[]> {
  const { data, error } = await supabase.from('documents').select('*').eq('project_id', projectId).order('uploaded_date', { ascending: false });
  if (error || !data) throw error ?? new Error('No documents');
  return data as DocumentItem[];
}

export async function fetchMessages(projectId: string): Promise<Message[]> {
  const { data, error } = await supabase.from('messages').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
  if (error || !data) throw error ?? new Error('No messages');
  return data as Message[];
}

export async function sendMessage(projectId: string, senderId: string, receiverId: string, senderRole: string, content: string): Promise<Message> {
  const { data, error } = await supabase.from('messages').insert({
    project_id: projectId,
    sender_id: senderId,
    receiver_id: receiverId,
    sender_role: senderRole,
    content,
  }).select().single();
  if (error) throw error;
  return data as Message;
}

export async function fetchReviews(engineerId?: string): Promise<Review[]> {
  let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
  if (engineerId) query = query.eq('engineer_id', engineerId);
  const { data, error } = await query;
  if (error || !data) throw error ?? new Error('No reviews');
  return data as Review[];
}

export async function fetchComplaints(): Promise<Complaint[]> {
  const { data, error } = await supabase.from('complaints').select('*').order('created_at', { ascending: false });
  if (error || !data) throw error ?? new Error('No complaints');
  return data as Complaint[];
}

export async function createComplaint(c: Omit<Complaint, 'id' | 'created_at' | 'resolved_at' | 'status'>): Promise<Complaint> {
  const { data, error } = await supabase.from('complaints').insert({ ...c, status: 'open' }).select().single();
  if (error) throw error;
  return data as Complaint;
}

export async function updateComplaintStatus(id: string, status: Complaint['status']): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (status === 'resolved') update.resolved_at = new Date().toISOString();
  const { error } = await supabase.from('complaints').update(update).eq('id', id);
  if (error) throw error;
}

export async function fetchRiskAssessment(projectId: string): Promise<RiskAssessment | null> {
  const { data, error } = await supabase.from('risk_assessments').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).maybeSingle();
  if (error) throw error;
  return data as RiskAssessment | null;
}

export async function fetchMilestoneEvidence(projectId: string): Promise<MilestoneEvidence[]> {
  const { data, error } = await supabase.from('milestone_evidence').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error || !data) throw error ?? new Error('No evidence');
  return data as MilestoneEvidence[];
}

export async function createMilestoneEvidence(e: Omit<MilestoneEvidence, 'id' | 'created_at'>): Promise<MilestoneEvidence> {
  const { data, error } = await supabase.from('milestone_evidence').insert(e).select().single();
  if (error) throw error;
  return data as MilestoneEvidence;
}

export async function updateEvidenceHumanStatus(id: string, humanStatus: MilestoneEvidence['human_status']): Promise<void> {
  const { error } = await supabase.from('milestone_evidence').update({ human_status: humanStatus }).eq('id', id);
  if (error) throw error;
}

export async function updateEngineerVerification(id: string, status: Engineer['verification_status']): Promise<void> {
  const { error } = await supabase.from('engineers').update({ verification_status: status }).eq('id', id);
  if (error) throw error;
}

export async function fetchAppUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase.from('app_users').select('*');
  if (error || !data) throw error ?? new Error('No users');
  return data as AppUser[];
}

export { isSupabaseConfigured };

// ============================================================
// Professional Profiles
// ============================================================

export async function fetchProfessionalProfiles(profession?: string): Promise<ProfessionalProfile[]> {
  let query = supabase.from('professional_profiles').select('*').order('rating', { ascending: false });
  if (profession) query = query.eq('profession', profession);
  const { data, error } = await query;
  if (error || !data) throw error ?? new Error('No professional profiles');
  return data as ProfessionalProfile[];
}

export async function fetchProfessionalProfile(userId: string): Promise<ProfessionalProfile | null> {
  const { data, error } = await supabase
    .from('professional_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as ProfessionalProfile | null;
}

export async function fetchProfessionalProfilesForUser(userId: string): Promise<ProfessionalProfile[]> {
  const { data, error } = await supabase
    .from('professional_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) throw error ?? new Error('No profiles');
  return data as ProfessionalProfile[];
}

export async function updateProfessionalProfile(userId: string, updates: Partial<ProfessionalProfile>): Promise<void> {
  const { error } = await supabase.from('professional_profiles').update(updates).eq('user_id', userId);
  if (error) throw error;
}

export async function updateProfessionalVerification(userId: string, status: ProfessionalProfile['verification_status']): Promise<void> {
  const { error } = await supabase.from('professional_profiles').update({ verification_status: status }).eq('user_id', userId);
  if (error) throw error;
}

// ============================================================
// Professional Requests
// ============================================================

export async function fetchProfessionalRequests(professionalId?: string, homeownerId?: string): Promise<ProfessionalRequest[]> {
  let query = supabase.from('professional_requests').select('*').order('created_at', { ascending: false });
  if (professionalId) query = query.eq('professional_id', professionalId);
  if (homeownerId) query = query.eq('homeowner_id', homeownerId);
  const { data, error } = await query;
  if (error || !data) throw error ?? new Error('No requests');
  return data as ProfessionalRequest[];
}

export async function createProfessionalRequest(r: Omit<ProfessionalRequest, 'id' | 'created_at' | 'responded_at' | 'status'>): Promise<ProfessionalRequest> {
  const { data, error } = await supabase.from('professional_requests').insert({ ...r, status: 'pending' }).select().single();
  if (error) throw error;
  return data as ProfessionalRequest;
}

export async function updateProfessionalRequestStatus(id: string, status: ProfessionalRequest['status']): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (status === 'accepted' || status === 'declined') update.responded_at = new Date().toISOString();
  const { error } = await supabase.from('professional_requests').update(update).eq('id', id);
  if (error) throw error;
}

// ============================================================
// Verification Requests + Certificates
// ============================================================

export async function fetchVerificationRequests(status?: string): Promise<VerificationRequest[]> {
  let query = supabase.from('verification_requests').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error || !data) throw error ?? new Error('No verification requests');
  return data as VerificationRequest[];
}

export async function fetchVerificationRequest(userId: string): Promise<VerificationRequest | null> {
  const { data, error } = await supabase.from('verification_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).maybeSingle();
  if (error) throw error;
  return data as VerificationRequest | null;
}

export async function createVerificationRequest(r: Omit<VerificationRequest, 'id' | 'created_at' | 'submitted_at' | 'reviewed_at' | 'reviewed_by' | 'rejection_reason' | 'status'>): Promise<VerificationRequest> {
  const { data, error } = await supabase.from('verification_requests').insert({ ...r, status: 'pending' }).select().single();
  if (error) throw error;
  return data as VerificationRequest;
}

export async function updateVerificationRequestStatus(id: string, status: VerificationRequest['status'], reviewerId?: string, rejectionReason?: string): Promise<void> {
  const update: Record<string, unknown> = { status, reviewed_at: new Date().toISOString() };
  if (reviewerId) update.reviewed_by = reviewerId;
  if (rejectionReason) update.rejection_reason = rejectionReason;
  const { error } = await supabase.from('verification_requests').update(update).eq('id', id);
  if (error) throw error;
}

export async function fetchCertificates(userId: string): Promise<Certificate[]> {
  const { data, error } = await supabase.from('certificates').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error || !data) throw error ?? new Error('No certificates');
  return data as Certificate[];
}

export async function createCertificate(c: Omit<Certificate, 'id' | 'created_at'>): Promise<Certificate> {
  const { data, error } = await supabase.from('certificates').insert(c).select().single();
  if (error) throw error;
  return data as Certificate;
}

// ============================================================
// Materials
// ============================================================

export async function fetchMaterials(shopId?: string, category?: string): Promise<Material[]> {
  let query = supabase.from('materials').select('*').order('created_at', { ascending: false });
  if (shopId) query = query.eq('shop_id', shopId);
  if (category && category !== 'All') query = query.eq('category', category);
  const { data, error } = await query;
  if (error || !data) throw error ?? new Error('No materials');
  return data as Material[];
}

export async function createMaterial(m: Omit<Material, 'id' | 'created_at'>): Promise<Material> {
  const { data, error } = await supabase.from('materials').insert(m).select().single();
  if (error) throw error;
  return data as Material;
}

export async function updateMaterial(id: string, updates: Partial<Material>): Promise<void> {
  const { error } = await supabase.from('materials').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteMaterial(id: string): Promise<void> {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Material Orders
// ============================================================

export async function fetchMaterialOrders(buyerId?: string, shopId?: string): Promise<MaterialOrder[]> {
  let query = supabase.from('material_orders').select('*, materials(name, category, image_url, unit)').order('created_at', { ascending: false });
  if (buyerId) query = query.eq('buyer_id', buyerId);
  if (shopId) query = query.eq('shop_id', shopId);
  const { data, error } = await query;
  if (error || !data) throw error ?? new Error('No orders');
  return data as MaterialOrder[];
}

export async function createMaterialOrder(o: Omit<MaterialOrder, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<MaterialOrder> {
  const { data, error } = await supabase.from('material_orders').insert({ ...o, status: 'pending' }).select().single();
  if (error) throw error;
  return data as MaterialOrder;
}

export async function updateMaterialOrderStatus(id: string, status: MaterialOrder['status']): Promise<void> {
  const { error } = await supabase.from('material_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// ============================================================
// Subscriptions
// ============================================================

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase.from('subscription_plans').select('*').order('price_monthly', { ascending: true });
  if (error || !data) throw error ?? new Error('No plans');
  return data as SubscriptionPlan[];
}

export async function fetchUserSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).maybeSingle();
  if (error) throw error;
  return data as Subscription | null;
}

export async function fetchAllSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase.from('subscriptions').select('*, subscription_plans(name, tier, price_monthly, price_yearly)').order('created_at', { ascending: false });
  if (error || !data) throw error ?? new Error('No subscriptions');
  return data as Subscription[];
}

export async function createSubscription(s: Omit<Subscription, 'id' | 'created_at' | 'started_at'>): Promise<Subscription> {
  const { data, error } = await supabase.from('subscriptions').insert({ ...s, started_at: new Date().toISOString() }).select().single();
  if (error) throw error;
  return data as Subscription;
}

export async function updateSubscriptionStatus(id: string, status: Subscription['status']): Promise<void> {
  const { error } = await supabase.from('subscriptions').update({ status }).eq('id', id);
  if (error) throw error;
}

// ============================================================
// Notifications
// ============================================================

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error || !data) throw error ?? new Error('No notifications');
  return data as Notification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
  if (error) throw error;
}

export async function createNotification(n: Omit<Notification, 'id' | 'created_at'>): Promise<void> {
  const { error } = await supabase.from('notifications').insert(n);
  if (error) throw error;
}

// ============================================================
// Profile by user id (engineer row lives in `engineers`)
// ============================================================

export async function fetchEngineerByUserId(userId: string): Promise<Engineer | null> {
  const { data, error } = await supabase.from('engineers').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data as Engineer | null;
}

// ============================================================
// Project Members
// ============================================================

export async function fetchProjectMembers(projectId?: string): Promise<ProjectMemberJoined[]> {
  let query = supabase
    .from('project_members')
    .select('*, project:projects(id,title,location,status,progress,current_milestone,homeowner_id,engineer_id,house_type,budget,area_sqft), member_user:app_users(id,name,role,avatar_url)')
    .order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error || !data) throw error ?? new Error('No project members');
  return data as ProjectMemberJoined[];
}

export async function fetchProjectMembersByUser(userId: string): Promise<ProjectMemberJoined[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select('*, project:projects(id,title,location,status,progress,current_milestone,homeowner_id,engineer_id,house_type,budget,area_sqft), member_user:app_users(id,name,role,avatar_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) throw error ?? new Error('No project members');
  return data as ProjectMemberJoined[];
}

export async function addProjectMember(input: { project_id: string; user_id: string; role: ProfessionalType }): Promise<void> {
  const row = { ...input, status: 'active' as const, joined_at: new Date().toISOString() };
  try {
    const { error } = await supabase.from('project_members').upsert(row, { onConflict: 'project_id,user_id', ignoreDuplicates: true });
    if (error) throw error;
  } catch {
    // Fallback: unique index may not be applied on this database yet.
    const { error } = await supabase.from('project_members').insert(row);
    if (error) throw error;
  }
}

export async function updateProjectMemberStatus(id: string, status: ProjectMember['status']): Promise<void> {
  const { error } = await supabase.from('project_members').update({ status }).eq('id', id);
  if (error) throw error;
}

// ============================================================
// Professional requests (joined with project + requester)
// ============================================================

export async function fetchProfessionalRequestsJoined(professionalId?: string, homeownerId?: string): Promise<ProfessionalRequestJoined[]> {
  let query = supabase
    .from('professional_requests')
    .select('*, project:projects(id,title,location,status,progress,homeowner_id), requester:app_users!professional_requests_homeowner_id_fkey(id,name,avatar_url)')
    .order('created_at', { ascending: false });
  if (professionalId) query = query.eq('professional_id', professionalId);
  if (homeownerId) query = query.eq('homeowner_id', homeownerId);
  const { data, error } = await query;
  if (error || !data) throw error ?? new Error('No requests');
  return data as ProfessionalRequestJoined[];
}

export async function fetchProfessionalRequestsByProject(projectId: string): Promise<ProfessionalRequestJoined[]> {
  const { data, error } = await supabase
    .from('professional_requests')
    .select('*, project:projects(id,title,location,status,progress,homeowner_id), requester:app_users!professional_requests_homeowner_id_fkey(id,name,avatar_url)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error || !data) throw error ?? new Error('No requests');
  return data as ProfessionalRequestJoined[];
}

// ============================================================
// Verification requests + certificates (joined, admin + portal)
// ============================================================

export async function fetchLatestVerificationRequest(userId: string): Promise<VerificationRequest | null> {
  const { data, error } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as VerificationRequest | null;
}

export async function fetchVerificationRequestsDetailed(status?: string): Promise<VerificationRequestJoined[]> {
  let query = supabase
    .from('verification_requests')
    .select('*, app_user:app_users!verification_requests_user_id_fkey(id,name,email,role,avatar_url)')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error || !data) throw error ?? new Error('No verification requests');
  return data as VerificationRequestJoined[];
}

export async function fetchCertificatesByRequest(verificationRequestId: string): Promise<Certificate[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('verification_request_id', verificationRequestId)
    .order('created_at', { ascending: false });
  if (error || !data) throw error ?? new Error('No certificates');
  return data as Certificate[];
}

export async function updateEngineerVerificationByUserId(userId: string, status: Engineer['verification_status']): Promise<void> {
  const { error } = await supabase.from('engineers').update({ verification_status: status }).eq('user_id', userId);
  if (error) throw error;
}

export async function updateProjectEngineer(projectId: string, engineerId: string): Promise<void> {
  const { error } = await supabase.from('projects').update({ engineer_id: engineerId }).eq('id', projectId);
  if (error) throw error;
}
