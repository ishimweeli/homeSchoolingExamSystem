import { useState, useEffect } from 'react';
import { Check, Crown, Shield, Zap, Package, Sparkles, ArrowRight } from 'lucide-react';
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
  totalAttemptsPool: number;
  price: number;
  currency: string;
  validityDays: number;
  isActive: boolean;
}

interface MyTier {
  id: string;
  tierId: string;
  tier: Tier;
  examsCreated: number;
  studyModulesCreated: number;
  studentsCreated: number;
  attemptsUsed: number;
  assignedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export default function Subscription() {
  const { user } = useAuthStore();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [myTier, setMyTier] = useState<MyTier | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTiers();
    fetchMyTier();
    
    // Check for payment callback
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('status');
    const txRef = urlParams.get('tx_ref');
    const transactionId = urlParams.get('transaction_id');
    
    if (paymentStatus && txRef) {
      verifyPaymentCallback(transactionId, txRef);
    }
  }, []);

  const verifyPaymentCallback = async (transactionId: string | null, txRef: string) => {
    try {
      toast.loading('Verifying payment...');
      
      const params = new URLSearchParams();
      if (transactionId) params.append('transaction_id', transactionId);
      if (txRef) params.append('tx_ref', txRef);
      
      const response: any = await api.get(`/payments/verify?${params.toString()}`);
      
      if (response?.success) {
        toast.success('Payment successful! Your subscription has been activated.');
        // Refresh tier data
        fetchMyTier();
        // Clean up URL
        window.history.replaceState({}, document.title, '/subscription');
      } else {
        toast.error('Payment verification failed. Please contact support.');
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      toast.error(error.response?.data?.message || 'Payment verification failed');
    }
  };

  const fetchTiers = async () => {
    try {
      const response: any = await api.get('/tiers');
      if (response?.success && Array.isArray(response.data)) {
        setTiers(response.data.filter((t: Tier) => t.isActive));
      } else if (response?.data?.success) {
        setTiers((response.data.data || []).filter((t: Tier) => t.isActive));
      } else if (Array.isArray(response)) {
        setTiers((response as any).filter((t: Tier) => t.isActive));
      }
    } catch (error) {
      console.error('Error fetching tiers:', error);
    }
  };

  const fetchMyTier = async () => {
    try {
      const response: any = await api.get(`/tiers/user/${user?.id}`);
      if (response?.success) {
        setMyTier(response.data);
      } else if (response?.data?.success) {
        setMyTier(response.data.data);
      } else if (response?.data) {
        setMyTier(response.data);
      }
    } catch (error) {
      console.error('Error fetching my tier:', error);
    }
  };

  const initiatePayment = async (tier: Tier) => {
    if (myTier && myTier.tierId === tier.id) {
      toast.info('You are already on this tier');
      return;
    }

    if (tier.price === 0) {
      toast.info('Please contact admin to assign you the free tier');
      return;
    }

    try {
      setLoading(true);
      toast.loading('Initiating payment...');
      
      const response: any = await api.post('/payments/initiate', {
        tierId: tier.id,
        redirectUrl: `${window.location.origin}/subscription?payment=success`
      });

      if (response?.success && response?.data?.paymentUrl) {
        toast.success('Redirecting to payment page...');
        // Redirect to Flutterwave payment page
        window.location.href = response.data.paymentUrl;
      } else {
        toast.error(response?.message || 'Failed to initiate payment');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to initiate payment';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getTierIcon = (tierName: string) => {
    const name = tierName.toLowerCase();
    if (name.includes('free')) return <Zap className="w-8 h-8" />;
    if (name.includes('basic')) return <Package className="w-8 h-8" />;
    if (name.includes('pro')) return <Shield className="w-8 h-8" />;
    if (name.includes('enterprise')) return <Crown className="w-8 h-8" />;
    return <Sparkles className="w-8 h-8" />;
  };

  const getTierGradient = (tierName: string) => {
    const name = tierName.toLowerCase();
    if (name.includes('free')) return 'from-gray-500 to-gray-600';
    if (name.includes('basic')) return 'from-blue-500 to-blue-600';
    if (name.includes('pro')) return 'from-purple-500 to-purple-600';
    if (name.includes('enterprise')) return 'from-yellow-500 to-amber-600';
    return 'from-indigo-500 to-indigo-600';
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatLimit = (limit: number) => {
    return limit === 0 ? 'Unlimited' : limit.toString();
  };

  const isCurrentTier = (tierId: string) => {
    return myTier?.tierId === tierId;
  };

  const calculateUsagePercentage = (used: number, max: number) => {
    if (max === 0) return 0; // Unlimited
    return Math.min((used / max) * 100, 100);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Plans</h1>
        <p className="text-gray-600">Choose the plan that best fits your needs</p>
      </div>

      {/* Current Tier Status */}
      {myTier && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-purple-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${getTierGradient(myTier.tier.name)} rounded-xl flex items-center justify-center text-white`}>
                {getTierIcon(myTier.tier.name)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900">{myTier.tier.name}</h2>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                    Current Plan
                  </span>
                </div>
                <p className="text-gray-600 mt-1">{myTier.tier.description || 'Your active subscription'}</p>
                {myTier.expiresAt && (
                  <p className="text-sm text-gray-500 mt-1">
                    Expires: {new Date(myTier.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(myTier.tier.price, myTier.tier.currency)}
              </div>
              <div className="text-sm text-gray-500">per {myTier.tier.validityDays} days</div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {/* Attempts Pool - HIGHLIGHTED */}
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-400 rounded-xl p-4 shadow-md">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-yellow-800">🎯 Attempts Pool</span>
                <span className="text-sm font-bold text-yellow-900">
                  {myTier.attemptsUsed || 0} / {formatLimit(myTier.tier.totalAttemptsPool)}
                </span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-amber-600 h-3 rounded-full transition-all"
                  style={{ width: `${calculateUsagePercentage(myTier.attemptsUsed || 0, myTier.tier.totalAttemptsPool)}%` }}
                />
              </div>
              <p className="text-xs text-yellow-700 mt-2 font-medium">
                {myTier.tier.totalAttemptsPool - (myTier.attemptsUsed || 0)} attempts remaining
              </p>
            </div>

            {/* Exams Usage */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Exams Created</span>
                <span className="text-sm font-bold text-gray-900">
                  {myTier.examsCreated} / {formatLimit(myTier.tier.maxExams)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${calculateUsagePercentage(myTier.examsCreated, myTier.tier.maxExams)}%` }}
                />
              </div>
            </div>

            {/* Study Modules Usage */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Study Modules</span>
                <span className="text-sm font-bold text-gray-900">
                  {myTier.studyModulesCreated} / {formatLimit(myTier.tier.maxStudyModules)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${calculateUsagePercentage(myTier.studyModulesCreated, myTier.tier.maxStudyModules)}%` }}
                />
              </div>
            </div>

            {/* Students Usage */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Students</span>
                <span className="text-sm font-bold text-gray-900">
                  {myTier.studentsCreated} / {formatLimit(myTier.tier.maxStudents)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${calculateUsagePercentage(myTier.studentsCreated, myTier.tier.maxStudents)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Tier Assigned */}
      {!myTier && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">No Active Subscription</h3>
              <p className="text-gray-600">Choose a plan below to get started or contact admin for assistance.</p>
            </div>
          </div>
        </div>
      )}

      {/* Available Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const isCurrent = isCurrentTier(tier.id);
          const isPopular = tier.name.toLowerCase().includes('pro');

          return (
            <div
              key={tier.id}
              className={`relative bg-white rounded-2xl p-8 border-2 transition-all duration-300 ${
                isCurrent
                  ? 'border-purple-500 shadow-xl'
                  : isPopular
                  ? 'border-purple-300 shadow-lg'
                  : 'border-gray-200 hover:border-purple-200 hover:shadow-lg'
              }`}
            >
              {/* Popular Badge */}
              {isPopular && !isCurrent && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                    MOST POPULAR
                  </span>
                </div>
              )}

              {/* Current Badge */}
              {isCurrent && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    CURRENT PLAN
                  </span>
                </div>
              )}

              {/* Tier Icon */}
              <div className={`w-16 h-16 bg-gradient-to-br ${getTierGradient(tier.name)} rounded-xl flex items-center justify-center text-white mb-6 mx-auto`}>
                {getTierIcon(tier.name)}
              </div>

              {/* Tier Name & Price */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                {tier.description && (
                  <p className="text-gray-600 text-sm mb-4">{tier.description}</p>
                )}
                <div className="mb-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatCurrency(tier.price, tier.currency)}
                  </span>
                </div>
                <div className="text-sm text-gray-500">per {tier.validityDays} days</div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">🎯</span>
                  </div>
                  <span className="text-gray-700">
                    <strong className="text-yellow-700">{formatLimit(tier.totalAttemptsPool)}</strong> <strong>Attempts Pool</strong>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>{formatLimit(tier.maxExams)}</strong> Exams
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>{formatLimit(tier.maxStudyModules)}</strong> Study Modules
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>{formatLimit(tier.maxStudents)}</strong> Students
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">AI-Powered Features</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">24/7 Support</span>
                </li>
              </ul>

              {/* Action Button */}
              <button
                onClick={() => initiatePayment(tier)}
                disabled={loading || isCurrent}
                className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isPopular
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {isCurrent ? (
                  'Current Plan'
                ) : (
                  <>
                    {tier.price === 0 ? 'Get Started' : 'Upgrade Now'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {tiers.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No subscription plans available yet</p>
          <p className="text-sm text-gray-400 mt-1">Contact admin for more information</p>
        </div>
      )}

      {/* Contact Support */}
      <div className="mt-12 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-2xl p-8 text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Need Help Choosing?</h3>
        <p className="text-gray-600 mb-4">
          Our team is here to help you find the perfect plan for your needs
        </p>
        <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 font-semibold transition-all shadow-lg">
          Contact Support
        </button>
      </div>
    </div>
  );
}

