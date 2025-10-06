import { useState, useEffect } from 'react';
import { Crown, Shield, Zap, Users, Plus, Check, DollarSign, Package, User } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

interface Tier {
  id: string;
  name: string;
  description?: string;
  maxExams: number;
  maxStudyModules: number;
  maxStudents: number;
  totalAttemptsPool: number;  // Total attempts teacher can distribute
  price: number;
  currency: string;
  validityDays: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface UserTier {
  id: string;
  userId: string;
  tierId: string;
  tier: Tier;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  examsCreated: number;
  studyModulesCreated: number;
  studentsCreated: number;
  attemptsUsed: number;  // Track attempts used from pool
  assignedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminTiers() {
  const { user } = useAuthStore();
  const isAdmin = (user?.role || '').toUpperCase() === 'ADMIN';
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [userTiers, setUserTiers] = useState<UserTier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateTierModal, setShowCreateTierModal] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'tiers' | 'subscriptions'>('tiers');
  const [loading, setLoading] = useState(false);
  const [stats] = useState<any>(null);
  
  // New tier form state
  const [newTier, setNewTier] = useState<Partial<Tier>>({
    name: '',
    description: '',
    maxExams: 10,
    maxStudyModules: 10,
    maxStudents: 50,
    totalAttemptsPool: 100,  // Default 100 attempts
    price: 0,
    currency: 'USD',
    validityDays: 30,
    isActive: true
  });

  useEffect(() => {
    fetchTiers();
    if (isAdmin) {
      fetchUserTiers();
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      const response: any = await api.get('/tiers');
      if (response?.success && Array.isArray(response.data)) {
        setTiers(response.data || []);
      } else if (response?.data?.success) {
        setTiers(response.data.data || []);
      } else if (Array.isArray(response)) {
        setTiers(response as any);
      }
    } catch (error) {
      console.error('Error fetching tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTiers = async () => {
    if (!isAdmin) return;
    try {
      // Use the active backend route
      const response: any = await api.get('/tiers/users/all');
      if (Array.isArray(response?.data)) {
        setUserTiers(response.data);
      } else if (response?.data?.success) {
        setUserTiers(response.data.data || []);
      } else if (Array.isArray(response)) {
        setUserTiers(response as any);
      }
    } catch (error) {
      console.error('Error fetching user tiers:', error);
    }
  };

  const fetchUsers = async () => {
    if (!isAdmin) return;
    try {
      const response: any = await api.get('/admin/users', userSearch ? { q: userSearch } : undefined);
      if (response?.success && Array.isArray(response.data)) {
        setUsers(response.data);
      } else if (response?.data?.success) {
        setUsers(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const createTier = async () => {
    if (!newTier.name) {
      toast.error('Please provide a tier name');
      return;
    }

    try {
      setLoading(true);
      const response: any = await api.post('/tiers', newTier);

      const success = response?.success ?? response?.data?.success;
      if (success) {
        toast.success('Tier created successfully!');
        setShowCreateTierModal(false);
        // Reset form
        setNewTier({
          name: '',
          description: '',
          maxExams: 10,
          maxStudyModules: 10,
          maxStudents: 50,
          totalAttemptsPool: 100,
          price: 0,
          currency: 'USD',
          validityDays: 30,
          isActive: true
        });
        fetchTiers();
      } else {
        toast.error(response?.error || response?.message || 'Failed to create tier');
      }
    } catch (error: any) {
      console.error('Error creating tier:', error);
      toast.error(error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create tier');
    } finally {
      setLoading(false);
    }
  };

  const assignTierToUser = async () => {
    if (!selectedUser || !selectedTier) {
      toast.error('Please select both user and tier');
      return;
    }

    try {
      setLoading(true);
      const response: any = await api.post('/tiers/assign', {
        userId: selectedUser,
        tierId: selectedTier
      });

      // api.post returns response.data, so response is the payload
      const success = response?.success ?? response?.data?.success;
      const errorMsg = response?.error || response?.message || response?.data?.error;

      if (success) {
        toast.success('Tier assigned successfully');
        setShowAssignModal(false);
        setSelectedUser('');
        setSelectedTier('');
        fetchUserTiers();
      } else {
        toast.error(errorMsg || 'Failed to assign tier');
      }
    } catch (error: any) {
      console.error('Error assigning tier:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to assign tier');
    } finally {
      setLoading(false);
    }
  };

  const getTierIcon = (tierName: string) => {
    switch(tierName.toLowerCase()) {
      case 'free': return <Zap className="w-5 h-5" />;
      case 'basic': return <Package className="w-5 h-5" />;
      case 'pro': return <Shield className="w-5 h-5" />;
      case 'enterprise': return <Crown className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const getTierGradient = (tierName: string) => {
    switch(tierName.toLowerCase()) {
      case 'free': return 'from-gray-400 to-gray-600';
      case 'basic': return 'from-blue-400 to-blue-600';
      case 'pro': return 'from-purple-400 to-purple-600';
      case 'enterprise': return 'from-yellow-400 to-amber-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Tiers</h1>
            <p className="text-gray-600">Manage subscription tiers and user assignments</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateTierModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2 font-medium shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Create New Tier
            </button>
            <div className="relative">
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers(); }}
                placeholder="Search users by email or name..."
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 w-72"
              />
            </div>
            <button
              onClick={() => fetchUsers()}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Search
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Assign Tier to User
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.revenue || 0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Free Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.byTier?.Free || 0}</p>
              </div>
              <Zap className="w-8 h-8 text-gray-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paid Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(stats.totalUsers || 0) - (stats.byTier?.Free || 0)}
                </p>
              </div>
              <Crown className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('tiers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tiers'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Available Tiers
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'subscriptions'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            User Subscriptions
          </button>
        </nav>
      </div>

      {/* Tiers Grid */}
      {activeTab === 'tiers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <div key={tier.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${getTierGradient(tier.name)}`} />
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getTierIcon(tier.name)}
                    <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                  </div>
                  {tier.isActive && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Active
                    </span>
                  )}
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">
                      {formatCurrency(tier.price)}
                    </span>
                    {tier.validityDays > 0 && (
                      <span className="text-gray-500">/{tier.validityDays} days</span>
                    )}
                  </div>
                  {tier.validityDays === 0 && (
                    <span className="text-sm text-gray-500">Forever free</span>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-700">
                      {tier.maxExams === 999999 ? 'Unlimited' : tier.maxExams} exams
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-700">
                      {tier.maxStudyModules === 999999 ? 'Unlimited' : tier.maxStudyModules} study modules
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-700">
                      {tier.maxStudents === 999999 ? 'Unlimited' : tier.maxStudents} students
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-lg border border-purple-200">
                    <Check className="w-4 h-4 text-purple-600 font-bold" />
                    <span className="text-sm font-bold text-purple-900">
                      🎯 {tier.totalAttemptsPool === 999999 ? 'Unlimited' : tier.totalAttemptsPool} total attempts
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-500">{tier.description || 'No description'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Subscriptions Table */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userTiers.map((userTier) => (
                <tr key={userTier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {userTier.user?.name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {userTier.user?.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getTierGradient(userTier.tier.name)} text-white`}>
                      {getTierIcon(userTier.tier.name)}
                      {userTier.tier.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>Exams: {userTier.examsCreated}/{userTier.tier.maxExams}</div>
                      <div>Modules: {userTier.studyModulesCreated}/{userTier.tier.maxStudyModules}</div>
                      <div>Students: {userTier.studentsCreated}/{userTier.tier.maxStudents}</div>
                      <div className="font-bold text-purple-900 bg-purple-50 px-2 py-1 rounded mt-1">
                        🎯 Attempts: {userTier.attemptsUsed || 0}/{userTier.tier.totalAttemptsPool}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>Exams: {Math.max(0, userTier.tier.maxExams - userTier.examsCreated)}</div>
                    <div>Modules: {Math.max(0, userTier.tier.maxStudyModules - userTier.studyModulesCreated)}</div>
                    <div>Students: {Math.max(0, userTier.tier.maxStudents - userTier.studentsCreated)}</div>
                    <div className="font-bold text-purple-900 bg-purple-50 px-2 py-1 rounded mt-1">
                      🎯 {Math.max(0, userTier.tier.totalAttemptsPool - (userTier.attemptsUsed || 0))} attempts left
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {userTier.isActive ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Expired
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {userTier.expiresAt ?
                      new Date(userTier.expiresAt).toLocaleDateString() :
                      'Never'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedUser(userTier.userId);
                        setShowAssignModal(true);
                      }}
                      className="text-purple-600 hover:text-purple-900 mr-3"
                    >
                      Change Tier
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm('Deactivate this user?')) return;
                        try {
                          const res: any = await api.delete(`/admin/users/${userTier.userId}`);
                          if (res?.success || res?.data?.success) {
                            toast.success('User deactivated');
                            fetchUsers();
                            fetchUserTiers();
                          } else {
                            toast.error(res?.error || 'Failed to deactivate user');
                          }
                        } catch (e: any) {
                          toast.error(e?.response?.data?.error || 'Failed to deactivate user');
                        }
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      Deactivate User
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {userTiers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No user subscriptions yet</p>
            </div>
          )}
        </div>
      )}

      {/* Assign Tier Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Assign Tier to User</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Choose a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Tier
                </label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Choose a tier...</option>
                  {tiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name} - {formatCurrency(tier.price)}
                      {tier.validityDays > 0 ? `/${tier.validityDays} days` : ' (Forever)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={assignTierToUser}
                disabled={loading || !selectedUser || !selectedTier}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Assigning...' : 'Assign Tier'}
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedUser('');
                  setSelectedTier('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Tier Modal */}
      {showCreateTierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Tier</h2>

            <div className="space-y-6">
              {/* Tier Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tier Name *
                </label>
                <input
                  type="text"
                  value={newTier.name || ''}
                  onChange={(e) => setNewTier({...newTier, name: e.target.value})}
                  placeholder="e.g., Free, Basic, Pro, Enterprise"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newTier.description || ''}
                  onChange={(e) => setNewTier({...newTier, description: e.target.value})}
                  placeholder="Brief description of this tier"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Limits Grid */}
              <div className="grid grid-cols-3 gap-4">
                {/* Max Exams */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Exams *
                  </label>
                  <input
                    type="number"
                    value={newTier.maxExams || 0}
                    onChange={(e) => setNewTier({...newTier, maxExams: parseInt(e.target.value) || 0})}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = unlimited</p>
                </div>

                {/* Max Study Modules */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Study Modules *
                  </label>
                  <input
                    type="number"
                    value={newTier.maxStudyModules || 0}
                    onChange={(e) => setNewTier({...newTier, maxStudyModules: parseInt(e.target.value) || 0})}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = unlimited</p>
                </div>

                {/* Max Students */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Students *
                  </label>
                  <input
                    type="number"
                    value={newTier.maxStudents || 0}
                    onChange={(e) => setNewTier({...newTier, maxStudents: parseInt(e.target.value) || 0})}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = unlimited</p>
                </div>
              </div>

              {/* Total Attempts Pool - MOST IMPORTANT */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <label className="block text-sm font-bold text-purple-900 mb-2">
                  Total Attempts Pool * 🎯
                </label>
                <input
                  type="number"
                  value={newTier.totalAttemptsPool || 0}
                  onChange={(e) => setNewTier({...newTier, totalAttemptsPool: parseInt(e.target.value) || 0})}
                  min="0"
                  className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-semibold text-lg"
                  placeholder="e.g., 100"
                />
                <p className="text-sm text-purple-700 mt-2 font-medium">
                  Total attempts teacher can distribute to students across ALL exams and modules. 
                  <br/>
                  <span className="text-xs">Example: Assign 2 attempts to 5 students = 10 attempts used from pool</span>
                </p>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price *
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={newTier.currency || 'USD'}
                      onChange={(e) => setNewTier({...newTier, currency: e.target.value})}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="USD">USD $</option>
                      <option value="RWF">RWF</option>
                      <option value="EUR">EUR €</option>
                      <option value="GBP">GBP £</option>
                    </select>
                    <input
                      type="number"
                      value={newTier.price || 0}
                      onChange={(e) => setNewTier({...newTier, price: parseFloat(e.target.value) || 0})}
                      min="0"
                      step="0.01"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">0 = free tier</p>
                </div>

                {/* Validity Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Validity (Days) *
                  </label>
                  <input
                    type="number"
                    value={newTier.validityDays || 30}
                    onChange={(e) => setNewTier({...newTier, validityDays: parseInt(e.target.value) || 30})}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">How long tier lasts</p>
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={newTier.isActive || false}
                  onChange={(e) => setNewTier({...newTier, isActive: e.target.checked})}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  Active (users can be assigned to this tier)
                </label>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={createTier}
                disabled={loading || !newTier.name}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Creating...' : 'Create Tier'}
              </button>
              <button
                onClick={() => {
                  setShowCreateTierModal(false);
                  setNewTier({
                    name: '',
                    description: '',
                    maxExams: 10,
                    maxStudyModules: 10,
                    maxStudents: 50,
                    price: 0,
                    currency: 'USD',
                    validityDays: 30,
                    isActive: true
                  });
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}