import React, { useState } from 'react';

// Main App component for previewing the modal
export default function App() {
  return (
    <div className="bg-gray-200 p-10 relative min-h-screen">
      {/* The modal is shown by default for this preview file */}
      <ShopDiscountModal onClose={() => console.log('Close modal')} />
    </div>
  );
}

// The Discount Modal Component
export function ShopDiscountModal({ onClose }) {
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [code, setCode] = useState('OCTFEST2025');
  const [value, setValue] = useState('10');
  const [validUntil, setValidUntil] = useState(''); // Set to empty for placeholder

  return (
    // Modal Overlay
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      
      {/* Modal Panel */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
window.location.replace("/dashboard-ai")
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create Custom Vouchers</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* Code */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Code
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border-gray-200 bg-gray-100 p-3 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          {/* Discount Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDiscountType('percentage')}
                className={`rounded-lg p-4 text-center transition-colors ${
                  discountType === 'percentage'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="block font-medium">Percentage</span>
                <span className="text-sm">(eg. 10% off)</span>
              </button>
              <button
                onClick={() => setDiscountType('fixed')}
                className={`rounded-lg p-4 text-center transition-colors ${
                  discountType === 'fixed'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="block font-medium">Fixed Amount</span>
                <span className="text-sm">(eg. 100 Off)</span>
              </button>
            </div>
            <p className="text-sm text-green-600 mt-2">
              Choose the type of discount you want to apply.
            </p>
          </div>
          
          {/* Discount Value */}
          <div>
            <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
              Discount Value
            </label>
            <input
              type="text"
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-lg border-gray-200 bg-gray-100 p-3 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          {/* Valid Until */}
          <div>
            <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700 mb-1">
              Valid Until
            </label>
            <input
              type="text"
              id="validUntil"
              placeholder="MM/DD/YY"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full rounded-lg border-gray-200 bg-gray-100 p-3 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
        </div>
        
        {/* Modal Footer */}
        <div className="flex justify-end p-6 bg-gray-50 border-t border-gray-200">
          <button
            type="submit"
            className="rounded-lg border border-transparent bg-gray-800 py-2 px-6 text-base font-medium text-white shadow-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2"
            style={{ backgroundColor: '#1A3636' }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}