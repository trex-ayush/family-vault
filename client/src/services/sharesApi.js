import { apiClient } from './apiClient.js';

/** `/shares` — see docs/API.md "Shares". Thin wrappers, no business logic. */
export const sharesApi = {
  /** GET /shares -> { items: [Share] } — Share: { id, targetType, targetId, targetLabel, expiresAt, revokedAt, openCount, createdAt, ... } */
  list: (params) => apiClient.get('/shares', { params }).then((res) => res.data),

  /**
   * POST /shares -> 201 { ...Share, url } — `url` (the raw share link) is returned here and by
   * `link` below, never in `list`.
   * Body: { targetType: 'document'|'folder'|'item', targetId, fileIds?, duration?: '12h'|'24h'|'7d' }
   * (no duration = the family's default).
   */
  create: (payload) => apiClient.post('/shares', payload).then((res) => res.data),

  /** PATCH /shares/:id — { revoke: true } turns the link off immediately. */
  revoke: (id) => apiClient.patch(`/shares/${id}`, { revoke: true }).then((res) => res.data),

  /** PATCH /shares/:id — { reactivate: true } makes an off or expired link work again. */
  reactivate: (id) => apiClient.patch(`/shares/${id}`, { reactivate: true }).then((res) => res.data),

  /** PATCH /shares/:id — { extendTo } : the same link, now lasting this long from now. */
  extend: (id, duration) => apiClient.patch(`/shares/${id}`, { extendTo: duration }).then((res) => res.data),

  /** GET /shares/:id/link -> { url } — the same link again (when the row says `canShowLink`). */
  link: (id) => apiClient.get(`/shares/${id}/link`).then((res) => res.data),

  /** DELETE /shares/:id — removes the record (owner/admin only). */
  remove: (id) => apiClient.delete(`/shares/${id}`).then((res) => res.data),
};
