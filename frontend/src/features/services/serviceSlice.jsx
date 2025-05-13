import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Async Thunks
export const fetchServices = createAsyncThunk('Services/fetchServices', async () => {
    const response = await axios.get(`${API_BASE_URL}/api/services`);
    return response.data;
});


const ServiceSlice = createSlice({
    name: 'Services',
    initialState: {
        list: [],
        serviceStatus: 'idle',
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Fetch Services
            .addCase(fetchServices.pending, (state) => {
                state.serviceStatus = 'loading';
            })
            .addCase(fetchServices.fulfilled, (state, action) => {
                state.serviceStatus = 'succeeded';
                state.list = action.payload;
            })
            .addCase(fetchServices.rejected, (state, action) => {
                state.serviceStatus = 'failed';
                state.error = action.error.message;
            })
    },
});

export default ServiceSlice.reducer;
