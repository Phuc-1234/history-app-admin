import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import type { AdminUserDto } from '../../types/api';
import { IconXP, IconGold, IconFlame, IconChevronDown } from '../ui/Icons';

interface UserEditModalProps {
  open: boolean;
  user: AdminUserDto | null;
  onClose: () => void;
  onSave: (userId: string, role: string, isHidden: boolean) => Promise<void>;
}

interface DailyXpEntry {
  date: string;
  xp: number;
}

interface CalendarData {
  year: number;
  month: number;
  dailyXp: DailyXpEntry[];
}

const WEEK_HEADERS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const YEARS = Array.from({ length: 31 }, (_, i) => 2020 + i);

function isStreakGainedToday(lastXpGainedAt: string | null | undefined): boolean {
  if (!lastXpGainedAt) return false;
  try {
    const lastDateStr = new Date(lastXpGainedAt).toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);
    return lastDateStr === todayStr;
  } catch {
    return false;
  }
}

function getFlameStyle(xp: number) {
  if (xp <= 0) {
    return {
      bg: '#f3f4f6',
      iconColor: '#9ca3af',
      textColor: '#4b5563',
      fontWeight: '500'
    };
  }
  if (xp <= 25) {
    return {
      bg: '#FFF4E5',
      iconColor: '#FF9500',
      textColor: '#D97706',
      fontWeight: '600'
    };
  }
  if (xp <= 60) {
    return {
      bg: '#FFE8D6',
      iconColor: '#FF5722',
      textColor: '#EA580C',
      fontWeight: '700'
    };
  }
  return {
    bg: '#FFD8BE',
    iconColor: '#D97706',
    textColor: '#B45309',
    fontWeight: '700'
  };
}

const ChevronLeft = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRight = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export function UserEditModal({
  open,
  user,
  onClose,
  onSave
}: UserEditModalProps) {
  const currentUser = useAuthStore((state) => state.user);
  const isSelfSuperAdmin = currentUser?.id === user?.id && currentUser?.role === 'SUPER_ADMIN';

  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedIsHidden, setSelectedIsHidden] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  // Calendar States
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
      setSelectedIsHidden(user.isHidden);
    }
  }, [user]);

  useEffect(() => {
    if (open && user?.id) {
      const t = new Date();
      setYear(t.getFullYear());
      setMonth(t.getMonth() + 1);
    }
  }, [open, user?.id]);

  const fetchCalendar = useCallback(async () => {
    if (!user?.id) return;
    try {
      setCalendarLoading(true);
      const res = await client.get(`/api/admin/users/${user.id}/streak/calendar`, {
        params: { year, month }
      });
      setCalendarData(res.data);
    } catch (err) {
      console.error('Failed to fetch user streak calendar:', err);
    } finally {
      setCalendarLoading(false);
    }
  }, [user?.id, year, month]);

  useEffect(() => {
    if (open && user?.id) {
      fetchCalendar();
    }
  }, [open, user?.id, year, month, fetchCalendar]);

  if (!user) return null;

  const handleRoleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRole(e.target.value);
  };

  const handleVisibilitySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedIsHidden(e.target.value === 'true');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await onSave(user.id, selectedRole, selectedIsHidden);
    } finally {
      setSaving(false);
    }
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Calculate calendar grid (42 cells: 6 rows x 7 cols)
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const startPadding = (firstDayOfMonth.getUTCDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const dailyXpMap = new Map<number, number>();
  if (calendarData?.dailyXp) {
    calendarData.dailyXp.forEach((item) => {
      const dayNum = parseInt(item.date.slice(8, 10), 10);
      dailyXpMap.set(dayNum, item.xp);
    });
  }

  return (
    <Modal open={open} title="Chi tiết & Chỉnh sửa Người dùng" onClose={onClose} width={500}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header Avatar and Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(79,70,229,0.03))',
          padding: 16,
          borderRadius: 14,
          border: '1px solid rgba(108,99,255,0.1)'
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6c63ff, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 800,
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(108,99,255,0.2)'
          }}>
            {user.profileImgUrl ? (
              <img src={user.profileImgUrl} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: 12, objectFit: 'cover' }} />
            ) : (
              user.name?.[0]?.toUpperCase() ?? 'U'
            )}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{user.name}</h3>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>{user.email}</p>
          </div>
        </div>

        {/* Details Statistics */}
        <div>
          <h4 style={SECTION_TITLE_STYLE}>THÔNG TIN CHI TIẾT</h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            background: '#f8fafc',
            padding: 16,
            borderRadius: 14,
            border: '1px solid #e2e8f0'
          }}>
            <div style={STAT_BOX_STYLE}>
              <span style={STAT_LABEL_STYLE}>Tổng điểm XP</span>
              <span style={{ ...STAT_VALUE_STYLE, color: '#2563eb' }}>
                <IconXP size={16} color="#2563eb" style={{ marginRight: 6 }} /> {user.totalXp} XP
              </span>
            </div>
            <div style={STAT_BOX_STYLE}>
              <span style={STAT_LABEL_STYLE}>Số vàng sở hữu</span>
              <span style={{ ...STAT_VALUE_STYLE, color: '#d97706' }}>
                <IconGold size={16} color="#d97706" style={{ marginRight: 6 }} /> {user.totalGold}
              </span>
            </div>
            <div style={STAT_BOX_STYLE}>
              <span style={STAT_LABEL_STYLE}>Chuỗi hiện tại (Streak)</span>
              <span style={{ ...STAT_VALUE_STYLE, color: user.currentStreak > 0 && isStreakGainedToday(user.lastXpGainedAt) ? '#ef4444' : '#64748b' }}>
                <IconFlame size={16} color={user.currentStreak > 0 && isStreakGainedToday(user.lastXpGainedAt) ? '#ef4444' : '#cbd5e1'} style={{ marginRight: 6 }} /> {user.currentStreak} ngày
              </span>
            </div>
            <div style={STAT_BOX_STYLE}>
              <span style={STAT_LABEL_STYLE}>Chuỗi kỷ lục</span>
              <span style={{ ...STAT_VALUE_STYLE, color: '#f97316' }}>
                <IconFlame size={16} color="#f97316" style={{ marginRight: 6 }} /> {user.highestStreak} ngày
              </span>
            </div>
            <div style={{ ...STAT_BOX_STYLE, gridColumn: 'span 2' }}>
              <span style={STAT_LABEL_STYLE}>Trạng thái xác thực</span>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                {user.isVerified ? (
                  <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 12, padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>✓ Đã xác thực tài khoản</span>
                ) : (
                  <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: 12, padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>Chưa xác thực tài khoản</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form Controls / Edit Settings */}
        <div>
          <h4 style={SECTION_TITLE_STYLE}>CÀI ĐẶT TÀI KHOẢN</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Role Select */}
            <div style={CONTROL_GROUP_STYLE}>
              <label style={LABEL_STYLE}>Vai trò người dùng</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedRole}
                  onChange={handleRoleSelectChange}
                  disabled={saving}
                  style={{ ...SELECT_STYLE, paddingRight: 36 }}
                >
                  <option value="STUDENT" disabled={isSelfSuperAdmin}>STUDENT (Học sinh)</option>
                  <option value="ADMIN" disabled={isSelfSuperAdmin}>ADMIN (Quản trị)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Tối cao)</option>
                </select>
                <span style={CHEVRON_WRAPPER_STYLE}>
                  <IconChevronDown size={16} color="#64748b" />
                </span>
              </div>
              {isSelfSuperAdmin && (
                <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                  * Quản trị viên tối cao không thể tự giáng cấp bản thân.
                </div>
              )}
            </div>

            {/* Visibility Select */}
            <div style={CONTROL_GROUP_STYLE}>
              <label style={LABEL_STYLE}>Trạng thái hiển thị</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedIsHidden ? 'true' : 'false'}
                  onChange={handleVisibilitySelectChange}
                  disabled={saving}
                  style={{
                    ...SELECT_STYLE,
                    paddingRight: 36,
                    color: selectedIsHidden ? '#ef4444' : '#16a34a',
                    background: selectedIsHidden ? '#fef2f2' : '#f0fdf4',
                    borderColor: selectedIsHidden ? '#fca5a5' : '#86efac',
                  }}
                >
                  <option value="false" style={{ color: '#16a34a' }}>Hiển thị công khai</option>
                  <option value="true" style={{ color: '#ef4444' }}>Bị ẩn (Vô hiệu hóa)</option>
                </select>
                <span style={CHEVRON_WRAPPER_STYLE}>
                  <IconChevronDown size={16} color={selectedIsHidden ? '#ef4444' : '#16a34a'} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Streak Calendar Section */}
        <div>
          <h4 style={SECTION_TITLE_STYLE}>LỊCH CHUỖI HỌC TẬP (STREAK)</h4>
          <div style={{ background: '#f8fafc', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0' }}>
            {/* Calendar Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={NAV_BUTTON_STYLE}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              >
                <ChevronLeft size={14} />
              </button>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  style={CALENDAR_SELECT_STYLE}
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>

                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  style={CALENDAR_SELECT_STYLE}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                style={NAV_BUTTON_STYLE}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Calendar Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
              {WEEK_HEADERS.map((h) => (
                <div key={h} style={WEEK_HEADER_CELL_STYLE}>
                  {h}
                </div>
              ))}
            </div>

            {/* Calendar Grid cells */}
            {calendarLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 180 }}>
                <Spinner size={24} />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {Array.from({ length: 42 }).map((_, slotIdx) => {
                  const day = slotIdx - startPadding + 1;
                  const isValidDay = day >= 1 && day <= daysInMonth;

                  if (!isValidDay) {
                    return <div key={`slot-${slotIdx}`} style={{ height: 38 }} />;
                  }

                  const xp = dailyXpMap.get(day) || 0;
                  const flameStyle = getFlameStyle(xp);

                  return (
                    <div
                      key={`slot-${slotIdx}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 38,
                        position: 'relative'
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          backgroundColor: flameStyle.bg,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          transition: 'transform 0.2s',
                          boxShadow: xp > 0 ? '0 2px 4px rgba(217,119,6,0.1)' : 'none',
                          gap: 1
                        }}
                        title={xp > 0 ? `${xp} XP gained` : undefined}
                      >
                        <IconFlame size={10} color={flameStyle.iconColor} style={{ marginTop: 2 }} />
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: flameStyle.fontWeight as any,
                            color: flameStyle.textColor,
                            marginBottom: 2,
                            lineHeight: 1
                          }}
                        >
                          {day}
                        </span>
                      </div>
                      {xp > 0 && (
                        <span
                          style={{
                            fontSize: 7,
                            fontWeight: '700',
                            color: '#4f46e5',
                            marginTop: 1,
                            lineHeight: 1
                          }}
                        >
                          +{xp}XP
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button onClick={handleSave} loading={saving}>Lưu thay đổi</Button>
        </div>
      </div>
    </Modal>
  );
}

const SECTION_TITLE_STYLE = {
  margin: '0 0 8px 0',
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  letterSpacing: '0.05em'
};

const STAT_BOX_STYLE = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 2
};

const STAT_LABEL_STYLE = {
  fontSize: 11,
  color: '#94a3b8',
  fontWeight: 500
};

const STAT_VALUE_STYLE = {
  fontSize: 14,
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center'
};

const CONTROL_GROUP_STYLE = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 6
};

const LABEL_STYLE = {
  fontSize: 12,
  fontWeight: 600,
  color: '#475569'
};

const SELECT_STYLE = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  fontSize: 14,
  fontWeight: 600,
  color: '#334155',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
};

export const SPINNER_STYLE = {
  position: 'absolute' as const,
  right: 14,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 14,
  height: 14,
  border: '2px solid rgba(0,0,0,0.1)',
  borderTopColor: '#6c63ff',
  borderRadius: '50%',
  animation: 'spin 0.6s linear infinite'
};

const CHEVRON_WRAPPER_STYLE = {
  position: 'absolute' as const,
  right: 14,
  top: '50%',
  transform: 'translateY(-50%)',
  pointerEvents: 'none' as const,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const NAV_BUTTON_STYLE = {
  background: '#f1f5f9',
  border: '1px solid #e2e8f0',
  color: '#475569',
  width: 28,
  height: 28,
  borderRadius: 6,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s',
  outline: 'none'
};

const CALENDAR_SELECT_STYLE = {
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  fontSize: 12,
  fontWeight: 600,
  color: '#334155',
  outline: 'none',
  cursor: 'pointer'
};

const WEEK_HEADER_CELL_STYLE = {
  textAlign: 'center' as const,
  fontSize: 10,
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  paddingBottom: 2
};
