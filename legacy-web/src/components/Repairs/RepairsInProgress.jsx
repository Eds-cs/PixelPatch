import React from 'react';

// Converted Page Component
function ClientRepairInProgress() {

  return (
    <div className="bg-gray-50 text-gray-900 flex flex-col min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-grow">
        {/* Status Banner */}
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg flex justify-between items-center mb-6">
          <p className="font-medium">Your device has started repair.</p>
          <span className="text-xs font-medium bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full">
            In Progress
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
            {/* Step 2: In Progress (Active) */}
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
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                In Progress
              </span>
            </li>
            {/* Step 3: Delivery (Future) */}
            <li className="flex md:w-full items-center after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-200 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10">
              <span className="flex items-center after:content-['/'] sm:after:hidden after:mx-2 after:text-gray-200">
                <span className="mr-2.5 border-2 border-gray-400 rounded-full p-0.5">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M8 16.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM15 16.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"></path>
                    <path
                      fillRule="evenodd"
                      d="M12 2a1 1 0 011 1v2.345l.16.03a.5.5 0 01.363.65l-1.16 3.48A3 3 0 0110.02 11H5V7H3.5a1 1 0 01-1-1V3.5a1 1 0 011-1H12zm1 4.345V3H4.5v2.5H5v1.517l-1.381 4.143a1 1 0 00.961 1.34h2.44a1 1 0 01.96 1.339L7 16.5h-1.5a.5.5 0 000 1H8a.5.5 0 000-1H7.5a1 1 0 01-1-1V12h2.02a3 3 0 012.34-1.63l1.16-3.48.16-.03zM15.5 7H14v6.5a.5.5 0 000 1H15a.5.5 0 000-1H14.5a1 1 0 01-1-1V7h2V3.5a1 1 0 00-1-1h-1.5a1 1 0 00-1 1V7h3.5A1.5 1.5 0 0117 8.5v3.5a1.5 1.5 0 01-1.5 1.5h-2.5a.5.5 0 000 1h2.5a2.5 2.5 0 002.5-2.5V8.5A2.5 2.5 0 0015.5 6z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </span>
                Delivery
              </span>
            </li>
            {/* Step 4: Completed (Future) */}
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

        {/* No Action Buttons for In Progress */}
      </main>
    </div>
  );
}

export default ClientRepairInProgress;