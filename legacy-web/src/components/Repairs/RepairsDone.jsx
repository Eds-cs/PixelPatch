import React from 'react';

// Converted Page Component
function ClientRepairDone() {

  return (
    <div className="bg-gray-50 text-gray-900 flex flex-col min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-grow">
        {/* Status Banner */}
        <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded-lg flex justify-between items-center mb-6">
          <p className="font-medium">Your device is ready for pickup.</p>
          <span className="text-xs font-medium bg-green-200 text-green-900 px-2.5 py-0.5 rounded-full">
            Done
          </span>
        </div>

        {/* Progress Stepper */}
        <div className="w-full mb-8">
          <ol className="flex items-center w-full text-sm font-medium text-center text-gray-500">
            {/* Step 1: Ready (Complete) */}
            <li className="flex md:w-full items-center text-blue-600 after:content-[''] after:w-full after:h-1 after:border-b after:border-blue-600 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10">
              <span className="flex items-center after:content-['/'] sm:after:hidden after:mx-2 after:text-gray-200">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 mr-2.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                Ready
              </span>
            </li>
            {/* Step 2: In Progress (Complete) */}
            <li className="flex md:w-full items-center text-blue-600 after:content-[''] after:w-full after:h-1 after:border-b after:border-blue-600 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10">
              <span className="flex items-center after:content-['/'] sm:after:hidden after:mx-2 after:text-gray-200">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 mr-2.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                In Progress
              </span>
            </li>
            {/* Step 3: Delivery (Complete) */}
            <li className="flex md:w-full items-center text-blue-600 after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-200 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10">
              <span className="flex items-center after:content-['/'] sm:after:hidden after:mx-2 after:text-gray-200">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 mr-2.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                Delivery
              </span>
            </li>
            {/* Step 4: Completed (Next) */}
            <li className="flex items-center">
              <span className="mr-2.5 border-2 border-gray-400 rounded-full p-0.5">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </span>
              Completed
            </li>
          </ol>
        </div>

        {/* Main Content Area */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          {/* Request Information */}
          <div className="relative pb-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Request Information</h2>
            <div className="absolute top-0 right-0 text-right">
              <p className="text-xs text-gray-500">Estimates Reply</p>
              <p className="text-sm font-semibold text-gray-900">3-4 Days</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <span className="text-gray-500">Device</span>
                <p className="font-medium text-gray-800">Samsung S25</p>
              </div>
              <div>
                <span className="text-gray-500">Pickup Address</span>
                <p className="font-medium text-gray-800">112, Normal Road, Baliwasan Zamboanga City</p>
              </div>
              <div>
                <span className="text-gray-500">Device Type</span>
                <p className="font-medium text-gray-800">Smartphone</p>
              </div>
              <div>
                <span className="text-gray-500">Preferred Time</span>
                <p className="font-medium text-gray-800">Oct 25, 2025</p>
              </div>
              <div>
                <span className="text-gray-500">Repair Type</span>
                <p className="font-medium text-gray-800">Screen Replacement</p>
              </div>
              <div>
                <span className="text-gray-500">Service Type</span>
                <p className="font-medium text-gray-800">Pickup</p>
              </div>
              <div className="md:col-span-2">
                <span className="text-gray-500">Description</span>
                <p className="font-medium text-gray-800">The screen of the phone is broken and it is not turning on.</p>
              </div>
            </div>
          </div>

          {/* Shop Info & Reference Images */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-b border-gray-200 pb-6">
            {/* Shop Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Shop Information</h2>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                <h3 className="font-semibold text-gray-900">TechFix Pro</h3>
                <div className="text-sm">
                  <span className="text-gray-500">Address</span>
                  <p className="font-medium text-gray-800">5433 Dona Benita Drive, Canelar Zamboanga City</p>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Email</span>
                  <p className="font-medium text-gray-800">techfix@gmail.com</p>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Phone</span>
                  <p className="font-medium text-gray-800">998-505-177</p>
                </div>
              </div>
            </div>

            {/* Reference Images */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Reference Images</h2>
              <div className="flex flex-wrap gap-4">
                <img
                  src="https://placehold.co/150x150/e0f2fe/3b82f6?text=Phone+Front"
                  alt="Phone Front"
                  className="w-24 h-24 rounded-lg object-contain border border-gray-200 bg-white p-1"
                />
                <img
                  src="https://placehold.co/150x150/e0f2fe/3b82f6?text=Phone+Back"
                  alt="Phone Back"
                  className="w-24 h-24 rounded-lg object-contain border border-gray-200 bg-white p-1"
                />
              </div>
            </div>
          </div>

          {/* Assessment & Quotation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-b border-gray-200 pb-6">
            {/* Assessment */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Assessment</h2>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Device Condition</span>
                  <p className="font-medium text-gray-800">Not Good.</p>
                </div>
                <div>
                  <span className="text-gray-500">Observed Issues</span>
                  <p className="font-medium text-gray-800">The phone might have internal problems.</p>
                </div>
                <div>
                  <span className="text-gray-500">Recommendation Summary</span>
                  <p className="font-medium text-gray-800">Overall it can be done.</p>
                </div>
                <div>
                  <span className="text-gray-500">References</span>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <img
                      src="https://placehold.co/150x150/e0f2fe/3b82f6?text=Ref+1"
                      alt="Reference 1"
                      className="w-24 h-24 rounded-lg object-contain border border-gray-200 bg-white p-1"
                    />
                    <img
                      src="https://placehold.co/150x150/e0f2fe/3b82f6?text=Ref+2"
                      alt="Reference 2"
                      className="w-24 h-24 rounded-lg object-contain border border-gray-200 bg-white p-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quotation */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quotation</h2>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Labor Fee:</span>
                  <span className="font-medium text-gray-800">500.00 PHP</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <span className="text-gray-600">Parts Cost:</span>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-gray-500 pl-2">Samsung S25 Screen</span>
                    <span className="font-medium text-gray-800">4,500.00 PHP</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-gray-500 pl-2">Samsung Front Camera</span>
                    <span className="font-medium text-gray-800">2,000.00 PHP</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-base">
                    <span className="font-semibold text-gray-900">Total Estimate:</span>
                    <span className="font-bold text-blue-600">7,000.00 PHP</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Completion Time:</span>
                    <span className="font-medium text-gray-800">5 days</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Warranty Coverage:</span>
                    <span className="font-medium text-gray-800">6 Months</span>
                  </div>
                </div>
                <a href="#" className="text-blue-600 hover:underline text-xs pt-2 inline-block">
                  More...
                </a>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="grid grid-cols-1 pt-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Transaction Details</h2>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div>
                    <span className="text-gray-500">Paid by:</span>
                    <p className="font-medium text-gray-800">GCash</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Address:</span>
                    <p className="font-medium text-gray-800">112, Normal Road, Baliwasan Zamboanga City</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Invoice:</span>
                    <a href="#" className="font-medium text-blue-600 hover:underline">
                      View &gt;
                    </a>
                  </div>
                  <div>
                    <span className="text-gray-500">Contact:</span>
                    <p className="font-medium text-gray-800">+63 9875567412</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Request Time:</span>
                    <p className="font-medium text-gray-800">10-20-2025 09:18</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Payment Time:</span>
                    <p className="font-medium text-gray-800">10-22-2025 10:41</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Support Center Banner */}
        <div className="mt-6 bg-blue-100 p-4 rounded-lg flex items-center justify-between">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Support Center:</span>
            Having issues with your request?{' '}
            <a href="#" className="font-medium underline hover:text-blue-600">
              Contact Support
            </a>
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
            <button className="rounded-lg border border-gray-300 bg-white py-2 px-5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                Request Refund
            </button>
            <button className="rounded-lg border border-transparent bg-blue-600 py-2 px-5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                Mark as Complete
            </button>
        </div>

      </main>
    </div>
  );
}

export default ClientRepairDone;