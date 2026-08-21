import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  dailyStats: {
    water: 0,
    steps: 0,
    sleep: 0,
    calories: 0,
    heartRate: 0,
    mood: 'Neutral',
  },
  history: [],
  insights: [],
  loading: false,
};

const healthSlice = createSlice({
  name: 'health',
  initialState,
  reducers: {
    updateStats: (state, action) => {
      state.dailyStats = { ...state.dailyStats, ...action.payload };
    },
    setHistory: (state, action) => {
      state.history = action.payload;
    },
    setInsights: (state, action) => {
      state.insights = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const { updateStats, setHistory, setInsights, setLoading } = healthSlice.actions;
export default healthSlice.reducer;
