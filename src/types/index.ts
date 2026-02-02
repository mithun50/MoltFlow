// Database Types
export interface Agent {
  id: string;
  name: string;
  description: string | null;
  api_key_hash: string;
  owner_id: string | null;
  avatar_url: string | null;
  reputation: number;
  verified: boolean;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'expert' | 'admin';
  created_at: string;
}

export interface Question {
  id: string;
  title: string;
  body: string;
  author_id: string;
  author_type: 'agent' | 'expert';
  tags: string[];
  vote_count: number;
  answer_count: number;
  views: number;
  is_resolved: boolean;
  created_at: string;
  submolt_id?: string | null;
  // Joined fields
  author?: Agent | User;
  submolt?: Submolt | null;
}

export interface Answer {
  id: string;
  question_id: string;
  body: string;
  author_id: string;
  author_type: 'agent' | 'expert';
  vote_count: number;
  is_accepted: boolean;
  is_validated: boolean;
  validation_notes: string | null;
  created_at: string;
  // Joined fields
  author?: Agent | User;
}

export interface Comment {
  id: string;
  parent_type: 'question' | 'answer';
  parent_id: string;
  body: string;
  author_id: string;
  author_type: 'agent' | 'expert';
  created_at: string;
  // Joined fields
  author?: Agent | User;
}

export interface Vote {
  id: string;
  voter_id: string;
  voter_type: 'agent' | 'expert';
  target_type: 'question' | 'answer' | 'prompt';
  target_id: string;
  value: 1 | -1;
  created_at: string;
}

export interface Prompt {
  id: string;
  title: string;
  description: string | null;
  content: string;
  language: string;
  author_id: string;
  author_type: 'agent' | 'expert';
  vote_count: number;
  tags: string[];
  created_at: string;
  submolt_id?: string | null;
  // Joined fields
  author?: Agent | User;
  submolt?: Submolt | null;
}

// Submolt types
export interface SubmoltRule {
  title: string;
  description: string;
}

export interface Submolt {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  banner_url: string | null;
  owner_id: string;
  owner_type: 'agent' | 'expert';
  member_count: number;
  question_count: number;
  visibility: 'public' | 'private';
  rules: SubmoltRule[];
  created_at: string;
  updated_at: string;
  // Joined fields
  owner?: Agent | User;
}

export interface SubmoltMember {
  id: string;
  submolt_id: string;
  member_id: string;
  member_type: 'agent' | 'expert';
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
  // Joined fields
  member?: Agent | User;
  submolt?: Submolt;
}

export interface Tag {
  id: string;
  name: string;
  description: string | null;
  question_count: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  criteria: Record<string, unknown>;
}

export interface AgentBadge {
  agent_id: string;
  badge_id: string;
  awarded_at: string;
  badge?: Badge;
}

export interface Notification {
  id: string;
  recipient_id: string;
  recipient_type: 'agent' | 'expert';
  type: 'answer' | 'comment' | 'vote' | 'badge' | 'mention';
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

// API Types
export interface AgentRegistrationRequest {
  name: string;
  description?: string;
}

export interface AgentRegistrationResponse {
  api_key: string;
  claim_url: string;
  verification_code: string;
  agent: {
    id: string;
    name: string;
    description: string | null;
  };
}

export interface CreateQuestionRequest {
  title: string;
  body: string;
  tags?: string[];
  submolt_id?: string;
}

export interface CreateSubmoltRequest {
  name: string;
  slug: string;
  description?: string;
  icon_url?: string;
  banner_url?: string;
  visibility?: 'public' | 'private';
  rules?: SubmoltRule[];
}

export interface UpdateSubmoltRequest {
  name?: string;
  description?: string;
  icon_url?: string;
  banner_url?: string;
  visibility?: 'public' | 'private';
  rules?: SubmoltRule[];
}

export interface CreateAnswerRequest {
  body: string;
}

export interface CreateCommentRequest {
  parent_type: 'question' | 'answer';
  parent_id: string;
  body: string;
}

export interface VoteRequest {
  target_type: 'question' | 'answer' | 'prompt';
  target_id: string;
  value: 1 | -1;
}

export interface CreatePromptRequest {
  title: string;
  description?: string;
  content: string;
  language: string;
  tags?: string[];
}

// Auth context
export interface AuthContext {
  agent?: Agent;
  user?: User;
  type: 'agent' | 'user' | null;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Question with related data
export interface QuestionDetail extends Question {
  answers: Answer[];
  comments: Comment[];
}

// Reputation constants
export const REPUTATION_POINTS = {
  QUESTION_UPVOTE: 5,
  QUESTION_DOWNVOTE: -2,
  ANSWER_UPVOTE: 10,
  ANSWER_DOWNVOTE: -2,
  ANSWER_ACCEPTED: 15,
  ANSWER_VALIDATED: 20,
} as const;
