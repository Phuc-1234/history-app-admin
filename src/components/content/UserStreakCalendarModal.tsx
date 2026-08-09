import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { IconFlame } from '../ui/Icons';

interface UserStreakCalendarModalProps {
  open: boolean;
  userId: string | null;
  userName: string | null;
  onClose: () => void;
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

export function UserStreakCalendarModal({ open, userId, userName, onClose }: UserStreakCalendarModalProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CalendarData | null>(null);

  const fetchCalendar = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await client.get(`/api/admin/users/${userId}/streak/calendar`, {
        params: { year, month }
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch user streak calendar:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, year, month]);

  useEffect(() => {
    if (open && userId) {
      fetchCalendar();
    }
  }, [open, userId, fetchCalendar]);

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
  if (data?.dailyXp) {
    data.dailyXp.forEach((item) => {
      const dayNum = parseInt(item.date.slice(8, 10), 10);
      dailyXpMap.set(dayNum, item.xp);
    });
  }

  return (
    <Modal open={open} title={`Lịch chuỗi học tập: ${userName ?? ''}`} onClose={onClose} width={450}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Navigation / Month-Year Selector Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button
            onClick={handlePrevMonth}
            style={NAV_BUTTON_STYLE}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
          >
            <ChevronLeft size={16} />
          </button>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              style={SELECT_STYLE}
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={SELECT_STYLE}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>Năm {y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleNextMonth}
            style={NAV_BUTTON_STYLE}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Calendar Area */}
        <div style={{ background: '#f8fafc', borderRadius: 16, padding: 16, border: '1px solid #f1f5f9' }}>
          {/* Week Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 12 }}>
            {WEEK_HEADERS.map((h) => (
              <div key={h} style={WEEK_HEADER_CELL_STYLE}>
                {h}
              </div>
            ))}
          </div>

          {/* Grid Content */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 260 }}>
              <Spinner size={32} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {Array.from({ length: 42 }).map((_, slotIdx) => {
                const day = slotIdx - startPadding + 1;
                const isValidDay = day >= 1 && day <= daysInMonth;

                if (!isValidDay) {
                  return <div key={`slot-${slotIdx}`} style={{ height: 48 }} />;
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
                      height: 48,
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        backgroundColor: flameStyle.bg,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        transition: 'transform 0.2s',
                        boxShadow: xp > 0 ? '0 2px 6px rgba(217,119,6,0.15)' : 'none',
                      }}
                      title={xp > 0 ? `${xp} XP gained` : undefined}
                    >
                      <IconFlame size={12} color={flameStyle.iconColor} style={{ marginTop: 2 }} />
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: flameStyle.fontWeight as any,
                          color: flameStyle.textColor,
                          marginTop: -2,
                          lineHeight: 1
                        }}
                      >
                        {day}
                      </span>
                    </div>
                    {xp > 0 && (
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: '700',
                          color: '#4f46e5',
                          marginTop: 2,
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
    </Modal>
  );
}

const NAV_BUTTON_STYLE = {
  background: '#f1f5f9',
  border: '1px solid #e2e8f0',
  color: '#475569',
  width: 32,
  height: 32,
  borderRadius: 8,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s',
  outline: 'none'
};

const SELECT_STYLE = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  outline: 'none',
  cursor: 'pointer'
};

const WEEK_HEADER_CELL_STYLE = {
  textAlign: 'center' as const,
  fontSize: 11,
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  paddingBottom: 4
};
