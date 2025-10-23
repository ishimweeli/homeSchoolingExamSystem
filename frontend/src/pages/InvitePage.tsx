import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'sonner';

interface Invite {
  id: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'PARENT' | 'STUDENT';
  status: 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
  expiresAt?: string;
  inviter?: {
    name: string;
    email: string;
  };
}

const InviteMembers = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'TEACHER' | 'PARENT'>('PARENT');
  const [loading, setLoading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<Invite | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  // Get current user's role from token or context
const [activeOrg, setActiveOrg] = useState<{ id: string; name: string; role: string } | null>(null);

useEffect(() => {
  const org = localStorage.getItem('activeOrg');
  if (org) {
    setActiveOrg(JSON.parse(org));
  }
}, []);


  // Role options based on user's role
  const getRoleOptions = () => {
  const allRoles = [
    { value: 'ADMIN', label: 'Admin', description: 'Can manage teachers, students, and view all data' },
    { value: 'TEACHER', label: 'Teacher', description: 'Can create classes, exams, and invite parents' },
    { value: 'PARENT', label: 'Parent', description: 'Can view their children\'s progress' },
  ];

  if (!activeOrg) return [];

  switch (activeOrg.role) {
    case 'TEACHER':
      return allRoles.filter(r => r.value === 'PARENT');
    case 'ADMIN':
      return allRoles.filter(r => ['TEACHER', 'PARENT'].includes(r.value));
    case 'OWNER':
      return allRoles; // Owners can invite anyone
    default:
      return [];
  }
};


  const availableRoles = getRoleOptions();

  // Update default role when availableRoles changes
  useEffect(() => {
    if (availableRoles.length > 0 && !availableRoles.find(r => r.value === role)) {
      setRole(availableRoles[0].value as any);
    }
  }, [availableRoles, role]);

  const getStatusColor = (status: Invite['status']) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'EXPIRED': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800';
      case 'TEACHER': return 'bg-blue-100 text-blue-800';
      case 'PARENT': return 'bg-green-100 text-green-800';
      case 'STUDENT': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const loadInvites = async () => {
    try {
      const data = await api.getSentInvites();
      setInvites(data);
    } catch (error) {
      console.error('Failed to load invites:', error);
      toast.error('Failed to load invites');
    }
  };

  useEffect(() => { 
    loadInvites(); 
  }, []);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.sendInvite({ email, role });
      setEmail('');
      // Keep the role selection as is
      await loadInvites();
      toast.success(`Invite sent to ${email} as ${role}!`);
    } catch (error: any) {
      console.error('Failed to send invite:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send invite';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const cancelInvite = async () => {
    if (!confirmCancel) return;

    try {
      await toast.promise(
        api.cancelInvite(confirmCancel.id).then(() => loadInvites()),
        {
          loading: 'Cancelling invite...',
          success: 'Invite cancelled successfully!',
          error: 'Failed to cancel invite',
        }
      );
    } catch (error) {
      console.error('Failed to cancel invite:', error);
    } finally {
      setConfirmCancel(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <Link to="/" className="text-blue-600 font-semibold hover:underline">
            ← Back to home
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-2">Invite Members</h1>
        <p className="text-gray-600 mb-6">
          Invite teachers, or parents to join your organization
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Invite Form */}
          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-xl font-semibold mb-4">Send Invitation</h2>
            <form onSubmit={sendInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  required
                  disabled={availableRoles.length === 0}
                >
                  {availableRoles.map((roleOption) => (
                    <option key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </option>
                  ))}
                </select>
                {availableRoles.length > 0 ? (
                  <p className="text-xs text-gray-500 mt-1">
                    {availableRoles.find(r => r.value === role)?.description}
                  </p>
                ) : (
                  <p className="text-xs text-red-500 mt-1">
                    You don't have permission to invite any roles.
                  </p>
                )}
              </div>

              <button
                disabled={loading || availableRoles.length === 0}
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending…' : 'Send Invite'}
              </button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                {userRole === 'TEACHER' && (
                  <span className="block mt-1">
                    As a teacher, you can only invite parents to monitor their children's progress.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Sent Invites List */}
          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-xl font-semibold mb-4">Sent Invitations</h2>
            <div className="max-h-[600px] overflow-y-auto">
              <ul className="divide-y">
                {invites.length > 0 ? (
                  invites.map((invite) => (
                    <li key={invite.id} className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{invite.email}</div>
                          <div className="flex gap-2 mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(invite.role)}`}>
                              {invite.role}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(invite.status)}`}>
                              {invite.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Sent: {new Date(invite.createdAt).toLocaleDateString()}
                            {invite.expiresAt && invite.status === 'PENDING' && (
                              <span className="ml-2">
                                • Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {invite.status === 'PENDING' && (
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => setConfirmCancel(invite)}
                              className="text-red-600 hover:underline text-sm font-medium"
                              title="Cancel invitation"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="py-8 text-center text-gray-500">
                    No invitations sent yet.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-2">Cancel Invitation?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel the invitation for{' '}
              <strong>{confirmCancel.email}</strong> ({confirmCancel.role})?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmCancel(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Keep Invite
              </button>
              <button
                onClick={cancelInvite}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                Cancel Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InviteMembers;