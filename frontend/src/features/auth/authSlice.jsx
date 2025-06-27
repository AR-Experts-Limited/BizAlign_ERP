import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Async Thunks
export const login = createAsyncThunk(
    'auth/login',
    async ({ email, password }, thunkAPI) => {
        try {
            await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password }, { withCredentials: true });
            return true;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data?.message || 'Login failed');
        }
    }
);

export const verifyOTP = createAsyncThunk(
    'auth/verifyOTP',
    async ({ email, otp }, thunkAPI) => {
        try {
            const res = await axios.post(`${API_BASE_URL}/api/auth/verify-otp`, { email, otp }, { withCredentials: true });
            const { accessToken, access, role, userId, firstName, lastName, site, siteArray } = res.data;
            await axios.post(`${API_BASE_URL}/api/sessionTime/login-time`, { userId, user: res.data });

            return { success: true, userDetails: { id: userId, userName: firstName + ' ' + lastName, role, site, siteArray }, accessToken, access, role };
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data?.message || 'OTP verification failed');
        }
    }
);

export const refreshToken = createAsyncThunk(
    'auth/refreshToken',
    async (_, thunkAPI) => {
        try {
            const res = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {}, { withCredentials: true });
            return { accessToken: res.data.accessToken, access: res.data.access };
        } catch (err) {
            return thunkAPI.rejectWithValue('Refresh token failed');
        }
    }
);

export const logout = createAsyncThunk(
    'auth/logout',
    async (_, thunkAPI) => {
        try {
            await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, { withCredentials: true });
            return;
        } catch (err) {
            return thunkAPI.rejectWithValue('Logout failed');
        }
    }
);

// Slice
const authSlice = createSlice({
    name: 'auth',
    initialState: {
        userDetails: null,
        accountExists: false,
        accessToken: null,
        accessDetails: null,
        loading: false,
        error: null
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(verifyOTP.fulfilled, (state, action) => {
                state.userDetails = action.payload.userDetails;
                state.accessToken = action.payload.accessToken;
                state.accessDetails = action.payload.access;
                state.error = null;
            })
            .addCase(refreshToken.fulfilled, (state, action) => {
                state.accessToken = action.payload.accessToken;
                state.accessDetails = action.payload.access;
            })
            .addCase(logout.fulfilled, (state) => {
                state.userDetails = null;
                state.accessToken = null;
                state.accessDetails = null;
            })
            .addCase(login.fulfilled, (state) => {
                state.accountExists = true
            })
            .addCase(login.rejected, (state) => {
                state.accountExists = false
            })
            .addMatcher(
                (action) => action.type.startsWith('auth/') && action.type.endsWith('/pending'),
                (state) => {
                    state.loading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                (action) => action.type.startsWith('auth/') && action.type.endsWith('/rejected'),
                (state, action) => {
                    state.loading = false;
                    state.error = action.payload || 'Something went wrong';
                }
            )
            .addMatcher(
                (action) => action.type.startsWith('auth/') && action.type.endsWith('/fulfilled'),
                (state) => {
                    state.loading = false;
                    state.error = null;
                }
            );
    }
});

export default authSlice.reducer;
