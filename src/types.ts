export interface PolarisKey {
  id: number;
  key_name: string;
  is_active: number;
  created_at: string;
}

export interface SheetRow {
  category: string;
  subCategory: string;
  class: string;
  fileName: string;
  fileLink: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
