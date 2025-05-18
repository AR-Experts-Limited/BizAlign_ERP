import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate, useNavigate } from "react-router-dom";
import { IoEye } from "react-icons/io5";
import { IoEyeOff } from "react-icons/io5";
import { login, verifyOTP } from '../../features/auth/authSlice'

const Login = () => {
    const [showPass, setShowPass] = useState(false)
    const navigate = useNavigate()
    const dispatch = useDispatch();

    const [credentials, setCredentials] = useState({
        email: "",
        password: ''
    })

    const [loginLoad, setLoginLoad] = useState(false);
    const [otpVerifyStage, setOtpVerifyStage] = useState(false)

    const [error, setErrors] = useState({});

    const handleLogin = async () => {
        let newErrors = {}
        if (credentials.email === '' || !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(credentials.email)) {
            newErrors.email = true
        }
        if (credentials.password === '') {
            newErrors.password = true
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }
        setLoginLoad(true);

        const resultAction = await dispatch(login(credentials))
        if (login.fulfilled.match(resultAction)) {
            setLoginLoad(false);
            setOtpVerifyStage(true)
            setErrors({})
        } else {
            setErrors({ login: true })
            setLoginLoad(false);
            console.error("Login failed:", resultAction.payload);
        }
    };



    const OtpVerify = ({ setOtpVerifyStage }) => {
        const [otp, setOtp] = useState(["", "", "", "", "", ""]);
        const [error, setError] = useState("");

        const handleChange = (e, index) => {
            const value = e.target.value;
            if (/[^0-9]/.test(value)) return;

            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);

            if (value && index < otp.length - 1) {
                const nextInput = document.getElementById(`otp-input-${index + 1}`);
                if (nextInput) nextInput.focus();
            }
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            const otpCode = otp.join("");
            if (otpCode.length !== 6) {
                setError("Please enter a 6-digit OTP.");
                return;
            }

            const verifyStatus = await dispatch(verifyOTP({ email: credentials.email, otp: otpCode }))
            if (verifyStatus.payload.success) {
                navigate('/dashboard');
            } else {
                alert('unsuccessful');
            }
        };

        return (
            <div className="flex flex-col items-center justify-center  px-4">
                <p className="text-base text-white mb-4 text-center">
                    Enter the 6-digit OTP sent to your email
                </p>
                <form onSubmit={handleSubmit} className="w-full max-w-sm  p-6">
                    <div className="flex justify-between gap-4 mb-4 ">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                id={`otp-input-${index}`}
                                type="text"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleChange(e, index)}
                                autoFocus={index === 0}
                                className="w-10 h-12 border border-stone-400 rounded-md text-center text-lg focus:outline-none focus:ring-2 focus:ring-green-500 inset-shadow-sm bg-white/40"
                            />
                        ))}
                    </div>

                    {error && <p className="text-red-600 text-sm mb-3 text-center">{error}</p>}

                    <div className="flex justify-around gap-4 m-8 ">
                        <button
                            type="submit"
                            className="bg-amber-600  text-white px-2 py-1 rounded-md shadow-md hover:bg-amber-700 transition-colors"
                        >
                            Verify OTP
                        </button>
                        <button
                            type="button"
                            className="bg-red-500  text-white px-2 py-1 rounded-md hover:bg-red-600 transition-colors shadow-md"
                            onClick={() => setOtpVerifyStage(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    const renderLoginPageData = () => {
        let loginPageData = ''

        if (otpVerifyStage) {
            loginPageData =
                <>
                    <OtpVerify setOtpVerifyStage={setOtpVerifyStage} />
                </>
        }
        else {
            loginPageData =
                <>
                    <div className=' flex items-center flex-col gap-6'>
                        <p className='dark:text-white text-base text-white'>Enter your email address and password to access your account</p>
                        <div className='w-full'>
                            <input onChange={(e) => { setErrors(prev => ({ ...prev, email: false })); setCredentials(prev => ({ ...prev, email: e.target.value })) }} className={`w-full  dark:bg-dark-4/60 dark:border-dark-4 bg-white/80 rounded-lg border border-neutral-300 p-4 outline-none ${error.email ? 'animate-pulse border-2 border-red-300' : ''}`} type="email" placeholder='Enter your email' />
                            {error?.email && <div className='text-sm text-red-400'>*please enter a valid email</div>}
                        </div>
                        <div className='w-full'>
                            <div className='relative w-full'>
                                <input onChange={(e) => { setErrors(prev => ({ ...prev, password: false })); setCredentials(prev => ({ ...prev, password: e.target.value })) }} className={`w-full  dark:bg-dark-4/60 dark:border-dark-4 bg-white/80 rounded-lg border border-neutral-300 p-4 outline-none ${error.password ? 'animate-pulse border-2 border-red-300' : ''}`} type={showPass ? 'text' : 'password'} placeholder='Enter your password' />
                                <div className='cursor-pointer absolute text-stone-300 bottom-[1.2rem] right-5' onClick={() => setShowPass(prev => !prev)}>{showPass ? <IoEyeOff size={20} /> : <IoEye size={20} />}</div>
                            </div>
                            {error?.password && <div className='text-sm text-red-400'>*please enter your password</div>}
                        </div>

                        {error.login && <div className='w-full text-sm p-1 md:p-2 rounded-md bg-red-200/60 border border-red-400 text-red-400 flex justify-center items-center gap-3'><div className='text-xs font-bold p-2 flex justify-center items-center bg-red-400 h-2 w-2 text-white rounded-full'>!</div>Invalid Username or password</div>}

                        <button onClick={handleLogin} className='flex justify-center items-center text-white rounded-lg w-20 h-8 bg-[#006173]/80 hover:bg-[#006173]/50 shadow-md'>{loginLoad ? <div className="w-4 h-4 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                            : 'Sign In'}</button>
                        <button className='text-sm dark:text-stone-300 text-white mb-5 hover:scale-104 transition-all duration-200'>Forgot password?</button>
                    </div>
                </>

        }
        return loginPageData
    }

    return (
        <div >
            <div className='dark:bg-dark-1 p-5 h-screen w-screen relative flex justify-center items-center '>

                <div className='z-0 dark:hidden absolute -top-25 -right-30 bg-[#006173]/30 h-160 w-160 blur-[90rem] rounded-full'></div>
                <div className='z-0 dark:hidden absolute -bottom-55 -left-55 bg-[#89CA38]/30 h-180 w-180 blur-[90rem] rounded-full'></div>

                {/* <div className='dark:hidden absolute -top-10 left-15 bg-[#89CA38]/80 h-90 w-90 blur-[190px] rounded-full'></div>
                <div className='dark:hidden absolute top-0 right-[40%] bg-[#006173] h-60 w-60 blur-[190px] rounded-full'></div> */}
                {/* <div className='dark:hidden absolute bottom-10 -right-2 bg-[#006173] h-60 w-60 blur-[190px] rounded-full'></div>
                <div className='dark:hidden absolute bottom-0 right-[40%] bg-[#89CA38]/80 h-60 w-60 blur-[180px] rounded-full'></div> */}
                {/* bg-linear-133 from-[#047ba4]/80 to-[#498b15fc]/80 
                bg-[radial-gradient(#006173_5%,transparent_11%)] [background-size:20px_20px] dark:bg-[radial-gradient(#89CA38_10%,transparent_11%)] dark:[background-size:30px_30px]*/}

                <div className='z-1 py-2 md:py-5 px-5 md:px-14 flex flex-col  items-center dark:bg-dark-5  bg-linear-133 from-[#047ba4]/80 to-[#498b15fc]/80  shadow-[8px_5px_30px_8px_rgba(0,0,0,0.25)] dark:border-dark-3/70 border-2 border-stone-600/30 rounded-xl '>
                    <div className='flex flex-col gap-2 justify-center items-center'>
                        <img className='h-45 w-45' src="/Asset_3.png" />
                    </div>
                    {renderLoginPageData()}
                </div>
            </div>
        </div>
    );
};

export default Login;