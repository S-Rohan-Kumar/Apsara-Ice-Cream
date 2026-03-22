import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  userInfo: localStorage.getItem('userInfo')
    ? JSON.parse(localStorage.getItem('userInfo'))
    : null,
};


const authSlice = createSlice({
    name : "auth",
    initialState,
    reducers : {
        SetCredentials : (state , action) => {
            state.userInfo = action.payload
            localStorage.setItem("userInfo" , JSON.stringify(action.payload))
        },
        logOut : (state) => {
            state.userInfo = null
            localStorage.removeItem("userInfo")
        }
    }
})  

export const {SetCredentials , logOut} = authSlice.actions

export default  authSlice.reducer

export const selectUserInfo = (state) => state.auth.userInfo;