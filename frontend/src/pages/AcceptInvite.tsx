import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Loader2, CheckCircle, XCircle, Mail, RefreshCw } from 'lucide-react';

const AcceptInvitePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('Processing your invitation...');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setStatus('error');
      setMessage('Invalid invitation link. No code provided.');
      return;
    }

    setInviteCode(code);
    acceptInvite(code);
  }, [searchParams]);

  const acceptInvite = async (code: string) => {
    try {
      setStatus('loading');
      setMessage('Accepting your invitation...');

      const res = await api.acceptInvite({ code });

      if (res.userId) {
        // User exists → redirect to login
        setStatus('success');
        setMessage('Invitation accepted! Redirecting to login...');
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Invite accepted! Please login to access your organization.' 
            } 
          });
        }, 2000);
      } else if (res.invite) {
        // User does not exist → redirect to register
        setStatus('success');
        setMessage('Redirecting to registration...');
        setTimeout(() => {
          navigate('/register', {
            state: { 
              email: res.invite.email, 
              inviteCode: res.invite.code,
              organizationName: res.invite.organizationName 
            },
          });
        }, 1500);
      }
    } catch (error: any) {
      console.error('Failed to accept invite:', error);
      
      const errorMessage = error.response?.data?.message || 'Unknown error';
      
      // Check if invite is expired
      if (errorMessage.includes('expired')) {
        setStatus('expired');
        setMessage('This invitation has expired.');
      } else if (errorMessage.includes('Invalid') || errorMessage.includes('already')) {
        setStatus('error');
        setMessage(errorMessage);
      } else {
        setStatus('error');
        setMessage('Failed to accept invitation. Please try again or contact support.');
      }
    }
  };

  const handleResendInvite = async () => {
    if (!inviteCode) return;

    setResending(true);
    try {
      await api.resendInviteByCode(inviteCode);
      
      setStatus('success');
      setMessage('Invitation resent! Please check your email for the new link.');
      
      // Give user time to read the message
      setTimeout(() => {
        setStatus('loading');
        setMessage('You can also try accepting the invite again...');
        // Automatically try to accept after resending
        acceptInvite(inviteCode);
      }, 3000);
    } catch (error: any) {
      console.error('Failed to resend invite:', error);
      const errorMessage = error.response?.data?.message || 'Failed to resend invitation';
      setStatus('error');
      setMessage(errorMessage);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          {/* Status Icon */}
          <div className="mb-6">
            {status === 'loading' && (
              <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            )}
            {(status === 'error' || status === 'expired') && (
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {status === 'loading' && 'Processing Invitation'}
            {status === 'success' && 'Invitation Accepted!'}
            {status === 'error' && 'Invitation Error'}
            {status === 'expired' && 'Invitation Expired'}
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            {message}
          </p>

          {/* Action Buttons */}
          {status === 'expired' && (
            <div className="space-y-3">
              <button
                onClick={handleResendInvite}
                disabled={resending}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Resending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Resend Invitation
                  </>
                )}
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Go to Home
              </button>
            </div>
          )}

          {status === 'error' && !message.includes('expired') && (
            <div className="space-y-3">
              <button
                onClick={() => acceptInvite(inviteCode)}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Go to Home
              </button>
            </div>
          )}

          {status === 'loading' && (
            <div className="flex justify-center">
              <div className="animate-pulse flex space-x-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
              </div>
            </div>
          )}
        </div>

        {/* Help Text */}
        {status === 'expired' && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>What happened?</strong><br />
              Invitations expire after 7 days for security. Click "Resend Invitation" to get a new one sent to your email with an extended expiration date.
            </p>
          </div>
        )}

        {status === 'success' && message.includes('resent') && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>Check your email for the new invitation link!</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitePage;