import { API_BASE_URL, buildHeaders, handleResponse } from '../helpers';
import type { RequestConfig } from '../types';

export type ClientItem = {
  clientNit: string;
  clientName: string;
};

type RawClientItem = {
  client_nit: string;
  client_name: string;
};

export type ListClientsParams = {
  issuedFrom?: string;
  issuedTo?: string;
};

export async function listClients(
  params: ListClientsParams,
  config?: RequestConfig,
): Promise<ClientItem[]> {
  const query = new URLSearchParams();
  if (params.issuedFrom) query.set('issued_from', params.issuedFrom);
  if (params.issuedTo) query.set('issued_to', params.issuedTo);

  const res = await fetch(`${API_BASE_URL}/v1/invoices/clients?${query.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders({ authToken: config?.authToken }),
    },
    signal: config?.signal,
  });

  const body = await handleResponse<{ data: RawClientItem[] }>(res);
  return body.data.map((c) => ({ clientNit: c.client_nit, clientName: c.client_name }));
}
