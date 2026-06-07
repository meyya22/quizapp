import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Pencil, Trash2, Crown, Users, UserCheck, ShieldCheck, MapPin, RefreshCw, KeyRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import api from '../../services/api';
import { UserRecord, Role, Tier } from '../../types';

interface ExamCategory { id: string; name: string; }
interface ExamContentTree { id: string; name: string; }
interface GrantTarget { userId: string; userName: string; purchasedIds: string[]; }

interface EditForm {
  name: string;
  role: Role;
  tier: Tier;
}

const ROLE_OPTIONS = [
  { value: 'PARTICIPANT', label: 'Participant' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

const TIER_OPTIONS = [
  { value: 'FREE', label: 'Free' },
  { value: 'PAID', label: 'Paid' },
];

function roleBadge(role: Role) {
  if (role === 'SUPER_ADMIN') return <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full"><ShieldCheck className="w-3 h-3" /> Super Admin</span>;
  if (role === 'ADMIN') return <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full"><UserCheck className="w-3 h-3" /> Admin</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full"><Users className="w-3 h-3" /> Participant</span>;
}

function tierBadge(tier: Tier) {
  if (tier === 'PAID') return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"><Crown className="w-3 h-3" /> Paid</span>;
  return <Badge variant="neutral">Free</Badge>;
}

const PAGE_SIZE_OPTIONS = [10, 30, 50];

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'PARTICIPANT', label: 'Participant' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

const TIER_FILTER_OPTIONS = [
  { value: '', label: 'All Tiers' },
  { value: 'FREE', label: 'Free' },
  { value: 'PAID', label: 'Paid' },
];

export default function UserReport() {
  const qc = useQueryClient();
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [grantTarget, setGrantTarget] = useState<GrantTarget | null>(null);
  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterRole, setFilterRole] = useState('');
  const [filterTier, setFilterTier] = useState('');

  const { data: users = [], isLoading } = useQuery<UserRecord[]>({
    queryKey: ['all-users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditForm>();

  const { data: examCategories = [] } = useQuery<ExamCategory[]>({
    queryKey: ['exam-categories-flat'],
    queryFn: () => api.get('/exam-content').then((r) => (r.data as ExamContentTree[]).map((c: any) => ({ id: c.id, name: c.name }))),
    staleTime: 300_000,
  });

  const grantMutation = useMutation({
    mutationFn: ({ userId, categories }: { userId: string; categories: ExamCategory[] }) =>
      api.post(`/users/${userId}/grant-categories`, { categories }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Categories granted');
      setGrantTarget(null);
    },
    onError: () => toast.error('Failed to grant categories'),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ userId, categoryId }: { userId: string; categoryId: string }) =>
      api.post(`/users/${userId}/revoke-category`, { categoryId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Category revoked');
    },
    onError: () => toast.error('Failed to revoke category'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditForm }) => api.put(`/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('User updated');
      setEditingUser(null);
    },
    onError: () => toast.error('Failed to update user'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('User deleted');
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const resetAiMutation = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/reset-ai-usage`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('AI usage reset');
    },
    onError: () => toast.error('Failed to reset AI usage'),
  });

  function openEdit(user: UserRecord) {
    setEditingUser(user);
    reset({ name: user.name, role: user.role, tier: user.tier });
  }

  function handleDelete(user: UserRecord) {
    if (confirm(`Delete user "${user.name}" (${user.email})? This cannot be undone.`)) {
      deleteMutation.mutate(user.id);
    }
  }

  function openGrant(user: UserRecord) {
    const purchasedIds = (user.grantedCategories ?? []).map((c) => c.id);
    setGrantTarget({ userId: user.id, userName: user.name, purchasedIds });
    setSelectedCatIds(new Set());
  }

  const total = users.length;
  const admins = users.filter((u) => u.role === 'ADMIN').length;
  const participants = users.filter((u) => u.role === 'PARTICIPANT').length;
  const paid = users.filter((u) => u.tier === 'PAID').length;

  // Build last-30-days daily signup data
  const dailySignups = (() => {
    const days: { date: string; label: string; admin: number; participant: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push({ date: key, label, admin: 0, participant: 0 });
    }
    users.forEach((u) => {
      const key = u.createdAt.slice(0, 10);
      const day = days.find((d) => d.date === key);
      if (!day) return;
      if (u.role === 'ADMIN') day.admin++;
      else if (u.role === 'PARTICIPANT') day.participant++;
    });
    return days;
  })();

  const maxAdmin = Math.max(1, ...dailySignups.map((d) => d.admin));
  const maxParticipant = Math.max(1, ...dailySignups.map((d) => d.participant));

  const filtered = users.filter((u) => {
    if (filterRole && u.role !== filterRole) return false;
    if (filterTier && u.tier !== filterTier) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedUsers = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handlePageSize(size: number) {
    setPageSize(size);
    setPage(1);
  }

  function handleFilterRole(val: string) {
    setFilterRole(val);
    setPage(1);
  }

  function handleFilterTier(val: string) {
    setFilterTier(val);
    setPage(1);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">User Report</h1>
        <p className="text-slate-500 text-sm mt-1">Manage all users across the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users', value: total, color: 'text-slate-900' },
          { label: 'Admins', value: admins, color: 'text-blue-700' },
          { label: 'Participants', value: participants, color: 'text-slate-700' },
          { label: 'Paid Accounts', value: paid, color: 'text-amber-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Daily signup charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Admin signups */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Admin Signups</p>
              <p className="text-xs text-slate-400 mt-0.5">Daily registrations — last 30 days</p>
            </div>
            <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              {dailySignups.reduce((s, d) => s + d.admin, 0)} total
            </span>
          </div>
          <div className="flex items-end gap-0.5" style={{ height: 96 }}>
            {dailySignups.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col justify-end group relative" style={{ height: 96 }}>
                <div
                  className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                  style={{ height: d.admin > 0 ? Math.max(3, Math.round((d.admin / maxAdmin) * 96)) : 0 }}
                />
                {d.admin > 0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1 rounded shadow-sm whitespace-nowrap z-10">
                    {d.admin}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-slate-400">
            <span>{dailySignups[0].label}</span>
            <span>{dailySignups[14].label}</span>
            <span>{dailySignups[29].label}</span>
          </div>
        </div>

        {/* Participant signups */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Participant Signups</p>
              <p className="text-xs text-slate-400 mt-0.5">Daily registrations — last 30 days</p>
            </div>
            <span className="text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
              {dailySignups.reduce((s, d) => s + d.participant, 0)} total
            </span>
          </div>
          <div className="flex items-end gap-0.5" style={{ height: 96 }}>
            {dailySignups.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col justify-end group relative" style={{ height: 96 }}>
                <div
                  className="w-full bg-violet-500 rounded-t transition-all duration-300 hover:bg-violet-600"
                  style={{ height: d.participant > 0 ? Math.max(3, Math.round((d.participant / maxParticipant) * 96)) : 0 }}
                />
                {d.participant > 0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-violet-700 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1 rounded shadow-sm whitespace-nowrap z-10">
                    {d.participant}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-slate-400">
            <span>{dailySignups[0].label}</span>
            <span>{dailySignups[14].label}</span>
            <span>{dailySignups[29].label}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Role</label>
          <div className="flex gap-1">
            {ROLE_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFilterRole(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filterRole === opt.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="w-px h-5 bg-slate-200" />
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tier</label>
          <div className="flex gap-1">
            {TIER_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFilterTier(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filterTier === opt.value
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {(filterRole || filterTier) && (
          <span className="text-xs text-slate-400 ml-1">
            {filtered.length} of {total} users
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-3 py-2">User</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-3 py-2">Role</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-3 py-2">Tier</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-3 py-2">Attempts</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-3 py-2">Purchases</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-3 py-2">Location</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-3 py-2">Joined</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2">
                    <p className="text-sm font-medium text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </td>
                  <td className="px-3 py-2">{roleBadge(user.role)}</td>
                  <td className="px-3 py-2">{tierBadge(user.tier)}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{user._count.attempts}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {user.role === 'PARTICIPANT' ? (
                      user.purchaseCount > 0 ? (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {user.purchaseCount}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {user.city || user.country ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {[user.city, user.country].filter(Boolean).join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(user.createdAt).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap w-px">
                    <div className="flex items-center justify-end gap-1">
                      {user.role === 'ADMIN' && user.aiGenerationsUsed > 0 && (
                        <button
                          onClick={() => {
                            if (confirm(`Reset AI generation usage for ${user.name} to 0?`))
                              resetAiMutation.mutate(user.id);
                          }}
                          disabled={resetAiMutation.isPending}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-50"
                          title="Reset AI generation usage"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {user.role === 'PARTICIPANT' && (
                        <button
                          onClick={() => openGrant(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Grant/Revoke category access"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit user"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {user.role !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Rows per page:</span>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handlePageSize(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    pageSize === s
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span>
                {filtered.length === 0 ? '0' : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)}`} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <span className="px-2 text-xs font-medium">{safePage} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grant / Revoke Category Access Modal */}
      <Modal
        open={!!grantTarget}
        onClose={() => setGrantTarget(null)}
        title={`Category Access — ${grantTarget?.userName}`}
      >
        <div className="space-y-4">
          {/* Already granted */}
          {(grantTarget?.purchasedIds?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Currently Unlocked</p>
              <div className="flex flex-wrap gap-2">
                {examCategories
                  .filter((c) => grantTarget!.purchasedIds.includes(c.id))
                  .map((c) => (
                    <span key={c.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700">
                      {c.name}
                      <button
                        onClick={() => {
                          if (confirm(`Revoke "${c.name}" access for ${grantTarget!.userName}?`)) {
                            revokeMutation.mutate({ userId: grantTarget!.userId, categoryId: c.id });
                            setGrantTarget((prev) => prev ? { ...prev, purchasedIds: prev.purchasedIds.filter((id) => id !== c.id) } : null);
                          }
                        }}
                        className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-emerald-200 transition-colors"
                        title={`Revoke ${c.name}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Grant new categories */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Grant New Categories</p>
            <div className="max-h-60 overflow-y-auto space-y-1 border border-slate-100 rounded-lg p-2">
              {examCategories
                .filter((c) => !(grantTarget?.purchasedIds ?? []).includes(c.id))
                .map((c) => (
                  <label key={c.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-emerald-600"
                      checked={selectedCatIds.has(c.id)}
                      onChange={(e) => {
                        setSelectedCatIds((prev) => {
                          const next = new Set(prev);
                          e.target.checked ? next.add(c.id) : next.delete(c.id);
                          return next;
                        });
                      }}
                    />
                    <span className="text-sm text-slate-700">{c.name}</span>
                  </label>
                ))}
              {examCategories.filter((c) => !(grantTarget?.purchasedIds ?? []).includes(c.id)).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-3">All categories already unlocked</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setGrantTarget(null)}>Cancel</Button>
            <Button
              type="button"
              loading={grantMutation.isPending}
              disabled={selectedCatIds.size === 0}
              onClick={() => {
                const cats = examCategories.filter((c) => selectedCatIds.has(c.id));
                grantMutation.mutate({ userId: grantTarget!.userId, categories: cats });
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Grant {selectedCatIds.size > 0 ? `${selectedCatIds.size} ` : ''}Categor{selectedCatIds.size === 1 ? 'y' : 'ies'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Edit User — ${editingUser?.name}`}
      >
        <form
          onSubmit={handleSubmit((data) => updateMutation.mutate({ id: editingUser!.id, data }))}
          className="space-y-4"
        >
          {/* Read-only info */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 divide-y divide-slate-200">
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs font-medium text-slate-500">Auth method</span>
              {editingUser?.googleId ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google SSO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 border border-slate-300 text-slate-600">
                  Email &amp; Password
                </span>
              )}
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs font-medium text-slate-500">Complimentary quiz</span>
              {editingUser?.complimentaryQuizId ? (
                <span className="font-mono text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md max-w-[180px] truncate" title={editingUser.complimentaryQuizId}>
                  {editingUser.complimentaryQuizId}
                </span>
              ) : (
                <span className="text-xs text-slate-400">None</span>
              )}
            </div>
          </div>

          <Input
            label="Name"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            {...register('role')}
          />
          <Select
            label="Tier"
            options={TIER_OPTIONS}
            {...register('tier')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
