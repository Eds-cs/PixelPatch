// --- Business Sign Up Page (Step 2) ---
// Business Type removed and all inputs fully functional

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

// Stepper
function Stepper({ currentStep }) {
  const steps = [
    { number: 1, title: "Account Info" },
    { number: 2, title: "Business Info" },
    { number: 3, title: "Services" },
    { number: 4, title: "Payment" },
  ];

  return (
    <nav className="w-full max-w-3xl mx-auto mb-16">
      <div className="flex items-start">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step.number === currentStep
                    ? "bg-blue-600 border-blue-600 text-white"
                    : step.number < currentStep
                    ? "border-blue-600 text-blue-600"
                    : "border-gray-300 text-gray-500"
                }`}
              >
                {step.number < currentStep ? (
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              <p className={`mt-3 text-sm w-24 text-center ${step.number <= currentStep ? "text-blue-600" : "text-gray-500"}`}>
                {step.title}
              </p>
            </div>

            {index < steps.length - 1 && (
              <div className="flex-1 h-1 mt-5">
                <div className={`${step.number < currentStep ? "bg-blue-600" : "bg-gray-300"} h-full`}></div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
}

// File Upload
function FileUpload({ fileType, description }) {
  return (
    <div>
      <div className="mt-1 flex justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 pt-8 pb-8">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" viewBox="0 0 24 24">
            <path d="M12 16.5V9.75m0 0l-3 3m3-3l3 3" strokeWidth="1.5" stroke="currentColor" fill="none"/>
            <path d="M12 16.5V9m0 0l-3 3m3-3l3 3M6.75 19.5A4.5 4.5 0 0112 7.5a4.5 4.5 0 015.25 12" strokeWidth="1.5" stroke="currentColor" fill="none"/>
          </svg>

          <label className="relative cursor-pointer rounded-md bg-white font-medium text-blue-600">
            <span>Upload Selected Document</span>
            <input type="file" className="sr-only" />
          </label>

          {description && <p className="text-xs text-gray-500 mt-2">{description}</p>}
          {fileType && <p className="text-xs text-gray-500 mt-2">{fileType}</p>}
        </div>
      </div>
    </div>
  );
}

// MAIN COMPONENT — FIXED AND FUNCTIONAL 🔥
export default function BusinessSignUpPageOne() {
  const navigate = useNavigate();

  const user =
    JSON.parse(localStorage.getItem("user")) ||
    JSON.parse(sessionStorage.getItem("user"));

  const autofillEmail = () => {
    if (user?.email) document.querySelector("#business_email").value = user.email;
  };

  // Autofill account phone
  const autofillPhone = () => {
    const phone = user?.phone; // <-- FIXED
    if (phone) {
      const input = document.querySelector("#business_phone");
      if (input) input.value = phone;
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const form = event.target;

    // Build signup data
    const data = {
      // Basic business info
      business_name: form.business_name.value,
      business_email: form.business_email.value,
      business_phone: form.business_phone.value,

      // Address fields (individual text inputs)
      region: form.region.value,
      province: form.province.value,
      city: form.city.value,
      barangay: form.barangay.value,
      street: form.street.value,
      postal_code: form.postal_code.value,

      // Owner legal name
      reg_first_name: form.reg_first_name.value,
      reg_middle_name: form.reg_middle_name.value,
      reg_last_name: form.reg_last_name.value,

      // Operating hours (new structure)
      days_from: form.days_from.value,
      days_to: form.days_to.value,
      open_time: form.open_time.value,   // time input
      close_time: form.close_time.value, // time input

      // Document type (not actual file yet)
      primary_doc: form.primary_doc.value,
      gov_id: form.gov_id.value,
    };
    if (
      !data.business_name ||
      !data.business_email ||
      !data.business_phone ||
      !data.region ||
      !data.province ||
      !data.city ||
      !data.barangay ||
      !data.street ||
      !data.days_from ||
      !data.days_to ||
      !data.open_time ||
      !data.close_time
    ) {
      alert("Please complete all required fields before continuing.");
      return;
    }


    // Save to localStorage
    localStorage.setItem("businessSignup", JSON.stringify(data));

    // Go to Step 3
    navigate(ROUTES.BUSINESS_SIGNUP.STEP2);
  };


  return (
    <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-6xl mx-auto">
      <Stepper currentStep={2} />

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Business Information</h1>

      <form className="space-y-6" onSubmit={handleSubmit}>

        {/* Business Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Business Name</label>
            <input name="business_name" className="w-full p-3 rounded-lg bg-gray-100 border-gray-300" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Business Email</label>
            <input name="business_email" id="business_email" className="w-full p-3 rounded-lg bg-gray-100 border-gray-300" />
            <div className="mt-2 flex items-center">
              <input type="checkbox" onClick={autofillEmail} />
              <span className="ml-2 text-sm">Use account email</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input name="business_phone" id="business_phone" className="w-full p-3 rounded-lg bg-gray-100 border-gray-300" />
            <div className="mt-2 flex items-center">
              <input type="checkbox" onClick={autofillPhone} />
              <span className="ml-2 text-sm">Use account phone</span>
            </div>
          </div>
        </div>

        {/* Pickup / Shop Address */}
        <div className="pt-6 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pickup / Shop Address</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <input
                type="text"
                name="region"
                placeholder="Region"
                className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm"
              />
              <input
                type="text"
                name="province"
                placeholder="Province"
                className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm"
              />
              <input
                type="text"
                name="city"
                placeholder="City"
                className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm"
              />
              <input
                type="text"
                name="barangay"
                placeholder="Barangay"
                className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm"
              />
              <input
                type="text"
                name="street"
                placeholder="Street / Building"
                className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm"
              />
              <input
                type="text"
                name="postal_code"
                placeholder="Postal Code"
                className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm"
              />
            </div>

            <div className="w-full h-64 bg-gray-200 rounded-lg">
              <img
                src="https://placehold.co/600x400/e5e7eb/9ca3af?text=Map+Placeholder"
                alt="Map Placeholder"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          </div>
        </div>


        {/* Owner Name */}
        <div className="pt-6 border-t border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Individual Registered Name</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input name="reg_first_name" placeholder="First Name" className="w-full p-3 rounded-lg bg-gray-100 border-gray-300" />
            <input name="reg_middle_name" placeholder="Middle Name" className="w-full p-3 rounded-lg bg-gray-100 border-gray-300" />

            <div className="md:col-span-2">
              <input name="reg_last_name" placeholder="Last Name" className="w-full p-3 rounded-lg bg-gray-100 border-gray-300" />
              <p className="text-xs mt-2 text-gray-500">Must match your government ID</p>
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="pt-6 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Operating Hours</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Days in week */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Days in Week
              </label>

              <div className="flex items-center gap-4">
                <select
                  name="days_from"
                  className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm"
                >
                  <option>Sunday</option>
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                  <option>Saturday</option>
                </select>

                <span className="text-gray-600">To</span>

                <select
                  name="days_to"
                  className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm"
                >
                  <option>Sunday</option>
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                  <option>Saturday</option>
                </select>
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Office Hours
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="time"
                  step="60"
                  name="open_time"
                  className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm"
                />

                <span className="text-gray-600">To</span>

                <input
                  type="time"
                  step="60"
                  name="close_time"
                  className="w-full rounded-lg border-gray-300 bg-gray-100 p-3 text-sm"
                />
              </div>
            </div>
          </div>
        </div>


        {/* Required Documents */}
        <div className="pt-6 border-t border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Required Documents</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <select name="primary_doc" className="w-full p-3 rounded-lg bg-gray-100 border-gray-300 mb-4">
                <option>DTI Certificate</option>
                <option>SEC Certificate</option>
              </select>
              <FileUpload fileType="PDF Only" />
              <p className="text-xs text-gray-500 mt-2">
                Documents will be reviewed after registration.
              </p>
            </div>

            <div>
              <select name="gov_id" className="w-full p-3 rounded-lg bg-gray-100 border-gray-300 mb-4">
                <option>PhilID</option>
                <option>Driver’s License</option>
                <option>Passport</option>
              </select>
              <FileUpload description="Upload a clear photo of your ID" />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate(ROUTES.HOME)}
            className="px-6 py-3 rounded-lg bg-white border border-gray-300 shadow-sm"
          >
            Back
          </button>
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700"
          >
            
            Continue
          </button>
        </div>

      </form>
    </div>
  );
}
