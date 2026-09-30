import React from 'react';
import { useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import axios from "axios";


// Main App component for preview
export default function App() {
  return (
    // We wrap this in a gray background to make the white form visible
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4 py-10 font-inter">
      <BusinessSignUpPageThree />
    </div>
  );
}

// Stepper Component
function Stepper({ currentStep }) {
  const steps = [
    { number: 1, title: 'Account Info' },
    { number: 2, title: 'Business Info' },
    { number: 3, title: 'Services' },
    { number: 4, title: 'Payment' },
  ];

  return (
    <nav className="w-full max-w-3xl mx-auto mb-16" aria-label="Progress">
      <div className="flex items-start">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            {/* Step Item (Circle + Text) */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 ${
                  step.number === currentStep
                    ? 'bg-blue-600 border-blue-600' // Active
                    : step.number < currentStep
                    ? 'bg-white border-blue-600' // Completed
                    : 'border-gray-300 bg-white' // Future
                }`}
              >
                {step.number < currentStep ? (
                  // Completed Checkmark
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  // Number
                  <span className={`font-semibold ${
                    step.number === currentStep ? 'text-white' : 'text-gray-500'
                  }`}>
                    {step.number}
                  </span>
                )}
              </div>
              <p className={`text-xs sm:text-sm font-medium mt-3 text-center w-24 ${
                  step.number <= currentStep ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {step.title}
              </p>
            </div>
            
            {/* Connecting Line (if not the last step) */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-1 mt-4 sm:mt-5">
                <div className={`h-full ${
                  step.number < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`}></div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
}

// Page Three Component
function BusinessSignUpPageThree() {
  
  const navigate = useNavigate();
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("businessSignup"));
    if (
      !data ||
      !data.business_name ||
      !data.region ||
      !Array.isArray(data.services) ||
      data.services.length === 0
    ) {
      alert("Complete previous registration steps first.");
      navigate(ROUTES.BUSINESS_SIGNUP.STEP1);
    }
  }, [navigate]);

  const handleBack = () => {
    navigate(ROUTES.BUSINESS_SIGNUP.STEP2);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const form = event.target;

    // 1️⃣ Load previous steps
    const savedData = JSON.parse(localStorage.getItem("businessSignup")) || {};

    // 2️⃣ Extract payment info
    const paymentData = {
      payment_method: form.payment_method.value,
      account_name: form.account_name.value,
      account_number: form.account_number.value,
      tin: form.tin.value || null,
      terms: form.terms.checked,
      privacy: form.privacy.checked,
    };

    if (
      !form.payment_method.value ||
      !form.account_name.value ||
      !form.account_number.value ||
      !form.terms.checked ||
      !form.privacy.checked
    ) {
      alert("Complete all payment and agreement fields.");
      return;
    }
    // 3️⃣ Merge final data
    const finalData = {
      ...savedData,
      payment: paymentData,
    };

    console.log("FINAL DATA TO SAVE:", finalData);

    try {
      // 4️⃣ Send API request to backend
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/business-register`,
        finalData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || sessionStorage.getItem("token")}`
          }
        }
      );


      console.log("BACKEND RESPONSE:", response.data)
      if (response.data.success) {
        localStorage.removeItem("businessSignup");
        navigate(ROUTES.BUSINESS_SIGNUP.STEP4);
      }


      // 5️⃣ Navigate to review screen
      navigate(ROUTES.BUSINESS_SIGNUP.STEP4);

    } catch (err) {
      console.error("REGISTRATION ERROR:", err);
      alert(err.response?.data?.message || "Registration failed.");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 w-full max-w-2xl mx-auto">
      <Stepper currentStep={4} />

      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Payment Details
        </h1>

        <form className="space-y-6" onSubmit={handleSubmit}>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Payment Method
            </label>
            <select
              id="payment_method"
              name="payment_method"
              className="block w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm"
              defaultValue=""
              required
            >
              <option value="" disabled>Select Payment Method</option>
              <option value="bank">Bank Transfer</option>
              <option value="gcash">GCash</option>
              <option value="maya">Maya</option>
            </select>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name
            </label>
            <input
              type="text"
              name="account_name"
              className="block w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm"
              required
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number
            </label>
            <input
              type="text"
              name="account_number"
              className="block w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm"
              required
            />
          </div>

          {/* TIN (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              TIN (optional)
            </label>
            <input
              type="text"
              name="tin"
              className="block w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm"
            />
          </div>

          {/* Terms */}
          <div className="space-y-4 pt-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                name="terms"
                className="h-4 w-4 text-blue-600 mt-0.5"
                required
              />
              <label className="ml-3 text-sm text-gray-600">
                I agree to the Terms & Conditions.
              </label>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                name="privacy"
                className="h-4 w-4 text-blue-600 mt-0.5"
                required
              />
              <label className="ml-3 text-sm text-gray-600">
                I accept the Privacy Policy.
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-3 rounded-lg bg-white border border-gray-300"
            >
              Back
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Submit Registration
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

