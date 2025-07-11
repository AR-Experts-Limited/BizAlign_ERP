import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Async Thunks
export const fetchRatecards = createAsyncThunk('Ratecards/fetchRatecards', async () => {
    const response = await axios.get(`${API_BASE_URL}/api/ratecards`)
    return response.data;
});

export const addRatecard = createAsyncThunk('Ratecards/addRatecard', async ({ rateCard, existingWeeks }) => {
    const response = await axios.post(`${API_BASE_URL}/api/ratecards`, { ...rateCard, existingWeeks });
    return response.data;
});

export const updateRatecard = createAsyncThunk('Ratecards/updateRatecard', async (Ratecard, { rejectWithValue }) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/api/ratecards`, Ratecard);
        return response.data;
    }
    catch (err) {
        return rejectWithValue(err.response?.data || { message: 'An unexpected error occurred' });
    }
});

export const updateRatecardActive = createAsyncThunk('Ratecards/updateRatecardActive', async (Ratecard) => {
    const response = await axios.put(`${API_BASE_URL}/api/ratecards/active`, Ratecard);
    return response.data;
});

export const deleteRatecard = createAsyncThunk('Ratecards/deleteRatecard', async (data) => {
    const response = await axios.delete(`${API_BASE_URL}/api/ratecards`, { data: data });
    return { response, ids: data.ids };
});

const RatecardSlice = createSlice({
    name: 'Ratecards',
    initialState: {
        list: [],
        ratecardStatus: 'idle',
        error: null,
        addStatus: 'idle',
        updateStatus: 'idle',
        deleteStatus: 'idle',
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Fetch Ratecards
            .addCase(fetchRatecards.pending, (state) => {
                state.ratecardStatus = 'loading';
            })
            .addCase(fetchRatecards.fulfilled, (state, action) => {
                state.ratecardStatus = 'succeeded';
                state.list = action.payload;
            })
            .addCase(fetchRatecards.rejected, (state, action) => {
                state.ratecardStatus = 'failed';
                state.error = action.error.message;
            })

            // Add Ratecard
            .addCase(addRatecard.pending, (state) => {
                state.addStatus = 'loading';
            })
            .addCase(addRatecard.fulfilled, (state, action) => {
                state.addStatus = 'succeeded';
                const { added, updated } = action.payload
                state.list = state.list.map((item) => {
                    if (updated.some((up) => up._id === item._id)) {
                        return updated.find((up) => up._id === item._id)
                    }
                    else
                        return item
                })
                state.list = [...state.list, ...added];
            })
            .addCase(addRatecard.rejected, (state, action) => {
                state.addStatus = 'failed';
                state.error = action.error.message;
            })

            // Update Ratecard
            .addCase(updateRatecard.fulfilled, (state, action) => {
                const { updated } = action.payload;
                if (Array.isArray(updated)) {
                    updated.forEach((rateCard) => {
                        const index = state.list.findIndex((d) => d._id === rateCard._id);
                        if (index !== -1) {
                            state.list[index] = { ...rateCard, id: rateCard._id };
                        }
                    });
                }
            })

            .addCase(updateRatecard.rejected, (state, action) => {
                state.addStatus = 'failed';
                state.error = action.error.message;
            })

            // Update Ratecard Active
            .addCase(updateRatecardActive.fulfilled, (state, action) => {
                const { updated } = action.payload;
                if (Array.isArray(updated)) {
                    updated.forEach((rateCard) => {
                        const index = state.list.findIndex((d) => d._id === rateCard._id);
                        if (index !== -1) {
                            state.list[index] = { ...rateCard, id: rateCard._id };
                        }
                    });
                }
            })

            // Delete Ratecard
            .addCase(deleteRatecard.pending, (state) => {
                state.deleteStatus = 'loading';
            })
            .addCase(deleteRatecard.fulfilled, (state, action) => {
                state.deleteStatus = 'succeeded';
                if (action.payload.response.data.confirm)
                    state.list = state.list.filter((d) => !action.payload.ids.includes(d._id));
            })
            .addCase(deleteRatecard.rejected, (state, action) => {
                state.deleteStatus = 'failed';
                state.error = action.error.message;
            });
    },
});

export default RatecardSlice.reducer;
