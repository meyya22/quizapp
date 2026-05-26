import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Pencil, Trash2, Crown, Users, UserCheck, ShieldCheck, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import api from '../../services/api';
import { UserRecord, Role, Tier } from '../../types';

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterRole, setFilterRole] = useState('');
  const [filterTier, setFilterTier] = useState('');

  const { data: users = [], isLoading } = useQuery<UserRecord[]>({
    queryKey: ['all-users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditForm>();

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

  function openEdit(user: UserRecord) {
    setEditingUser(user);
    reset({ name: user.name, role: user.role, tier: user.tier });
  }

  function handleDelete(user: UserRecord) {
    if (confirm(`Delete user "${user.name}" (${user.email})? This cannot be undone.`)) {
      deleteMutation.mutate(user.id);
    }
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
          <div className="flex items-end gap-0.5 h-28 overflow-hidden">
            {dailySignups.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                <div
                  className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                  style={{ height: `${(d.admin / maxAdmin) * 100}%`, minHeight: d.admin > 0 ? '3px' : '0' }}
                />
                {d.admin > 0 && (
                  <span className="absolute -top-5 text-xs font-bold text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1 rounded shadow-sm">
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
          <div className="flex items-end gap-0.5 h-28 overflow-hidden">
            {dailySignups.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                <div
                  className="w-full bg-violet-500 rounded-t transition-all duration-300 hover:bg-violet-600"
                  style={{ height: `${(d.participant / maxParticipant) * 100}%`, minHeight: d.participant > 0 ? '3px' : '0' }}
                />
                {d.participant > 0 && (
                  <span className="absolute -top-5 text-xs font-bold text-violet-700 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1 rounded shadow-sm">
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
          <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">User</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Role</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Tier</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Quizzes</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Attempts</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Location</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">{roleBadge(user.role)}</td>
                  <td className="px-4 py-3">{tierBadge(user.tier)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {user.role === 'PARTICIPANT' ? (
                      <span className="flex items-center gap-1.5">
                        {user.aiQuizCount}
                        {user.aiQuizCount > 0 && (
                          <span className="text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full leading-none">XamGeni</span>
                        )}
                      </span>
                    ) : (
                      user.quizCount
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{user._count.attempts}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {user.city || user.country ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {[user.city, user.country].filter(Boolean).join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(user.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap w-px">
                    <div className="flex items-center justify-end gap-1">
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
          </div>

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

      <Modal
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Edit User — ${editingUser?.name}`}
      >
        <form
          onSubmit={handleSubmit((data) => updateMutation.mutate({ id: editingUser!.id, data }))}
          className="space-y-4"
        >
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
