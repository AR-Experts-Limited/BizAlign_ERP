import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import { refreshToken } from "../../features/auth/authSlice";


const ProtectedRoute = ({ children, routeName }) => {
    const { accountExists, accessToken, accessDetails, loading } = useSelector((state) => state.auth);
    const dispatch = useDispatch()


    if (loading) {
        return <div className='loading-page'>
            <div className="loading-page-logo">
                <h4>BizAlign</h4>
            </div>
            <div className='loader'></div>
        </div>
    }

    if (!accessToken) {
        return <Navigate to="/login" replace />;
    }


    if (accessDetails && !accessDetails?.includes(routeName)) {
        return <Navigate to="/login" />;
    }


    // If the user is authenticated, render the children (protected content)
    return children;
};

export default ProtectedRoute;