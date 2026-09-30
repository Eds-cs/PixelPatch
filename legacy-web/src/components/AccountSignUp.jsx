import React, { useState } from 'react';

// Main App component for preview
export default function App() {
  return (
    // We wrap this in a gray background to make the white form visible
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4 py-10">
      <AccountSignUp />
    </div>
  );
}

// The Account Sign Up Component
function AccountSignUp() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const toggleConfirmPasswordVisibility = () => {
    setConfirmPasswordVisible(!confirmPasswordVisible);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 w-full max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Information</h1>
      
      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          
          {/* First Name */}
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              id="first_name"
              placeholder="Enter your first name"
              className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Middle Name (optional) */}
          <div>
            <label htmlFor="middle_name" className="block text-sm font-medium text-gray-700 mb-1">
              Middle Name (optional)
            </label>
            <input
              type="text"
              id="middle_name"
              placeholder="Enter your middle name"
              className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              id="last_name"
              placeholder="Enter your last name"
              className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Suffixes */}
          <div>
            <label htmlFor="suffix" className="block text-sm font-medium text-gray-700 mb-1">
              Suffix
            </label>
            <select
              id="suffix"
              className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm focus:border-blue-500 focus:ring-blue-500 text-gray-500"
            >
              <option value="None">None</option>
              <option value="Jr.">Jr.</option>
              <option value="Sr.">Sr.</option>
              <option value="II">II</option>
              <option value="III">III</option>
            </select>
          </div>

          {/* DOB */}
          <div className="md:col-span-2">
            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            <input
              type="text"
              id="dob"
              placeholder="MM/DD/YY"
              className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          {/* Email Address */}
          <div className="md:col-span-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="flex gap-4">
              <input
                type="email"
                id="email"
                placeholder="Enter email"
                className="flex-1 w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                type="button"
                className="rounded-lg border border-blue-600 bg-white px-6 py-3 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50"
              >
                Send OTP
              </button>
            </div>
          </div>
          
          {/* Email OTP Part */}
          <div className="md:col-span-2">
            <label htmlFor="email_otp" className="block text-sm font-medium text-gray-700 mb-1">
              Email OTP
            </label>
            <div className="flex gap-4">
              <input
                type="text"
                id="email_otp"
                placeholder="909987"
                className="flex-1 w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                type="button"
                className="rounded-lg border border-transparent bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Verify
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Input your OTP here to verify your email.</p>
          </div>

          {/* Phone Number of a Person */}
          <div className="md:col-span-2">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="flex gap-4">
              <span className="flex items-center rounded-lg border border-gray-300 bg-gray-100 p-3 text-sm text-gray-600">
                +63
              </span>
              <input
                type="tel"
                id="phone"
                placeholder="9786657843"
                className="flex-1 w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                type="button"
                className="rounded-lg border border-blue-600 bg-white px-6 py-3 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50"
              >
                Send OTP
              </button>
            </div>
          </div>
          
          {/* Phone Number OTP (Static as of now) */}
          <div className="md:col-span-2">
            <label htmlFor="phone_otp" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number OTP
            </label>
            <div className="flex gap-4">
              <input
                type="text"
                id="phone_otp"
                placeholder="909987"
                className="flex-1 w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                type="button"
                className="rounded-lg border border-transparent bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Verify
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Input your OTP here to verify your phone number.</p>
          </div>

          {/* Password Dito */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={passwordVisible ? 'text' : 'password'}
                id="password"
                placeholder="********"
                className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 pr-10 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                {passwordVisible ? (
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password Part */}
          <div>
            <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={confirmPasswordVisible ? 'text' : 'password'}
                id="confirm_password"
                placeholder="********"
                className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 pr-10 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                {confirmPasswordVisible ? (
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Other Buttons */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col md:flex-row gap-4">
          <button
            type="button"
            className="flex-1 rounded-lg border border-blue-600 bg-white px-6 py-3 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50"
          >
            Continue with Business Registration
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg border border-transparent bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Sign Up
          </button>
        </div>
      </form>
    </div>
  );
}