// TODO: fix this import path. Your accountsApi.ts imports apiClient via
// `./client` (a sibling file), so the shared client likely lives inside
// features/accounts/ or a shared api/ folder — I haven't seen your actual
// folder structure, so adjust this to wherever apiClient really is.
import apiClient from '../../api/client';

export interface ErpMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  created_at: string;
}

export interface ErpChatResponse {
  conversation_id: string;
  reply: string;
}

export async function sendChatMessage(
  message: string,
  conversationId?: string | null
): Promise<ErpChatResponse> {
  const { data } = await apiClient.post('/erip/chat/', {
    message,
    conversation_id: conversationId ?? undefined,
  });
  return data;
}

export interface ErpConversation {
  id: string;
  title: string;
  created_at: string;
  messages: ErpMessage[];
}

export async function getConversation(id: string): Promise<ErpConversation> {
  const { data } = await apiClient.get(`/erip/conversations/${id}/`);
  return data;
}

// --- Pending action / approval queue -----------------------------------

export type PendingActionType = 'ASSIGN_SHIFT' | 'SEND_INVOICE' | 'SEND_EMAIL';
export type PendingActionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED';

export interface PendingAction {
  id: string;
  action_type: PendingActionType;
  payload: Record<string, unknown>;
  summary: string;
  status: PendingActionStatus;
  requested_by_email: string | null;
  role_at_request: string;
  created_at: string;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  rejection_reason: string;
  executed_at: string | null;
  result_summary: string;
  error: string;
}

export async function listPendingActions(): Promise<PendingAction[]> {
  const { data } = await apiClient.get('/erip/pending-actions/');
  return data.results ?? data;
}

export async function approvePendingAction(id: string): Promise<PendingAction> {
  const { data } = await apiClient.post(`/erip/pending-actions/${id}/approve/`);
  return data;
}

export async function rejectPendingAction(id: string, reason?: string): Promise<PendingAction> {
  const { data } = await apiClient.post(`/erip/pending-actions/${id}/reject/`, { reason });
  return data;
}