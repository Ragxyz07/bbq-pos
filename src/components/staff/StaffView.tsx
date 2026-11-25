import React, { useState, useMemo } from 'react';
import {
  StaffMember,
  StaffSalaryType,
  StaffAttendanceRecord,
  AttendanceStatus,
  StaffPayoutRecord,
  StaffPayoutType,
} from '../../types';
import { storage } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { formatCurrency } from '../../utils/format';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Download,
  Users,
  Calendar,
  Wallet,
  FileSpreadsheet,
  Phone,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Banknote,
} from 'lucide-react';

interface StaffViewProps {
  staffMembers: StaffMember[];
  setStaffMembers: (members: StaffMember[]) => void;
  attendanceRecords: StaffAttendanceRecord[];
  setAttendanceRecords: (records: StaffAttendanceRecord[]) => void;
  payoutRecords: StaffPayoutRecord[];
  setPayoutRecords: (records: StaffPayoutRecord[]) => void;
  soundEnabled?: boolean;
}

const getTodayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

const getCurrentMonthKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const shiftDateKey = (dateStr: string, deltaDays: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaDays);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`;
};

const getDaysInMonth = (monthKey: string): number => {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
};

const formatDisplayDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDisplayMonth = (monthKey: string): string => {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
};

export const StaffView: React.FC<StaffViewProps> = ({
  staffMembers,
  setStaffMembers,
  attendanceRecords,
  setAttendanceRecords,
  payoutRecords,
  setPayoutRecords,
  soundEnabled = true,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'attendance' | 'payouts' | 'salary' | 'profiles'
  >('attendance');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Date & Month selectors
  const todayKey = getTodayKey();
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());

  // Payout ledger filters
  const [payoutStaffFilter, setPayoutStaffFilter] = useState<string>('all');
  const [payoutTypeFilter, setPayoutTypeFilter] = useState<'all' | StaffPayoutType>('all');
  const [payoutMonthFilter, setPayoutMonthFilter] = useState<string>(getCurrentMonthKey());

  // Add / Edit Staff Profile Modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formSalaryType, setFormSalaryType] = useState<StaffSalaryType>('daily');
  const [formSalaryAmount, setFormSalaryAmount] = useState<string>('');

  // Advance / Salary Payout Modal
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState<boolean>(false);
  const [payoutStaffId, setPayoutStaffId] = useState<string>('');
  const [payoutType, setPayoutType] = useState<StaffPayoutType>('advance');
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [payoutDate, setPayoutDate] = useState<string>(todayKey);
  const [payoutMode, setPayoutMode] = useState<'cash' | 'upi'>('cash');
  const [payoutNote, setPayoutNote] = useState<string>('');

  // Attendance note editing inline state
  const [editingNoteStaffId, setEditingNoteStaffId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');

  // Delete confirmations
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);
  const [deletingPayout, setDeletingPayout] = useState<StaffPayoutRecord | null>(null);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const activeStaff = useMemo(
    () => staffMembers.filter((s) => s.isActive),
    [staffMembers]
  );

  // Attendance lookup for selectedDate
  const attendanceByStaffForDate = useMemo(() => {
    const map = new Map<string, StaffAttendanceRecord>();
    attendanceRecords.forEach((rec) => {
      if (rec.dateStr === selectedDate) {
        map.set(rec.staffId, rec);
      }
    });
    return map;
  }, [attendanceRecords, selectedDate]);

  // Month worked days count per staff (using selectedDate's month when on Attendance tab, or selectedMonth)
  const attendanceMonthKey = selectedDate.slice(0, 7);

  const getMonthAttendanceStats = (staffId: string, monthKey: string) => {
    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    attendanceRecords.forEach((rec) => {
      if (rec.staffId === staffId && rec.dateStr.startsWith(monthKey)) {
        if (rec.status === 'present') presentDays += 1;
        else if (rec.status === 'half') halfDays += 1;
        else if (rec.status === 'absent') absentDays += 1;
      }
    });
    const workedDays = presentDays + halfDays * 0.5;
    return { presentDays, halfDays, absentDays, workedDays };
  };

  // Working count on selectedDate
  const workingOnSelectedDate = useMemo(() => {
    let count = 0;
    activeStaff.forEach((s) => {
      const rec = attendanceByStaffForDate.get(s.id);
      if (rec?.status === 'present') count += 1;
      else if (rec?.status === 'half') count += 0.5;
    });
    return count;
  }, [activeStaff, attendanceByStaffForDate]);

  // Salary Sheet calculations for selectedMonth
  const salarySheetRows = useMemo(() => {
    const daysInMonth = getDaysInMonth(selectedMonth);

    return staffMembers
      .filter((member) => {
        if (member.isActive) return true;
        const hasAtt = attendanceRecords.some(
          (r) => r.staffId === member.id && r.dateStr.startsWith(selectedMonth)
        );
        const hasPay = payoutRecords.some(
          (p) => p.staffId === member.id && p.dateStr.startsWith(selectedMonth)
        );
        return hasAtt || hasPay;
      })
      .map((member) => {
        const stats = getMonthAttendanceStats(member.id, selectedMonth);
        const earnedRaw =
          member.salaryType === 'daily'
            ? stats.workedDays * member.salaryAmount
            : (member.salaryAmount / daysInMonth) * stats.workedDays;
        const earned = Math.round(earnedRaw);

        let advanceTaken = 0;
        let salaryPaid = 0;
        let bonusAdded = 0;

        payoutRecords.forEach((p) => {
          if (p.staffId === member.id && p.dateStr.startsWith(selectedMonth)) {
            if (p.type === 'advance') advanceTaken += p.amount;
            else if (p.type === 'salary') salaryPaid += p.amount;
            else if (p.type === 'bonus') bonusAdded += p.amount;
          }
        });

        const balanceDue = earned + bonusAdded - advanceTaken - salaryPaid;

        return {
          member,
          ...stats,
          daysInMonth,
          earned,
          bonusAdded,
          advanceTaken,
          salaryPaid,
          balanceDue,
        };
      });
  }, [staffMembers, attendanceRecords, payoutRecords, selectedMonth]);

  const totalMonthBalanceDue = useMemo(
    () =>
      salarySheetRows.reduce(
        (sum, row) => sum + (row.balanceDue > 0 ? row.balanceDue : 0),
        0
      ),
    [salarySheetRows]
  );

  // Filtered Payout Ledger
  const filteredPayouts = useMemo(() => {
    return [...payoutRecords]
      .filter((p) => {
        if (payoutStaffFilter !== 'all' && p.staffId !== payoutStaffFilter) return false;
        if (payoutTypeFilter !== 'all' && p.type !== payoutTypeFilter) return false;
        if (payoutMonthFilter && !p.dateStr.startsWith(payoutMonthFilter)) return false;
        return true;
      })
      .sort((a, b) => {
        if (b.dateStr !== a.dateStr) return b.dateStr.localeCompare(a.dateStr);
        return b.timestamp - a.timestamp;
      });
  }, [payoutRecords, payoutStaffFilter, payoutTypeFilter, payoutMonthFilter]);

  const filteredPayoutTotals = useMemo(() => {
    let advance = 0;
    let salary = 0;
    let bonus = 0;
    filteredPayouts.forEach((p) => {
      if (p.type === 'advance') advance += p.amount;
      else if (p.type === 'salary') salary += p.amount;
      else if (p.type === 'bonus') bonus += p.amount;
    });
    return { advance, salary, bonus, total: advance + salary + bonus };
  }, [filteredPayouts]);

  // ================= HANDLERS: STAFF PROFILE =================
  const openAddStaffModal = () => {
    sound.playTap(soundEnabled);
    setEditingStaff(null);
    setFormName('');
    setFormPhone('');
    setFormSalaryType('daily');
    setFormSalaryAmount('');
    setIsProfileModalOpen(true);
  };

  const openEditStaffModal = (member: StaffMember) => {
    sound.playTap(soundEnabled);
    setEditingStaff(member);
    setFormName(member.name);
    setFormPhone(member.phone);
    setFormSalaryType(member.salaryType);
    setFormSalaryAmount(String(member.salaryAmount));
    setIsProfileModalOpen(true);
  };

  const handleSaveStaffProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    const cleanPhone = formPhone.trim();
    const amountVal = Math.max(0, Math.round(Number(formSalaryAmount) || 0));
    if (!cleanName || !cleanPhone) return;

    const nowIso = new Date().toISOString();

    if (editingStaff) {
      const updated = staffMembers.map((m) =>
        m.id === editingStaff.id
          ? {
              ...m,
              name: cleanName,
              phone: cleanPhone,
              salaryType: formSalaryType,
              salaryAmount: amountVal,
              updatedAt: nowIso,
            }
          : m
      );
      storage.saveStaffMembers(updated);
      setStaffMembers(updated);

      // Update display name in existing payouts if renamed
      if (cleanName !== editingStaff.name) {
        const updatedPayouts = payoutRecords.map((p) =>
          p.staffId === editingStaff.id ? { ...p, staffName: cleanName } : p
        );
        storage.saveStaffPayouts(updatedPayouts);
        setPayoutRecords(updatedPayouts);
      }

      showToast(`Updated ${cleanName}`);
    } else {
      const newMember: StaffMember = {
        id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName,
        phone: cleanPhone,
        salaryType: formSalaryType,
        salaryAmount: amountVal,
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const updated = [...staffMembers, newMember];
      storage.saveStaffMembers(updated);
      setStaffMembers(updated);
      showToast(`Added ${cleanName}`);
    }

    sound.playCashSuccess(soundEnabled);
    setIsProfileModalOpen(false);
  };

  const handleToggleStaffActive = (member: StaffMember) => {
    sound.playTap(soundEnabled);
    const updated = staffMembers.map((m) =>
      m.id === member.id
        ? { ...m, isActive: !m.isActive, updatedAt: new Date().toISOString() }
        : m
    );
    storage.saveStaffMembers(updated);
    setStaffMembers(updated);
    showToast(`${member.name} marked ${!member.isActive ? 'Active' : 'Inactive'}`);
  };

  const handleConfirmDeleteStaff = () => {
    if (!deletingStaff) return;
    const updated = staffMembers.filter((m) => m.id !== deletingStaff.id);
    storage.saveStaffMembers(updated);
    setStaffMembers(updated);
    sound.playCancel(soundEnabled);
    showToast(`Removed ${deletingStaff.name}`);
    setDeletingStaff(null);
  };

  // ================= HANDLERS: DAILY ATTENDANCE =================
  const handleMarkAttendance = (staffId: string, status: AttendanceStatus) => {
    sound.playTap(soundEnabled);
    const nowIso = new Date().toISOString();
    const existingIdx = attendanceRecords.findIndex(
      (r) => r.staffId === staffId && r.dateStr === selectedDate
    );

    let updated: StaffAttendanceRecord[];
    if (existingIdx !== -1) {
      updated = attendanceRecords.map((r, idx) =>
        idx === existingIdx ? { ...r, status, updatedAt: nowIso } : r
      );
    } else {
      const newRec: StaffAttendanceRecord = {
        id: `att-${selectedDate}-${staffId}`,
        staffId,
        dateStr: selectedDate,
        status,
        updatedAt: nowIso,
      };
      updated = [newRec, ...attendanceRecords];
    }

    storage.saveStaffAttendance(updated);
    setAttendanceRecords(updated);
  };

  const handleSaveAttendanceNote = (staffId: string) => {
    const nowIso = new Date().toISOString();
    const existingIdx = attendanceRecords.findIndex(
      (r) => r.staffId === staffId && r.dateStr === selectedDate
    );
    const cleanNote = noteDraft.trim() || undefined;

    let updated: StaffAttendanceRecord[];
    if (existingIdx !== -1) {
      updated = attendanceRecords.map((r, idx) =>
        idx === existingIdx ? { ...r, note: cleanNote, updatedAt: nowIso } : r
      );
    } else {
      const newRec: StaffAttendanceRecord = {
        id: `att-${selectedDate}-${staffId}`,
        staffId,
        dateStr: selectedDate,
        status: 'present',
        note: cleanNote,
        updatedAt: nowIso,
      };
      updated = [newRec, ...attendanceRecords];
    }

    storage.saveStaffAttendance(updated);
    setAttendanceRecords(updated);
    setEditingNoteStaffId(null);
    sound.playTap(soundEnabled);
  };

  const handleMarkAllPresent = () => {
    if (activeStaff.length === 0) return;
    sound.playCashSuccess(soundEnabled);
    const nowIso = new Date().toISOString();
    const updatedMap = new Map<string, StaffAttendanceRecord>();

    attendanceRecords.forEach((r) => {
      updatedMap.set(`${r.dateStr}::${r.staffId}`, r);
    });

    activeStaff.forEach((member) => {
      const key = `${selectedDate}::${member.id}`;
      const existing = updatedMap.get(key);
      updatedMap.set(key, {
        id: existing?.id || `att-${selectedDate}-${member.id}`,
        staffId: member.id,
        dateStr: selectedDate,
        status: 'present',
        note: existing?.note,
        updatedAt: nowIso,
      });
    });

    const updated = Array.from(updatedMap.values());
    storage.saveStaffAttendance(updated);
    setAttendanceRecords(updated);
    showToast(`Marked all ${activeStaff.length} active staff Present for ${formatDisplayDate(selectedDate)}`);
  };

  // ================= HANDLERS: PAYOUTS / ADVANCE =================
  const openPayoutModal = (opts?: {
    staffId?: string;
    type?: StaffPayoutType;
    amount?: number;
    note?: string;
  }) => {
    sound.playTap(soundEnabled);
    const defaultStaff = opts?.staffId || activeStaff[0]?.id || staffMembers[0]?.id || '';
    setPayoutStaffId(defaultStaff);
    setPayoutType(opts?.type || 'advance');
    setPayoutAmount(opts?.amount && opts.amount > 0 ? String(Math.round(opts.amount)) : '');
    setPayoutDate(todayKey);
    setPayoutMode('cash');
    setPayoutNote(opts?.note || '');
    setIsPayoutModalOpen(true);
  };

  const handleSavePayout = (e: React.FormEvent) => {
    e.preventDefault();
    const staff = staffMembers.find((s) => s.id === payoutStaffId);
    const amountVal = Math.round(Number(payoutAmount) || 0);
    if (!staff || amountVal <= 0) return;

    const newPayout: StaffPayoutRecord = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      staffId: staff.id,
      staffName: staff.name,
      type: payoutType,
      amount: amountVal,
      dateStr: payoutDate || todayKey,
      paymentMode: payoutMode,
      note: payoutNote.trim() || undefined,
      timestamp: Date.now(),
    };

    const updated = [newPayout, ...payoutRecords];
    storage.saveStaffPayouts(updated);
    setPayoutRecords(updated);
    sound.playCashSuccess(soundEnabled);
    setIsPayoutModalOpen(false);
    showToast(`Saved ₹${amountVal} ${payoutType} for ${staff.name}`);
  };

  const handleConfirmDeletePayout = () => {
    if (!deletingPayout) return;
    const updated = payoutRecords.filter((p) => p.id !== deletingPayout.id);
    storage.saveStaffPayouts(updated);
    setPayoutRecords(updated);
    sound.playCancel(soundEnabled);
    showToast(`Deleted ₹${deletingPayout.amount} payout record`);
    setDeletingPayout(null);
  };

  // ================= HANDLER: CSV EXPORT =================
  const handleExportCSV = () => {
    sound.playTap(soundEnabled);
    let csvContent = '';
    let filename = '';

    if (activeSubTab === 'salary') {
      const headers = [
        'Staff Name',
        'Phone',
        'Salary Type',
        'Rate (INR)',
        'Present Days',
        'Half Days',
        'Absent Days',
        'Worked Days',
        'Earned (INR)',
        'Bonus (INR)',
        'Advance Taken (INR)',
        'Salary Paid (INR)',
        'Balance Due (INR)',
      ];
      const rows = salarySheetRows.map((row) =>
        [
          `"${row.member.name.replace(/"/g, '""')}"`,
          `"${row.member.phone}"`,
          `"${row.member.salaryType.toUpperCase()}"`,
          row.member.salaryAmount,
          row.presentDays,
          row.halfDays,
          row.absentDays,
          row.workedDays,
          row.earned,
          row.bonusAdded,
          row.advanceTaken,
          row.salaryPaid,
          row.balanceDue,
        ].join(',')
      );
      csvContent = [headers.join(','), ...rows].join('\n');
      filename = `bbq_boxx_salary_sheet_${selectedMonth}.csv`;
    } else if (activeSubTab === 'payouts') {
      const headers = ['Date', 'Staff Name', 'Type', 'Mode', 'Amount (INR)', 'Note'];
      const rows = filteredPayouts.map((p) =>
        [
          `"${p.dateStr}"`,
          `"${p.staffName.replace(/"/g, '""')}"`,
          `"${p.type.toUpperCase()}"`,
          `"${p.paymentMode.toUpperCase()}"`,
          p.amount,
          `"${(p.note || '').replace(/"/g, '""')}"`,
        ].join(',')
      );
      csvContent = [headers.join(','), ...rows].join('\n');
      filename = `bbq_boxx_staff_payouts_${payoutMonthFilter || 'all'}.csv`;
    } else {
      const headers = [
        'Name',
        'Phone',
        'Salary Type',
        'Salary Amount',
        'Status',
        `Worked Days (${attendanceMonthKey})`,
      ];
      const rows = staffMembers.map((m) => {
        const stats = getMonthAttendanceStats(m.id, attendanceMonthKey);
        return [
          `"${m.name.replace(/"/g, '""')}"`,
          `"${m.phone}"`,
          `"${m.salaryType.toUpperCase()}"`,
          m.salaryAmount,
          `"${m.isActive ? 'ACTIVE' : 'INACTIVE'}"`,
          stats.workedDays,
        ].join(',');
      });
      csvContent = [headers.join(','), ...rows].join('\n');
      filename = `bbq_boxx_staff_list_${todayKey}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24 md:pb-8 space-y-4">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border-2 border-black p-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-black uppercase tracking-tight">
            STAFF, ATTENDANCE &amp; SALARY
          </h2>
          <p className="text-xs text-black/70 mt-0.5">
            Track staff profiles (name &amp; phone), who works on each date, advance payouts &amp; monthly salary balances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAddStaffModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 text-white border border-red-600 hover:bg-red-700 text-xs font-bold uppercase transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff</span>
          </button>

          <button
            type="button"
            disabled={staffMembers.length === 0}
            onClick={() => openPayoutModal()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-black border border-black hover:bg-black hover:text-white disabled:opacity-40 disabled:pointer-events-none text-xs font-bold uppercase transition-colors"
          >
            <Banknote className="w-4 h-4 text-red-600" />
            <span>+ Advance / Pay</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={staffMembers.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-black border border-black hover:bg-black hover:text-white disabled:opacity-40 disabled:pointer-events-none text-xs font-bold uppercase transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Inline Toast */}
      {feedbackMsg && (
        <div className="flex items-center justify-between bg-black text-white px-3.5 py-2 text-xs font-bold uppercase">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-red-500 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button type="button" onClick={() => setFeedbackMsg(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Compact 3-Cell Summary Strip */}
      <div className="grid grid-cols-3 border border-black bg-white divide-x divide-black">
        <button
          type="button"
          onClick={() => setActiveSubTab('profiles')}
          className="p-3 text-left hover:bg-black/5 transition-colors"
        >
          <div className="text-[10px] font-bold uppercase text-black/65">Active Staff</div>
          <div className="text-xl sm:text-2xl font-bold text-black tabular-nums mt-0.5">
            {activeStaff.length}
            {staffMembers.length > activeStaff.length && (
              <span className="text-xs font-normal text-black/50 ml-1">
                / {staffMembers.length}
              </span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('attendance')}
          className="p-3 text-left hover:bg-black/5 transition-colors"
        >
          <div className="text-[10px] font-bold uppercase text-black/65 truncate">
            Working ({selectedDate === todayKey ? 'Today' : formatDisplayDate(selectedDate)})
          </div>
          <div className="text-xl sm:text-2xl font-bold text-black tabular-nums mt-0.5">
            {workingOnSelectedDate}
            <span className="text-xs font-normal text-black/50 ml-1">
              / {activeStaff.length}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('salary')}
          className="p-3 text-left hover:bg-red-50 transition-colors"
        >
          <div className="text-[10px] font-bold uppercase text-red-600 truncate">
            Month Balance Due
          </div>
          <div className="text-xl sm:text-2xl font-bold text-red-600 tabular-nums mt-0.5">
            {formatCurrency(totalMonthBalanceDue)}
          </div>
        </button>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border border-black p-1 bg-white overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            sound.playTap(soundEnabled);
            setActiveSubTab('attendance');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase whitespace-nowrap transition-colors ${
            activeSubTab === 'attendance' ? 'bg-black text-white' : 'text-black hover:bg-black/5'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Daily Attendance</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playTap(soundEnabled);
            setActiveSubTab('payouts');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase whitespace-nowrap transition-colors ${
            activeSubTab === 'payouts' ? 'bg-black text-white' : 'text-black hover:bg-black/5'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Advance &amp; Payouts ({payoutRecords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playTap(soundEnabled);
            setActiveSubTab('salary');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase whitespace-nowrap transition-colors ${
            activeSubTab === 'salary' ? 'bg-black text-white' : 'text-black hover:bg-black/5'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Salary Sheet</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playTap(soundEnabled);
            setActiveSubTab('profiles');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase whitespace-nowrap transition-colors ${
            activeSubTab === 'profiles' ? 'bg-black text-white' : 'text-black hover:bg-black/5'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Staff Profiles ({staffMembers.length})</span>
        </button>
      </div>

      {/* Empty State when no staff added yet */}
      {staffMembers.length === 0 ? (
        <div className="bg-white border-2 border-black p-8 sm:p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-red-600 mx-auto" />
          <h3 className="text-base font-bold uppercase text-black">
            No Staff Added Yet
          </h3>
          <p className="text-xs text-black/70 max-w-md mx-auto">
            Add your staff members with their name, phone number, and daily or monthly salary rate. No login required.
          </p>
          <button
            type="button"
            onClick={openAddStaffModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-600 text-white border border-red-600 hover:bg-red-700 text-xs font-bold uppercase"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Staff Member</span>
          </button>
        </div>
      ) : (
        <>
          {/* ================= SUB-TAB 1: DAILY ATTENDANCE ================= */}
          {activeSubTab === 'attendance' && (
            <div className="space-y-3">
              {/* Date Bar & Mark All */}
              <div className="bg-white border border-black p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap(soundEnabled);
                      setSelectedDate((d) => shiftDateKey(d, -1));
                    }}
                    className="p-2 border border-black bg-white hover:bg-black hover:text-white"
                    title="Previous Day"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                    className="border border-black bg-white px-2.5 py-1.5 text-xs font-bold text-black focus:outline-none focus:border-red-600"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap(soundEnabled);
                      setSelectedDate((d) => shiftDateKey(d, 1));
                    }}
                    className="p-2 border border-black bg-white hover:bg-black hover:text-white"
                    title="Next Day"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {selectedDate !== todayKey && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTap(soundEnabled);
                        setSelectedDate(todayKey);
                      }}
                      className="px-2.5 py-1.5 border border-black bg-white text-black hover:bg-black hover:text-white text-xs font-bold uppercase"
                    >
                      Today
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-black/70">
                    {formatDisplayDate(selectedDate)}
                  </span>
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    disabled={activeStaff.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white hover:bg-black/85 disabled:opacity-40 text-xs font-bold uppercase border border-black"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Mark All Present</span>
                  </button>
                </div>
              </div>

              {activeStaff.length === 0 ? (
                <div className="bg-white border border-black p-8 text-center text-xs font-bold uppercase text-black/60">
                  All staff members are currently marked Inactive. Activate staff in Staff Profiles.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeStaff.map((member) => {
                    const rec = attendanceByStaffForDate.get(member.id);
                    const status = rec?.status;
                    const monthStats = getMonthAttendanceStats(member.id, attendanceMonthKey);
                    const isEditingNote = editingNoteStaffId === member.id;

                    return (
                      <div
                        key={member.id}
                        className={`bg-white border-2 p-4 flex flex-col justify-between gap-3 ${
                          status === 'absent'
                            ? 'border-red-600'
                            : status === 'present' || status === 'half'
                            ? 'border-black'
                            : 'border-black/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-bold text-black uppercase tracking-tight">
                                {member.name}
                              </h3>
                            </div>
                            <div className="text-[11px] text-black/70 mt-1 flex items-center gap-2 flex-wrap">
                              <span>{member.phone}</span>
                              <span>&bull;</span>
                              <span>
                                {formatCurrency(member.salaryAmount)}/
                                {member.salaryType === 'daily' ? 'day' : 'mo'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold text-black tabular-nums">
                              {monthStats.workedDays} days
                            </div>
                            <div className="text-[10px] text-black/60 uppercase">
                              This Month
                            </div>
                          </div>
                        </div>

                        {/* Present / Half Day / Absent Buttons */}
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMarkAttendance(member.id, 'present')}
                            className={`py-2 text-xs font-bold uppercase border transition-colors ${
                              status === 'present'
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-black border-black hover:bg-black/5'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkAttendance(member.id, 'half')}
                            className={`py-2 text-xs font-bold uppercase border transition-colors ${
                              status === 'half'
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-black border-black hover:bg-black/5'
                            }`}
                          >
                            Half Day
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkAttendance(member.id, 'absent')}
                            className={`py-2 text-xs font-bold uppercase border transition-colors ${
                              status === 'absent'
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white text-red-600 border-red-600 hover:bg-red-50'
                            }`}
                          >
                            Absent
                          </button>
                        </div>

                        {/* Optional Daily Note + Quick Advance */}
                        <div className="pt-2 border-t border-black/15 flex items-center justify-between gap-2">
                          {isEditingNote ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="text"
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                placeholder="Shift note (e.g. evening shift)"
                                className="flex-1 bg-white border border-black px-2 py-1 text-xs text-black focus:outline-none focus:border-red-600"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveAttendanceNote(member.id)}
                                className="px-2 py-1 bg-black text-white text-[11px] font-bold uppercase"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingNoteStaffId(null)}
                                className="p-1 border border-black text-black"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNoteStaffId(member.id);
                                  setNoteDraft(rec?.note || '');
                                }}
                                className="text-[11px] text-black/65 hover:text-black truncate text-left"
                              >
                                {rec?.note ? `Note: ${rec.note}` : '+ Add date note'}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openPayoutModal({
                                    staffId: member.id,
                                    type: 'advance',
                                  })
                                }
                                className="px-2.5 py-1 border border-black bg-white hover:bg-black hover:text-white text-[11px] font-bold uppercase shrink-0"
                              >
                                + Advance
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= SUB-TAB 2: ADVANCE & PAYOUTS ================= */}
          {activeSubTab === 'payouts' && (
            <div className="space-y-3">
              <div className="bg-white border border-black p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={payoutStaffFilter}
                    onChange={(e) => setPayoutStaffFilter(e.target.value)}
                    className="bg-white border border-black px-2.5 py-1.5 text-xs font-bold text-black focus:outline-none"
                  >
                    <option value="all">All Staff</option>
                    {staffMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={payoutTypeFilter}
                    onChange={(e) =>
                      setPayoutTypeFilter(e.target.value as 'all' | StaffPayoutType)
                    }
                    className="bg-white border border-black px-2.5 py-1.5 text-xs font-bold text-black focus:outline-none"
                  >
                    <option value="all">All Types</option>
                    <option value="advance">Advance</option>
                    <option value="salary">Salary Paid</option>
                    <option value="bonus">Bonus</option>
                  </select>

                  <input
                    type="month"
                    value={payoutMonthFilter}
                    onChange={(e) => setPayoutMonthFilter(e.target.value)}
                    className="bg-white border border-black px-2.5 py-1.5 text-xs font-bold text-black focus:outline-none"
                  />

                  {payoutMonthFilter && (
                    <button
                      type="button"
                      onClick={() => setPayoutMonthFilter('')}
                      className="px-2 py-1.5 border border-black text-[11px] font-bold uppercase hover:bg-black hover:text-white"
                    >
                      All Months
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  <span>
                    Advance:{' '}
                    <span className="text-red-600 tabular-nums">
                      {formatCurrency(filteredPayoutTotals.advance)}
                    </span>
                  </span>
                  <span>
                    Salary:{' '}
                    <span className="text-black tabular-nums">
                      {formatCurrency(filteredPayoutTotals.salary)}
                    </span>
                  </span>
                  {filteredPayoutTotals.bonus > 0 && (
                    <span>
                      Bonus:{' '}
                      <span className="text-black tabular-nums">
                        {formatCurrency(filteredPayoutTotals.bonus)}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {filteredPayouts.length === 0 ? (
                <div className="bg-white border border-black p-10 text-center space-y-2">
                  <p className="text-xs font-bold uppercase text-black/60">
                    No advance or salary payouts recorded for this filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => openPayoutModal()}
                    className="px-3.5 py-2 bg-red-600 text-white text-xs font-bold uppercase"
                  >
                    + Record Advance / Payout
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-black divide-y divide-black/15">
                  {filteredPayouts.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 sm:px-4 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              p.type === 'advance'
                                ? 'bg-red-600 text-white'
                                : p.type === 'salary'
                                ? 'bg-black text-white'
                                : 'border border-black text-black'
                            }`}
                          >
                            {p.type}
                          </span>
                          <span className="font-bold text-black uppercase">{p.staffName}</span>
                          <span className="text-black/60">{formatDisplayDate(p.dateStr)}</span>
                          <span className="px-1.5 py-0.2 border border-black/40 text-[10px] font-bold uppercase text-black/75">
                            {p.paymentMode}
                          </span>
                        </div>
                        {p.note && <div className="text-black/75 mt-0.5">{p.note}</div>}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="font-bold text-sm tabular-nums text-black">
                          {formatCurrency(p.amount)}
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeletingPayout(p)}
                          title="Delete payout record"
                          className="p-1.5 border border-black text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= SUB-TAB 3: MONTHLY SALARY SHEET ================= */}
          {activeSubTab === 'salary' && (
            <div className="space-y-3">
              <div className="bg-white border border-black p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase text-black">
                    Monthly Salary Sheet &mdash; {formatDisplayMonth(selectedMonth)}
                  </h3>
                  <p className="text-[11px] text-black/70 mt-0.5">
                    Daily staff: Worked Days &times; Daily Rate. Monthly staff: Pro-rated across {getDaysInMonth(selectedMonth)} days.
                  </p>
                </div>

                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                  className="bg-white border border-black px-2.5 py-1.5 text-xs font-bold text-black focus:outline-none focus:border-red-600 self-start sm:self-center"
                />
              </div>

              <div className="space-y-2.5">
                {salarySheetRows.map((row) => {
                  const isDue = row.balanceDue > 0;
                  const isOverdrawn = row.balanceDue < 0;
                  return (
                    <div
                      key={row.member.id}
                      className={`bg-white border-2 p-4 space-y-3 ${
                        isDue ? 'border-black' : 'border-black/70'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold uppercase text-black">
                              {row.member.name}
                            </h4>
                            {!row.member.isActive && (
                              <span className="px-1.5 py-0.5 bg-black/15 text-[10px] font-bold uppercase">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-black/70 mt-0.5">
                            Rate:{' '}
                            <strong>
                              {formatCurrency(row.member.salaryAmount)}/
                              {row.member.salaryType === 'daily' ? 'day' : 'month'}
                            </strong>{' '}
                            &bull; Worked: <strong>{row.workedDays} days</strong> (
                            {row.presentDays} Full, {row.halfDays} Half, {row.absentDays} Absent)
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div className="text-left sm:text-right">
                            <div className="text-[10px] font-bold uppercase text-black/65">
                              {isOverdrawn ? 'Advance Excess' : 'Balance Due'}
                            </div>
                            <div
                              className={`text-xl font-bold tabular-nums leading-none mt-0.5 ${
                                isDue
                                  ? 'text-red-600'
                                  : isOverdrawn
                                  ? 'text-black'
                                  : 'text-black/70'
                              }`}
                            >
                              {formatCurrency(Math.abs(row.balanceDue))}
                            </div>
                          </div>

                          {isDue && (
                            <button
                              type="button"
                              onClick={() =>
                                openPayoutModal({
                                  staffId: row.member.id,
                                  type: 'salary',
                                  amount: row.balanceDue,
                                  note: `${formatDisplayMonth(selectedMonth)} salary settlement`,
                                })
                              }
                              className="px-3 py-2 bg-red-600 text-white hover:bg-red-700 border border-red-600 text-xs font-bold uppercase shrink-0"
                            >
                              Pay Balance
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 border border-black divide-y sm:divide-y-0 sm:divide-x divide-black text-xs">
                        <div className="p-2.5">
                          <div className="text-[10px] font-bold uppercase text-black/60">
                            Earned (Attendance)
                          </div>
                          <div className="font-bold text-black tabular-nums mt-0.5">
                            {formatCurrency(row.earned)}
                          </div>
                        </div>
                        <div className="p-2.5">
                          <div className="text-[10px] font-bold uppercase text-black/60">
                            Bonus
                          </div>
                          <div className="font-bold text-black tabular-nums mt-0.5">
                            +{formatCurrency(row.bonusAdded)}
                          </div>
                        </div>
                        <div className="p-2.5">
                          <div className="text-[10px] font-bold uppercase text-red-600">
                            Advance Taken
                          </div>
                          <div className="font-bold text-red-600 tabular-nums mt-0.5">
                            -{formatCurrency(row.advanceTaken)}
                          </div>
                        </div>
                        <div className="p-2.5">
                          <div className="text-[10px] font-bold uppercase text-black/60">
                            Salary Paid
                          </div>
                          <div className="font-bold text-black tabular-nums mt-0.5">
                            -{formatCurrency(row.salaryPaid)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= SUB-TAB 4: STAFF PROFILES ================= */}
          {activeSubTab === 'profiles' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {staffMembers.map((member) => (
                <div
                  key={member.id}
                  className={`bg-white border-2 p-4 flex flex-col justify-between gap-3 ${
                    member.isActive ? 'border-black' : 'border-black/40 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-bold text-black uppercase tracking-tight">
                          {member.name}
                        </h3>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            member.isActive
                              ? 'bg-black text-white'
                              : 'border border-red-600 text-red-600'
                          }`}
                        >
                          {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <a
                        href={`tel:${member.phone}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:underline mt-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{member.phone}</span>
                      </a>

                      <div className="text-[11px] text-black/70 mt-1 space-y-0.5">
                        <div>
                          Salary:{' '}
                          <strong className="text-black">
                            {formatCurrency(member.salaryAmount)} /{' '}
                            {member.salaryType === 'daily' ? 'Day' : 'Month'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-black/15 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          openPayoutModal({ staffId: member.id, type: 'advance' })
                        }
                        className="px-2.5 py-1.5 bg-red-600 text-white hover:bg-red-700 text-xs font-bold uppercase border border-red-600"
                      >
                        + Advance
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStaffActive(member)}
                        className="px-2.5 py-1.5 bg-white text-black hover:bg-black hover:text-white text-xs font-bold uppercase border border-black"
                      >
                        {member.isActive ? 'Set Inactive' : 'Set Active'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditStaffModal(member)}
                        title="Edit profile"
                        className="p-1.5 border border-black text-black hover:bg-black hover:text-white"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingStaff(member)}
                        title="Delete staff"
                        className="p-1.5 border border-black text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ================= ADD / EDIT STAFF PROFILE MODAL ================= */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-md bg-white border-2 border-black shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-black flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase text-black">
                {editingStaff ? `Edit Staff: ${editingStaff.name}` : 'Add Staff Profile'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="w-7 h-7 border border-black flex items-center justify-center text-black hover:bg-black hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffProfile} className="flex-1 flex flex-col min-h-0">
              <div className="p-4 overflow-y-auto touch-scroll space-y-3">
                <div>
                  <label className="text-[11px] font-bold uppercase block mb-1 text-black">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Imran"
                    className="w-full bg-white border border-black px-3 py-2 text-xs text-black focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase block mb-1 text-black">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-white border border-black px-3 py-2 text-xs text-black focus:outline-none focus:border-red-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold uppercase block mb-1 text-black">
                      Salary Type
                    </label>
                    <select
                      value={formSalaryType}
                      onChange={(e) => setFormSalaryType(e.target.value as StaffSalaryType)}
                      className="w-full bg-white border border-black px-2.5 py-2 text-xs font-bold text-black focus:outline-none focus:border-red-600"
                    >
                      <option value="daily">Daily Wage (₹/day)</option>
                      <option value="monthly">Monthly Salary (₹/mo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase block mb-1 text-black">
                      {formSalaryType === 'daily' ? 'Daily Rate (₹) *' : 'Monthly Salary (₹) *'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={formSalaryAmount}
                      onChange={(e) => setFormSalaryAmount(e.target.value)}
                      placeholder={formSalaryType === 'daily' ? '500' : '15000'}
                      className="w-full bg-white border border-black px-3 py-2 text-xs font-bold text-black focus:outline-none focus:border-red-600 tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-black flex items-center justify-end gap-2 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 border border-black bg-white text-black text-xs font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-red-600 bg-red-600 text-white hover:bg-red-700 text-xs font-bold uppercase"
                >
                  {editingStaff ? 'Update Profile' : 'Save Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ADVANCE / SALARY PAYOUT MODAL ================= */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-sm bg-white border-2 border-black shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-black flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase text-black">
                Record Advance / Payout
              </h3>
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="w-7 h-7 border border-black flex items-center justify-center text-black hover:bg-black hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayout} className="p-4 space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase block mb-1 text-black">
                  Staff Member *
                </label>
                <select
                  required
                  value={payoutStaffId}
                  onChange={(e) => setPayoutStaffId(e.target.value)}
                  className="w-full bg-white border border-black px-2.5 py-2 text-xs font-bold text-black focus:outline-none focus:border-red-600"
                >
                  {staffMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {(['advance', 'salary', 'bonus'] as StaffPayoutType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPayoutType(t)}
                    className={`py-2 text-xs font-bold uppercase border ${
                      payoutType === t
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-black border-black'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase block mb-1 text-black">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="500"
                    className="w-full bg-white border border-black px-3 py-2 text-sm font-bold text-black focus:outline-none focus:border-red-600 tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase block mb-1 text-black">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={payoutDate}
                    onChange={(e) => setPayoutDate(e.target.value)}
                    className="w-full bg-white border border-black px-2.5 py-2 text-xs text-black focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase block mb-1 text-black">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMode('cash')}
                    className={`py-1.5 text-xs font-bold uppercase border ${
                      payoutMode === 'cash'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-black border-black'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMode('upi')}
                    className={`py-1.5 text-xs font-bold uppercase border ${
                      payoutMode === 'upi'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-black border-black'
                    }`}
                  >
                    UPI / GPay
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase block mb-1 text-black">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={payoutNote}
                  onChange={(e) => setPayoutNote(e.target.value)}
                  placeholder="e.g. Fuel advance, weekly payout"
                  className="w-full bg-white border border-black px-3 py-2 text-xs text-black focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 border border-black bg-white text-black text-xs font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-red-600 bg-red-600 text-white hover:bg-red-700 text-xs font-bold uppercase"
                >
                  Save Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE STAFF CONFIRMATION ================= */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-xs sm:max-w-sm bg-white border-2 border-black p-4 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold uppercase text-black">
              Remove Staff Member?
            </h3>
            <p className="text-xs text-black/80">
              Remove <strong>{deletingStaff.name}</strong> ({deletingStaff.phone}) from Staff Profiles? Past payout records remain saved in the ledger.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-3.5 py-2 border border-black bg-white text-black text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStaff}
                className="px-3.5 py-2 border border-red-600 bg-red-600 text-white hover:bg-red-700 text-xs font-bold uppercase"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE PAYOUT CONFIRMATION ================= */}
      {deletingPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-xs sm:max-w-sm bg-white border-2 border-black p-4 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold uppercase text-black">
              Delete Payout Record?
            </h3>
            <p className="text-xs text-black/80">
              Delete {deletingPayout.type} of{' '}
              <strong>{formatCurrency(deletingPayout.amount)}</strong> for{' '}
              <strong>{deletingPayout.staffName}</strong> on{' '}
              {formatDisplayDate(deletingPayout.dateStr)}?
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingPayout(null)}
                className="px-3.5 py-2 border border-black bg-white text-black text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePayout}
                className="px-3.5 py-2 border border-red-600 bg-red-600 text-white hover:bg-red-700 text-xs font-bold uppercase"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
