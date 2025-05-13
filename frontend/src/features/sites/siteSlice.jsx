import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Async Thunks
export const fetchSites = createAsyncThunk('sites/fetchSites', async () => {
    const response = await axios.get(`${API_BASE_URL}/api/sites`);
    return response.data;
});


const siteSlice = createSlice({
    name: 'sites',
    initialState: {
        list: [],
        siteStatus: 'idle',
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Fetch Sites
            .addCase(fetchSites.pending, (state) => {
                state.siteStatus = 'loading';
            })
            .addCase(fetchSites.fulfilled, (state, action) => {
                state.siteStatus = 'succeeded';
                state.list = action.payload;
            })
            .addCase(fetchSites.rejected, (state, action) => {
                state.siteStatus = 'failed';
                state.error = action.error.message;
            })
    },
});

export default siteSlice.reducer;
