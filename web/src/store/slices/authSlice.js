import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  session: null,
  role: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setSession: (state, action) => {
      state.session = action.payload;
    },
    setRole: (state, action) => {
      state.role = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.session = null;
      state.role = null;
    },
  },
});

export const { setUser, setSession, setRole, setLoading, setError, logout } = authSlice.actions;
export default authSlice.reducer;
