import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

// The Payment Details Modal Component
function ClientPaymentDetailsModal({ onClose }) {
  const navigate = useNavigate();
  
  // If onClose is not provided (when used as a route), navigate back
  const handleClose = onClose || (() => navigate(-1));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={handleClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Header (Optional, usually modals have a close button top right) */}
        <button 
          onClick={handleClose}
          className="bg-white absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 z-10 border=[5px] border-gray-500"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Request a Repair Service</h2>
              
              {/* Device Type */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Device Type</label>
                <div className="relative">
                  <select className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 pr-10 text-sm focus:border-blue-500 focus:ring-blue-500 appearance-none text-gray-500">
                    <option>Smartphone</option>
                    <option>Laptop</option>
                    <option>Tablet</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </div>
                </div>
              </div>

              {/* Repair Type */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Repair Type</label>
                <div className="relative">
                  <select className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 pr-10 text-sm focus:border-blue-500 focus:ring-blue-500 appearance-none text-gray-500">
                    <option>Screen Replacement</option>
                    <option>Battery Replacement</option>
                    <option>Water Damage</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </div>
                </div>
              </div>

              {/* Problem Description */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Problem Description</label>
                <textarea 
                  rows="4" 
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm focus:border-blue-500 focus:ring-blue-500 placeholder-gray-400"
                  placeholder="Describe your device's problem"
                ></textarea>
              </div>

              {/* Contact Info Header */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Contact Info and Address</h3>
                <p className="text-sm text-gray-500">Please make sure your contact information and address are up to date.</p>
              </div>

              {/* Service Type */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Service Type</label>
                <div className="relative">
                  <select className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 pr-10 text-sm focus:border-blue-500 focus:ring-blue-500 appearance-none text-gray-500">
                    <option>Pickup</option>
                    <option>Drop-off</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </div>
                </div>
              </div>

              {/* Pickup / Shop Address Fields */}
              <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Pickup / Shop Address</label>
                    <input type="text" placeholder="Full Name" className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm focus:border-blue-500 focus:ring-blue-500 placeholder-gray-400" />
                </div>
                
                <div className="relative">
                    <select className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 pr-10 text-sm focus:border-blue-500 focus:ring-blue-500 appearance-none text-gray-400">
                        <option>Region, Province, City, Barangay</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                </div>

                <input type="text" placeholder="Postal Code" className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm focus:border-blue-500 focus:ring-blue-500 placeholder-gray-400" />

                <div className="relative">
                    <select className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 pr-10 text-sm focus:border-blue-500 focus:ring-blue-500 appearance-none text-gray-400">
                        <option>Street Name, Building</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                </div>
              </div>

              {/* Estimated Payment Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h4 className="text-blue-700 font-semibold text-base">Estimated Payment</h4>
                <p className="text-xs text-gray-600 mt-1 mb-3">
                    This is only an estimation without the labor fee included and does not reflect the true value of the request.
                </p>
                <div className="text-gray-900 font-bold text-lg">Price: 800.00 PHP</div>
                <div className="text-gray-900 font-bold text-lg">Timeframe: 3-4 Business Days</div>
              </div>

               {/* Checkbox */}
               <div className="flex items-start mt-4">
                  <input id="terms" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                  <label htmlFor="terms" className="ml-2 text-sm text-gray-500">
                      I confirm that I have read and agree to the <a href="#" className="text-blue-600 hover:underline font-medium">Terms and Conditions</a>.
                  </label>
              </div>

            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Device Information</h2>

              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Brand</label>
                <input 
                    type="text" 
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm focus:border-blue-500 focus:ring-blue-500 text-gray-500"
                    defaultValue="Samsung"
                />
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Model</label>
                <input 
                    type="text" 
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm focus:border-blue-500 focus:ring-blue-500 text-gray-500"
                    defaultValue="S25"
                />
                <a href="#" className="text-sm text-blue-600 hover:text-blue-500 mt-1 inline-block">Add device</a>
              </div>

              {/* Upload Photos */}
              <div>
                <label className="block text-lg font-medium text-gray-900 mb-2">Upload Photos (optional)</label>
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 hover:bg-gray-50 transition-colors cursor-pointer">
                    <svg className="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <div className="text-center">
                        <p className="text-sm text-blue-600 font-medium">Click to upload <span className="text-gray-600 font-normal">or drag and drop</span></p>
                        <p className="text-xs text-gray-400 mt-1">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                    </div>
                </div>
              </div>

              {/* Preferred Date and Time */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Preferred Date and Time</label>
                <div className="relative">
                    {/* Using text input to simulate the dropdown look from image, in real app use datepicker */}
                    <div className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm text-gray-500 flex justify-between items-center">
                        <span>10/20/2025</span>
                        <svg className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Location</label>
                <div className="rounded-lg overflow-hidden border border-gray-300 h-56">
                    <img 
                        src="https://placehold.co/600x400/e5e7eb/9ca3af?text=Map+Placeholder&font=inter" 
                        alt="Map Location" 
                        className="w-full h-full object-cover"
                    />
                </div>
              </div>

            </div>

          </div>

          {/* Action Buttons (added for completeness) */}
          <div className="mt-10 flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
            <button onClick={handleClose} className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                Cancel
            </button>
            <button className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm">
                Submit Request
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ClientPaymentDetailsModal;