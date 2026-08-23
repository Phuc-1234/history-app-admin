// src/utils/deleteHelper.ts

export const DEFAULT_DELETE_ERROR_FALLBACK = 'Lưu ý: Không thể xóa nội dung đang chứa nội dung con';

/**
 * Extracts a user-friendly error message for delete actions in the admin panel.
 * - Preserves Super Admin permission errors (403).
 * - Preserves explicit custom error messages from the backend.
 * - Falls back to "Lưu ý: Không thể xóa nội dung đang chứa nội dung con" for generic / foreign key errors.
 */
export function getDeleteErrorMessage(err: any, fallback: string = DEFAULT_DELETE_ERROR_FALLBACK): string {
  if (err?.response?.status === 403) {
    return err?.response?.data?.error || 'Truy cập bị cấm. Yêu cầu quyền Quản trị viên tối cao.';
  }

  const serverMsg = err?.response?.data?.error;
  if (typeof serverMsg === 'string' && serverMsg.trim()) {
    if (!serverMsg.toLowerCase().startsWith('failed to delete')) {
      return serverMsg;
    }
  }

  return fallback;
}
