export interface StructuredTicket {
  job_date: string;
  job_type: string;
  well_name: string;
  lease_name: string;
  operator: string;
  location: string;
  hours_worked: number;
  start_time: string;
  end_time: string;
  equipment_used: string[];
  materials_used: MaterialItem[];
  work_description: string;
  safety_notes: string;
  additional_notes: string;
}

export interface MaterialItem {
  item: string;
  quantity: number;
  unit: string;
}

export interface AIQuestion {
  field: string;
  question: string;
}

export type TicketStatus = "draft" | "sent" | "viewed";

export interface Ticket {
  id: string;
  user_id: string;
  status: TicketStatus;
  raw_transcript: string | null;
  audio_url: string | null;
  structured_data: StructuredTicket | null;
  ai_questions: AIQuestion[] | null;
  ai_answers: Record<string, string> | null;
  pdf_url: string | null;
  recipient_id: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  logo_url: string | null;
  signature_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: string;
  ticket_id: string;
  recipient_email: string;
  resend_id: string | null;
  status: string;
  sent_at: string;
}
