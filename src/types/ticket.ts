export interface CustomField {
  id: string;
  label: string;
  value: string;
}

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
  custom_fields?: CustomField[];
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

// --- Pricing ---

export interface PricingLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export type RateType = "day" | "hourly" | "flat" | "none";

export interface PricingData {
  rate_type: RateType;
  day_rate?: number;
  hourly_rate?: number;
  flat_rate?: number;
  subtotal?: number;
  line_items: PricingLineItem[];
  total?: number;
  notes?: string; // PO number, AFE number, etc.
}

// --- Templates ---

export interface CustomFieldDef {
  id: string;
  label: string;
  field_type: "text" | "number" | "select";
  default_value?: string;
  options?: string[]; // for select type
  required?: boolean;
}

export interface PricingDefaults {
  rate_type?: RateType;
  day_rate?: number;
  hourly_rate?: number;
  flat_rate?: number;
  default_line_items?: {
    description: string;
    quantity: number;
    unit_price: number;
  }[];
}

export interface ContactTemplate {
  id: string;
  user_id: string;
  contact_id: string;
  name: string;
  visible_fields: Record<string, boolean>;
  default_values: Partial<StructuredTicket>;
  custom_field_defs: CustomFieldDef[];
  pricing_defaults: PricingDefaults;
  created_at: string;
  updated_at: string;
}

// --- Core entities ---

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
  template_id: string | null;
  pricing_data: PricingData | null;
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
  onboarding_completed: boolean;
  trial_started_at: string | null;
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
