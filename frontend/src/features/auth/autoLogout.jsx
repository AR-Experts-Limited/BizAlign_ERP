import { logout } from './authSlice';

const autoLogoutMiddleware = ({ dispatch }) => {
    let logoutTimer;

    return (next) => (action) => {
        // Start timer on successful login or OTP verification
        if (action.type === 'auth/login/fulfilled' || action.type === 'auth/verifyOTP/fulfilled') {
            // Clear any existing timer
            if (logoutTimer) {
                clearTimeout(logoutTimer);
            }

            logoutTimer = setTimeout(() => {
                dispatch(logout());
            }, 45 * 60 * 1000);
        }

        // Reset timer on successful token refresh
        if (action.type === 'auth/refreshToken/fulfilled') {
            if (logoutTimer) {
                clearTimeout(logoutTimer);
            }
            logoutTimer = setTimeout(() => {
                dispatch(logout());
            }, 45 * 60 * 1000);
        }

        // Clear timer on logout
        if (action.type === 'auth/logout/fulfilled') {
            if (logoutTimer) {
                clearTimeout(logoutTimer);
            }
        }

        return next(action);
    };
};

export default autoLogoutMiddleware;