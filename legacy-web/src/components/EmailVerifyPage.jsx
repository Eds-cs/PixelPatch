import React, { useState, useRef, useEffect } from 'react';

export default function App() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-200 p-4 font-inter">
      <EmailVerificationModal />
    </div>
  );
}

function EmailVerificationModal({ onClose }) {
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false; // Numbers Only inside sa placeholders

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    if (element.value !== "" && element.nextSibling) {
      element.nextSibling.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    const value = e.clipboardData.getData("text");
    if (isNaN(value) || value.length !== 6) {
      return;
    }
    const newOtp = value.split('');
    setOtp(newOtp);
    inputRefs.current[5].focus();
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 w-full max-w-md mx-auto flex flex-col items-center text-center">
      
      {/* Icons Part */}
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-blue-100">
        <svg className="w-10 h-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mt-6">
        Verify Your Email Address
      </h1>
      <p className="text-sm text-gray-500 mt-3 max-w-sm">
        We've sent a 6-digit verification code to your email address. Please enter the code below to complete your registration.
      </p>

      {/* OTP Part*/}
      <div className="flex gap-2 sm:gap-3 justify-center my-8" onPaste={handlePaste}>
        {otp.map((data, index) => {
          return (
            <input
              type="text"
              name="otp"
              maxLength="1"
              key={index}
              value={data}
              onChange={(e) => handleChange(e.target, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              ref={(el) => (inputRefs.current[index] = el)}
              className="w-12 h-12 sm:w-14 sm:h-14 text-center text-2xl font-medium border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          );
        })}
      </div>

      <button
        className="w-full py-3 rounded-lg text-base font-medium text-white shadow-md transition-colors
                   bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Verify
      </button>

      <p className="text-sm text-gray-500 mt-6">
        Didn't receive a code?{' '}
        <button className="font-medium text-blue-600 hover:text-blue-500">
          Resend
        </button>
      </p>
    </div>
  );
}