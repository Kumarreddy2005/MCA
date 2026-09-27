import { apiClient } from "./client";

export interface ISourceReference {
  document_id: string;
  title: string;
  document_number: string;
  department: string;
  category: string;
  version: string;
  effective_date: string;
  chunk_id: string;
  excerpt: string;
  relevance_score: number;
}

export interface IQueryRagParams {
  query: string;
  departmentFilter?: string;
  maxSources?: number;
  language?: string;
}

export interface IQueryRagResult {
  success: boolean;
  query: string;
  grounded_answer: string;
  sources: ISourceReference[];
  is_grounded: boolean;
  confidence_score: number;
  disclaimer?: string;
}

export interface IKnowledgeDocumentSummary {
  document_id: string;
  title: string;
  document_number: string;
  department: string;
  category: string;
  version: string;
  effective_date: string;
  approval_state: string;
  document_status: string;
  chunk_count: number;
  tags: string[];
}

export interface IListDocumentsResult {
  success: boolean;
  total_documents: number;
  documents: IKnowledgeDocumentSummary[];
}

export const ragService = {
  /**
   * Query Karnataka Government circulars & schemes with grounded citations
   */
  async queryKnowledge(params: IQueryRagParams): Promise<IQueryRagResult> {
    const res = await apiClient.post("/rag/query", params);
    return res.data.data;
  },

  /**
   * List active government documents
   */
  async listDocuments(department?: string): Promise<IListDocumentsResult> {
    const url = department
      ? `/rag/documents?department=${encodeURIComponent(department)}`
      : "/rag/documents";
    const res = await apiClient.get(url);
    return res.data.data;
  },

  /**
   * Get single document details
   */
  async getDocumentById(id: string) {
    const res = await apiClient.get(`/rag/documents/${encodeURIComponent(id)}`);
    return res.data.data;
  },
};
