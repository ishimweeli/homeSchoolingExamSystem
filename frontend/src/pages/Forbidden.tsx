// pages/Forbidden.tsx
import { useLocation, Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

export default function Forbidden() {
  const location = useLocation();
  const state = location.state as { allowedRoles?: string };
  const allowedRoles = state?.allowedRoles || "authorized users";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
      <h1 className="text-2xl font-semibold text-gray-800 mb-2">
        Access Denied
      </h1>
      <p className="text-gray-600 mb-4">
        You do not have permission to view this page. <br />
        This area is restricted to <strong>{allowedRoles}</strong>.
      </p>
      <Link
        to="/dashboard"
        className="text-blue-600 hover:underline font-medium"
      >
        Go back to dashboard
      </Link>
    </div>
  );
}
