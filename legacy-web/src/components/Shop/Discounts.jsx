import React, { useState, useEffect, useRef } from 'react';

// Main component to render the page
export default function App() {
  return <ShopDiscounts />;
}

// The Shop Discounts Page Component
function ShopDiscounts() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileButtonRef = useRef(null);
  const profileDropdownRef = useRef(null);

  // Effect to handle clicking outside the dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isProfileOpen &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target) &&
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target)
      ) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isProfileOpen]);

  // Mock data for the discounts table
  const discounts = [
    { code: 'OCTFEST2025', status: 'Active', type: 'Percentage', value: '10', validUntil: 'Nov 1, 2025' },
    { code: 'OCTFEST2025', status: 'Active', type: 'Percentage', value: '10', validUntil: 'Nov 1, 2025' },
    { code: 'OCTFEST2025', status: 'Active', type: 'Percentage', value: '10', validUntil: 'Nov 1, 2025' },
    { code: 'OCTFEST2025', status: 'Active', type: 'Percentage', value: '10', validUntil: 'Nov 1, 2025' },
    { code: 'OCTFEST2025', status: 'Active', type: 'Percentage', value: '10', validUntil: 'Nov 1, 2025' },
    { code: 'OCTFEST2025', status: 'Active', type: 'Percentage', value: '10', validUntil: 'Nov 1, 2025' },
    { code: 'OCTFEST2025', status: 'Active', type: 'Percentage', value: '10', validUntil: 'Nov 1, 2025' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* 1. Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="py-6 px-4">
          {/* Logo */}
          <a href="#" className="text-2xl font-extrabold text-blue-600 px-2">
            PixelPatch
          </a>
          
          {/* Navigation */}
          <nav className="mt-8 space-y-2">
            <a href="#" className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" /></svg>
              <span className="ml-3 text-sm font-medium">Dashboard</span>
            </a>
            
            <span className="block px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Request</span>
            
            <a href="#" className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="ml-3 text-sm font-medium">Repair</span>
            </a>
            
            <a href="#" className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" /></svg>
              <span className="ml-3 text-sm font-medium">Services</span>
            </a>
            
            <a href="#" className="flex items-center px-3 py-2.5 bg-blue-50 text-blue-600 rounded-lg transition-colors">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-5.25 0h3m-3 0h-3m2.25-4.125c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v.375c0 1.036-.84 1.875-1.875 1.875h-.375C8.34 14.625 7.5 13.785 7.5 12.75v-.375zm-3.75 0c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v.375c0 1.036-.84 1.875-1.875 1.875h-.375C4.34 14.625 3.5 13.785 3.5 12.75v-.375z" /></svg>
              <span className="ml-3 text-sm font-medium">Discounts</span>
            </a>
            
            <a href="#" className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.31h5.518a.562.562 0 01.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-3.882a.563.563 0 00-.652 0L3.18 19.673a.563.563 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988h5.518a.563.563 0 00.475-.31L11.48 3.5z" /></svg>
              <span className="ml-3 text-sm font-medium">Reviews</span>
            </a>

            <span className="block px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Settings</span>

            <a href="#" className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456c.476-.178.986.098 1.103.557l.955 2.599c.117.459-.169.932-.615.986l-1.15.213c-.33.061-.6.312-.766.598a3.689 3.689 0 010 1.003c.166.286.436.537.766.598l1.15.213c.446.054.732.527.615.986l-.955 2.599a.562.562 0 01-1.103.557l-1.217-.456c-.354-.133-.75-.072-1.075.124a6.57 6.57 0 01-.22.127c-.332.183-.582.495-.645.87l-.213 1.28c-.09.543-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456c-.476.178-.986-.098-1.103-.557l-.955-2.599c-.117-.459.169-.932.615.986l1.15-.213c.33-.061.6-.312.766-.598a3.689 3.689 0 010-1.003c-.166-.286-.436-.537-.766-.598l-1.15-.213c-.446-.054-.732-.527-.615-.986l.955-2.599a.562.562 0 011.103-.557l1.217.456c.354.133.75.072 1.075-.124a6.57 6.57 0 01.22-.127c.332-.183.582-.495.645-.87l.213-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="ml-3 text-sm font-medium">Settings</span>
            </a>
            
            <a href="#" className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
              <span className="ml-3 text-sm font-medium">Help</span>
            </a>
          </nav>
        </div>
      </aside>

      {/* 2. Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-4 h-20 flex-shrink-0">
          <div className="flex justify-end items-center h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4">
              {/* Notification Icon */}
              <button className="text-gray-500 hover:text-blue-600 rounded-full p-2 transition-colors">
                <span className="sr-only">Notifications</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </button>
              {/* Chat Icon */}
              <button className="text-gray-500 hover:text-blue-600 rounded-full p-2 transition-colors">
                <span className="sr-only">Messages</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76v-1.503c0-.858.694-1.553 1.553-1.553h.002c.859 0 1.554.695 1.554 1.553v1.503A1.553 1.553 0 013.805 14.313H3.803A1.553 1.553 0 012.25 12.76zm3.003-1.503v1.503c0 .858.695 1.553 1.553 1.553h.002c.859 0 1.554-.695 1.554-1.553v-1.503c0-.858-.695-1.553-1.554-1.553h-.002a1.553 1.553 0 00-1.553 1.553zm3.004v1.503c0 .858.695 1.553 1.553 1.553h.002c.859 0 1.554-.695 1.554-1.553v-1.503c0-.858-.695-1.553-1.554-1.553h-.002a1.553 1.553 0 00-1.553 1.553zm10.493-1.553h-.002a1.553 1.553 0 00-1.553 1.553v1.503c0 .858.694 1.553 1.553 1.553h.002c.859 0 1.553-.695 1.553-1.553v-1.503c0-.858-.694-1.553-1.553-1.553zM9.75 12c0-.858.695-1.553 1.554-1.553h.002c.859 0 1.553.695 1.553 1.553v1.503c0 .858-.694 1.553-1.553 1.553h-.002c-.859 0-1.554-.695-1.554-1.553V12zm3.003 0v1.503c0 .858.695 1.553 1.553 1.553h.002c.859 0 1.554-.695 1.554-1.553V12c0-.858-.695-1.553-1.554-1.553h-.002a1.553 1.553 0 00-1.553 1.553z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 19.5v2.25c0 .621.504 1.125 1.125 1.125h.375c.621 0 1.125-.504 1.125-1.125V19.5m-3.375 0v2.25c0 .621.504 1.125 1.125 1.125h.375c.621 0 1.125-.504 1.125-1.125V19.5m-3.375 0h3.375m-3.375 0v-1.5c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v1.5m-3.375 0h3.375M9 19.5v2.25c0 .621.504 1.125 1.125 1.125h.375c.621 0 1.125-.504 1.125-1.125V19.5m-3.375 0v2.25c0 .621.504 1.125 1.125 1.125h.375c.621 0 1.125-.504 1.125-1.125V19.5m-3.375 0h3.375m-3.375 0v-1.5c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v1.5m-3.375 0h3.375M4.5 19.5v2.25c0 .621.504 1.125 1.125 1.125h.375c.621 0 1.125-.504 1.125-1.125V19.5m-3.375 0v2.25c0 .621.504 1.125 1.125 1.125h.375c.621 0 1.125-.504 1.125-1.125V19.5m-3.375 0h3.375m-3.375 0v-1.5c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v1.5m-3.375 0h3.375" />
                </svg>
              </button>
              {/* Profile Avatar */}
              <div className="relative">
                <button ref={profileButtonRef} onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center justify-center h-10 w-10 rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors">
                  <span className="sr-only">Open user menu</span>
                  <img className="h-full w-full object-cover" src="https://placehold.co/40x40/e0f2fe/3b82f6?text=U&font=inter" alt="User avatar" />
                </button>
                {/* Profile Dropdown */}
                <div ref={profileDropdownRef} className={`${isProfileOpen ? 'block' : 'hidden'} absolute right-0 mt-2 w-64 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50`}>
                  <div className="py-1" role="none">
                    <div className="flex items-center px-4 py-3 border-b border-gray-200">
                      <img className="h-10 w-10 rounded-full" src="https://placehold.co/40x40/dbeafe/1e40af?text=JD&font=inter" alt="User Avatar" />
                      <div className="ml-3">
                        <p className="text-sm font-semibold text-gray-900">John Doe</p>
                        <p className="text-sm text-gray-500">johndoe@gmail.com</p>
                      </div>
                    </div>
                    <div className="py-1"><a href="#" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100">Profile</a><a href="#" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100">Settings</a><a href="#" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100">Help</a></div>
                    <div className="py-1 border-t border-gray-200"><a href="#" className="block px-4 py-3 text-sm text-red-600 hover:bg-gray-100">Log Out</a></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8 flex-grow overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Discounts</h1>
            <button className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Add Discount
            </button>
          </div>

          {/* Discounts Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Until</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {discounts.map((discount, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{discount.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="text-xs font-medium bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full">
                        {discount.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{discount.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{discount.value}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{discount.validUntil}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">Edit</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}