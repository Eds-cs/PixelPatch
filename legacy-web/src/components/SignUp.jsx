import { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import axios from "axios";


const SignUp = () => {

    // OTP related state (place with other useState() calls)
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [activeBox, setActiveBox] = useState(0);
    const [otpStatus, setOtpStatus] = useState("idle"); // idle | sent | verified | failed
    const [resendTimer, setResendTimer] = useState(0);

    // Profile picture upload state can go here
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoUrl, setPhotoUrl] = useState("");


    useEffect(() => {
        if (resendTimer > 0) {
            const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [resendTimer]);

    const [formData, setFormData] = useState({
        firstName: '',
        middleName: '',
        lastName: '',
        dob: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        terms: false
    });

    const [validationStates, setValidationStates] = useState({
        email: { state: 'default', message: '' },
        password: { state: 'default', message: 'Must be at least 8 characters.' },
        confirmPassword: { state: 'default', message: '' },
        phone: { state: 'default', message: '' },

    });

    const setInputState = (field, state, message) => {
        setValidationStates(prev => ({
            ...prev,
            [field]: { state, message }
        }));
    };

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(email)) {
            setInputState('email', 'success', 'Email is valid.');
        } else if (email.length === 0) {
            setInputState('email', 'default', '');
        } else {
            setInputState('email', 'error', 'Please enter a valid email.');
        }
    };



    const handleOtpChange = (value, index) => {
        if (/^[0-9]?$/.test(value)) {
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);

            // Move to next box only if value entered (no auto-complete)
            if (value && index < 5) {
                setActiveBox(index + 1);
            }
        }
    };

    const sendOtp = async () => {
        try {
            await axios.post("http://72.62.248.151/api/auth/send-otp", {
                email: formData.email
            });

            setOtp(["", "", "", "", "", ""]);
            setActiveBox(0);
            setOtpStatus("sent");
            setResendTimer(30);

            alert("OTP sent!");
        } catch (err) {
            console.error(err);
            alert("Failed to send OTP.");
        }
    };



    const verifyOtp = async () => {
        try {
            const res = await axios.post("http://72.62.248.151/api/auth/verify-otp", {
                email: formData.email,
                otp: otp.join("")
            });

            setOtpStatus("verified");
            alert("OTP verified!");
        } catch (err) {
            console.error(err);
            setOtpStatus("failed");
            alert("Invalid OTP");
        }
    };
    const validatePhone = (phone) => {
        const phoneRegex = /^[0-9]{11}$/; // PH 11-digit format: 09xxxxxxxxx

        if (phone.length === 0) {
            setInputState('phone', 'default', '');
        } else if (phoneRegex.test(phone)) {
            setInputState('phone', 'success', 'Phone number is valid.');
        } else {
            setInputState('phone', 'error', 'Phone must be 11 digits (PH number).');
        }
    };


    const validatePassword = (password) => {
        if (password.length >= 8) {
            setInputState('password', 'default', 'Must be at least 8 characters.');
        } else if (password.length === 0) {
            setInputState('password', 'default', 'Must be at least 8 characters.');
        } else {
            setInputState('password', 'error', 'Password is too short.');
        }
    };

    const validateConfirmPassword = (password, confirmPassword) => {
        if (confirmPassword.length === 0) {
            setInputState('confirmPassword', 'default', '');
        } else if (password.length > 0 && confirmPassword === password) {
            setInputState('confirmPassword', 'success', 'Passwords match.');
        } else {
            setInputState('confirmPassword', 'error', 'Passwords do not match.');
        }
    };

    const handleInputChange = (e) => {
        const { id, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        
        setFormData(prev => ({
            ...prev,
            [id]: newValue
        }));

        if (id === 'email') {
            validateEmail(value);
        } else if (id === 'password') {
            validatePassword(value);
            validateConfirmPassword(value, formData.confirmPassword);
        } else if (id === 'confirmPassword') {
            validateConfirmPassword(formData.password, value);
        }
        if (id === 'phone') {
            validatePhone(value);
        }

    };

    const [showPassword, setShowPassword] = useState({
        password: false,
        confirmPassword: false
    });

    const togglePasswordVisibility = (field) => {
        setShowPassword(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Required: Terms & Conditions
        if (!formData.terms) {
            alert("You must accept the Terms & Conditions.");
            return;
        }

        // Validation errors
        if (
            validationStates.password.state === "error" ||
            validationStates.confirmPassword.state === "error" ||
            validationStates.email.state === "error" ||
            validationStates.phone.state === "error"
        ) {
            alert("Please fix the errors in the form.");
            return;
        }

        try {
            let uploadedPhotoUrl = "";

            // -------------------------------
            // 1. Upload the photo if provided
            // -------------------------------
            if (photoFile) {
                const formDataPhoto = new FormData();
                formDataPhoto.append("photo", photoFile);

                const uploadRes = await axios.post(
                    "http://72.62.248.151/api/upload/photo",
                    formDataPhoto,
                    {
                        headers: { "Content-Type": "multipart/form-data" },
                    }
                );

                uploadedPhotoUrl = uploadRes.data.url; // returned URL
            }

            // -------------------------------
            // 2. Register the user
            // -------------------------------
            const response = await axios.post("http://72.62.248.151/api/auth/register", {
                role_id: 1,
                first_name: formData.firstName,
                middle_name: formData.middleName,
                last_name: formData.lastName,
                birthdate: formData.dob,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                photo_url: uploadedPhotoUrl, // NEW
            });

            console.log(response.data);

            alert("Account created successfully!");
            window.location.replace("/login");

        } catch (error) {
            console.error("Registration error:", error);

            if (error.response?.data?.error?.includes("Duplicate entry")) {
                alert("Email already exists!");
            } else {
                alert("Registration failed.");
            }
        }
    };



    const getBorderClass = (field) => {
        const state = validationStates[field]?.state;
        return state === 'success' ? 'border-green-500' :
               state === 'error' ? 'border-red-500' :
               'border-gray-300';
    };

    const getHelperTextClass = (field) => {
        const state = validationStates[field]?.state;
        return state === 'success' ? 'text-green-600' :
               state === 'error' ? 'text-red-600' :
               'text-gray-500';
    };

    return (
        <div className="bg-gray-50 flex items-center justify-center min-h-screen p-4">
            <div className="bg-white shadow-lg rounded-xl flex w-full max-w-5xl overflow-hidden">
                <div className="w-full lg:w-3/5 p-8 sm:p-12">
                <Link 
                    to="/" 
                    className="text-sm text-gray-600 hover:text-gray-900 flex items-center mb-6"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Selection
                </Link>


                    <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
                    <p className="text-gray-500 mt-2 mb-8">Sign up to get started.</p>

                    <form className="space-y-5" id="signup-form" onSubmit={handleSubmit} noValidate>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                                <input
                                    type="text"
                                    id="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    placeholder="Enter your first name"
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="middleName" className="block text-sm font-medium text-gray-700">Middle Name (optional)</label>
                                <input
                                    type="text"
                                    id="middleName"
                                    value={formData.middleName}
                                    onChange={handleInputChange}
                                    placeholder="Enter your middle name"
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    placeholder="Enter your last name"
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="dob" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                                <div className="relative mt-1">
                                    <input
                                        type="date"
                                        id="dob"
                                        value={formData.dob}
                                        onChange={handleInputChange}
                                        className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>

                            <div className="flex items-center gap-2">
                                <input
                                    type="email"
                                    id="email"
                                    disabled={otpStatus === "sent" || otpStatus === "verified"}
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full px-3 py-2 bg-white border rounded-md
                                        disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                />
                                {/* SEND OTP BUTTON */}
                                <button
                                    type="button"
                                    disabled={validationStates.email.state !== "success"}
                                    onClick={sendOtp}
                                    className={`mt-1 px-3 py-2 text-sm rounded-md bg-white border transition
                                        ${validationStates.email.state === "success"
                                            ? "border-blue-500 text-blue-600 hover:bg-blue-50"
                                            : "border-gray-300 text-gray-400 cursor-not-allowed"
                                        }`}
                                >
                                    Send OTP
                                </button>
                            </div>

                            {/* EMAIL VALIDATION MESSAGE */}
                            <p className={`mt-1 text-xs helper-text ${getHelperTextClass('email')}`}>
                                {validationStates.email.message}
                            </p>

                            {/* OTP INPUT SHOWS ONLY WHEN OTP SENT */}
                            {otpStatus === "sent" && (
                                <div className="mt-4">
                                    <label className="text-sm font-medium text-gray-700">Enter OTP</label>

                                    <div className="flex gap-2 mt-2">
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOtpChange(e.target.value, index)}
                                                onFocus={() => setActiveBox(index)}
                                                className={`w-12 h-12 text-center text-xl border rounded-md
                                                    focus:outline-none focus:ring-2 focus:ring-blue-500
                                                    ${otpStatus === "failed" ? "border-red-500" : "border-gray-300"}
                                                `}
                                                autoFocus={index === activeBox}
                                            />
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between mt-3">
                                        {resendTimer > 0 ? (
                                            <span className="text-gray-500 text-sm">
                                                Resend in {resendTimer}s
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={sendOtp}
                                                className="text-blue-600 text-sm hover:underline"
                                            >
                                                Resend OTP
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={verifyOtp}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                        >
                                            Verify
                                        </button>
                                    </div>

                                    {otpStatus === "failed" && (
                                        <p className="text-red-600 text-xs mt-2">Incorrect OTP. Try again.</p>
                                    )}
                                </div>
                            )}

                            {/* OTP VERIFIED MESSAGE */}
                            {otpStatus === "verified" && (
                                <p className="text-green-600 text-sm mt-2">OTP Verified ✓</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                            <input
                                type="text"
                                id="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                placeholder="09XXXXXXXXX"
                                maxLength={11}
                                className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm placeholder-gray-400 
                                    focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${getBorderClass('phone')}`}
                            />
                            <p className={`mt-1 text-xs helper-text ${getHelperTextClass('phone')}`}>
                                {validationStates.phone.message}
                            </p>
                        </div>


                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword.password ? "text" : "password"}
                                    id="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Min. 8 characters"
                                    className={`mt-1 block w-full pr-10 pl-3 py-2 bg-white border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${getBorderClass('password')}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility('password')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center bg-white text-gray-400 hover:text-gray-600"
                                >
                                    <i className={`fas ${showPassword.password ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                            <p className={`mt-1 text-xs helper-text ${getHelperTextClass('password')}`}>
                                {validationStates.password.message}
                            </p>
                        </div>

                        <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword.confirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    placeholder="Re-enter your password"
                                    className={`mt-1 block w-full pr-10 pl-3 py-2 bg-white border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${getBorderClass('confirmPassword')}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility('confirmPassword')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center bg-white text-gray-400 hover:text-gray-600"
                                >
                                    <i className={`fas ${showPassword.confirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                            <p className={`mt-1 text-xs helper-text ${getHelperTextClass('confirmPassword')}`}>
                                {validationStates.confirmPassword.message}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Profile Picture (optional)</label>

                            <div className="mt-2 flex items-center space-x-4">
                                <span className="inline-flex h-14 w-14 rounded-full overflow-hidden bg-gray-100 items-center justify-center">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="h-14 w-14 rounded-full object-cover" />
                                ) : (
                                    <svg className="h-10 w-10 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 20.993V24H0v-2.997A14.977 14.977 0 01112.00415c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                )}
                                </span>

                                <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    setPhotoFile(file);
                                    setPhotoPreview(URL.createObjectURL(file));
                                }}
                                />
                            </div>
                        </div>


                        <div className="flex items-center">
                            <input
                                id="terms"
                                name="terms"
                                type="checkbox"
                                checked={formData.terms}
                                onChange={handleInputChange}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                                I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                            </label>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={otpStatus !== "verified"}
                                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                                    ${otpStatus === "verified"
                                        ? "bg-blue-600 hover:bg-blue-700"
                                        : "bg-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                Sign Up
                            </button>
                        </div>
                    </form>
                </div>

                <div className="hidden lg:flex w-2/5 items-center justify-center bg-white p-12">
                    <div className="text-center flex flex-col items-center">
                        <img src="/PixelpatchLogo.jpg" alt="Pixelpatch Logo" className="w-48 h-auto mx-auto mb-6 drop-shadow-lg" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp;