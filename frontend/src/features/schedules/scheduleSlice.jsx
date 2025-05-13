import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Async Thunks
export const fetchSchedules = createAsyncThunk('Schedules/fetchSchedules', async () => {
    const response = await axios.get(`${API_BASE_URL}/api/schedule/allschedules`)
    return response.data;
});

export const addSchedule = createAsyncThunk('Schedules/addSchedule', async (Schedule) => {
    const response = await axios.post(`${API_BASE_URL}`, Schedule);
    return response.data;
});

export const updateSchedule = createAsyncThunk('Schedules/updateSchedule', async (Schedule) => {
    const response = await axios.put(`${API_BASE_URL}/${Schedule.id}`, Schedule);
    return response.data;
});

export const deleteSchedule = createAsyncThunk('Schedules/deleteSchedule', async (id) => {
    await axios.delete(`${API_BASE_URL}/api/Schedules/${id}`);
    return id;
});

const ScheduleSlice = createSlice({
    name: 'Schedules',
    initialState: {
        list: [],
        scheduleStatus: 'idle',
        error: null,
        addStatus: 'idle',
        updateStatus: 'idle',
        deleteStatus: 'idle',
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Fetch Schedules
            .addCase(fetchSchedules.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchSchedules.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.list = action.payload;
            })
            .addCase(fetchSchedules.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })

            // Add Schedule
            .addCase(addSchedule.pending, (state) => {
                state.addStatus = 'loading';
            })
            .addCase(addSchedule.fulfilled, (state, action) => {
                state.addStatus = 'succeeded';
                state.list.push(action.payload);
            })
            .addCase(addSchedule.rejected, (state, action) => {
                state.addStatus = 'failed';
                state.error = action.error.message;
            })

            // Update Schedule
            .addCase(updateSchedule.fulfilled, (state, action) => {
                const index = state.list.findIndex((d) => d.id === action.payload.id);
                if (index !== -1) state.list[index] = action.payload;
            })

            // Delete Schedule
            .addCase(deleteSchedule.pending, (state) => {
                state.deleteStatus = 'loading';
            })
            .addCase(deleteSchedule.fulfilled, (state, action) => {
                state.deleteStatus = 'succeeded';
                state.list = state.list.filter((d) => d._id !== action.payload);
            })
            .addCase(deleteSchedule.rejected, (state, action) => {
                state.deleteStatus = 'failed';
                state.error = action.error.message;
            });
    },
});

export default ScheduleSlice.reducer;
