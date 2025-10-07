import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

interface RequireRoleProps {
    allowedRoles: string[];
    children: React.ReactNode;
}

export default function RequireRole({ children, allowedRoles }: RequireRoleProps) {
    const { user } = useAuthStore();
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        const formattedRoles =
            allowedRoles.length === 1
                ? allowedRoles[0]
                : allowedRoles.slice(0, -1).join(", ") + " or " + allowedRoles.slice(-1);

        return (
            <Navigate
                to="/forbidden"
                state={{ allowedRoles: formattedRoles }}
                replace
            />
        );
    }

    return <>{children}</>;
}
