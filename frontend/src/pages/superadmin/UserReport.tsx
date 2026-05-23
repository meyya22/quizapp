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

export default function UserReport() {
  const qc = useQueryClient();
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">User</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Role</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Tier</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Quizzes</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Attempts</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Location</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </td>
                  <td className="px-5 py-4">{roleBadge(user.role)}</td>
                  <td className="px-5 py-4">{tierBadge(user.tier)}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{user.quizCount}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{user._count.attempts}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {user.city || user.country ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {[user.city, user.country].filter(Boolean).join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit user"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {user.role !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
