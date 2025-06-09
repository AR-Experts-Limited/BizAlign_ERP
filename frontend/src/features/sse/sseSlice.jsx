// src/features/sse/sseSlice.js
import { createSlice } from '@reduxjs/toolkit';

const API_BASE_URL = import.meta.env.VITE_API_URL;

let eventSource = null;

const initialState = {
    events: null,
    error: null,
    connected: false,
};

const sseSlice = createSlice({
    name: 'sse',
    initialState,
    reducers: {
        setEvents(state, action) {
            state.events = action.payload;
        },
        setError(state, action) {
            state.error = action.payload;
            state.connected = false;
        },
        setConnected(state, action) {
            state.connected = action.payload;
        },
        reset(state) {
            state.events = null;
            state.error = null;
            state.connected = false;
        },
    },
});

export const { setEvents, setError, setConnected, reset } = sseSlice.actions;

export default sseSlice.reducer;

// Thunk to start SSE connection
export const startSSE = () => (dispatch) => {
    if (eventSource) {
        eventSource.close();
    }

    eventSource = new EventSource(`${API_BASE_URL}/api/stream`);

    eventSource.onopen = () => {
        dispatch(setConnected(true));
    };

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        dispatch(setEvents(data));
    };

    eventSource.onerror = (err) => {
        console.error('SSE Error:', err);
        dispatch(setError(err));
        eventSource.close();
    };
};

// Thunk to stop SSE connection
export const stopSSE = () => () => {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
};
