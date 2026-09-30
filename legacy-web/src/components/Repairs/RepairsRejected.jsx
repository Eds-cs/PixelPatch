import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

// The Client Repair Rejected Page Component
export default function ClientRepairRejected() {
  const navigate = useNavigate();
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

  return (
    <div className="bg-gray-50 text-gray-900 flex flex-col min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* 1. Header Navigation */}
      <header className="border-b border-gray-200 bg-white w-full flex-shrink-0 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between h-20">
            
            {/* Logo */}
            <div className="flex-shrink-0">
              <a href="#" className="text-2xl font-extrabold text-blue-600">
                PixelPatch
              </a>
            </div>

            {/* Navigation Links (Desktop) */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-6">
                <a href="#" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">Home</a>
                <a href="#" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">AI Assistant</a>
                <a href="#" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">Services</a>
                <a href="#" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">Become a Partner</a>
              </div>
            </div>

            {/* Icons (Desktop) */}
            <div className="hidden md:flex items-center space-x-4">
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              
              {/* Profile Avatar */}
              <div className="relative">
                <button 
                  ref={profileButtonRef}
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center justify-center h-10 w-10 rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors"
                >
                  <span className="sr-only">Open user menu</span>
                  <img className="h-full w-full object-cover" src="https://placehold.co/40x40/e0f2fe/3b82f6?text=U&font=inter" alt="User avatar" />
                </button>
                
                {/* Profile Dropdown */}
                {isProfileOpen && (
                  <div ref={profileDropdownRef} className="absolute right-0 mt-2 w-64 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1" role="none">
                      <div className="flex items-center px-4 py-3 border-b border-gray-200">
                        <img className="h-10 w-10 rounded-full" src="https://placehold.co/40x40/dbeafe/1e40af?text=JD&font=inter" alt="User Avatar" />
                        <div className="ml-3">
                          <p className="text-sm font-semibold text-gray-900">John Doe</p>
                          <p className="text-sm text-gray-500">johndoe@gmail.com</p>
                        </div>
                      </div>
                      <div className="py-1">
                        <a href="#" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100">Profile</a>
                        <a href="#" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100">Repairs</a>
                        <a href="#" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100">Devices</a>
                        <a href="#" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100">AI Assistant</a>
                      </div>
                      <div className="py-1 border-t border-gray-200">
                        <a href="#" className="block px-4 py-3 text-sm text-blue-600 hover:bg-gray-100">Switch to Business</a>
                      </div>
                      <div className="py-1 border-t border-gray-200">
                        <a href="#" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100">Settings</a>
                        <a href="#" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100">Help</a>
                      </div>
                      <div className="py-1 border-t border-gray-200">
                        <a href="#" className="block px-4 py-3 text-sm text-red-600 hover:bg-gray-100">Log Out</a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="-mr-2 flex md:hidden">
              <button className="bg-white inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
                <span className="sr-only">Open main menu</span>
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="flex-grow flex justify-center p-6">
        <div className="w-full max-w-4xl space-y-6">
            
            {/* Rejected Banner */}
            <div className="bg-red-100 border border-red-200 rounded-lg p-4 flex justify-between items-center">
                <p className="text-red-700 font-medium">The shop has declined your request.</p>
                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">Rejected</span>
            </div>

            {/* Request Information Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Request Information</h2>
                    <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Estimates Reply</p>
                        <p className="text-sm font-bold text-gray-900">3-4 Days</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                    <div>
                        <p className="text-lg font-medium text-gray-900">Samsung S25</p>
                    </div>
                    
                    {/* Empty div for spacing in grid if needed, or just rely on flow */}
                    <div className="hidden md:block"></div> 

                    <div>
                        <p className="text-xs text-gray-500 uppercase">Device Type</p>
                        <p className="text-sm font-medium text-gray-900">Smartphone</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase">Pickup Address</p>
                        <p className="text-sm font-medium text-gray-900">112, Normal Road, Baliwasan Zamboanga City</p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500 uppercase">Repair Type</p>
                        <p className="text-sm font-medium text-gray-900">Screen Replacement</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase">Preferred Time</p>
                        <p className="text-sm font-medium text-gray-900">Oct 25, 2025</p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500 uppercase">Service Type</p>
                        <p className="text-sm font-medium text-gray-900">Pickup</p>
                    </div>
                     {/* Empty div for spacing */}
                     <div className="hidden md:block"></div>

                    <div className="md:col-span-2">
                        <p className="text-xs text-gray-500 uppercase">Description</p>
                        <p className="text-sm font-medium text-gray-900">The screen of the phone is broken and it is not turning on.</p>
                    </div>
                </div>
            </div>

            {/* Two Column Section: Shop Info & Reference Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Shop Information */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Shop Information</h3>
                    <div className="space-y-4">
                        <p className="font-semibold text-gray-900">TechFix Pro</p>
                        <div>
                            <p className="text-xs text-gray-500 uppercase">Address</p>
                            <p className="text-sm text-gray-700">5433 Dona Benita Drive, Canelar Zamboanga City</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase">Email</p>
                            <p className="text-sm text-gray-700">techfix@gmail.com</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase">Phone</p>
                            <p className="text-sm text-gray-700">998-505-177</p>
                        </div>
                    </div>
                </div>

                {/* Reference Images */}
                <div className="flex flex-col justify-start">
                    <h3 className="text-lg font-bold text-gray-400 mb-4">Reference Images</h3>
                    <div className="flex gap-4">
                        <img 
                            src="https://placehold.co/100x150/e0f2fe/3b82f6?text=Phone+Front" 
                            alt="Phone Front" 
                            className="w-24 h-32 object-contain border border-gray-200 bg-white rounded-lg p-1" 
                        />
                        <img 
                            src="https://placehold.co/100x150/e0f2fe/3b82f6?text=Phone+Back" 
                            alt="Phone Back" 
                            className="w-24 h-32 object-contain border border-gray-200 bg-white rounded-lg p-1" 
                        />
                    </div>
                </div>
            </div>

            {/* Reason for Rejection */}
            <div className="bg-red-100 rounded-lg p-6 border border-red-200">
                <h3 className="text-lg font-bold text-red-800 mb-2">Reason for Rejection.</h3>
                <p className="text-sm text-red-700">
                    We currently can't provide this service as our technician has no experience about your device.
                </p>
            </div>

            {/* Support Center Banner */}
            <div className="bg-blue-100 p-4 rounded-lg flex items-center justify-between border border-blue-200">
                <p className="text-sm text-blue-800">
                    <span className="font-bold">Support Center</span>
                    <br/>
                    <span className="text-xs">Having Issues with your request? <a href="#" className="underline hover:text-blue-600">Contact Support</a></span>
                </p>
            </div>

            {/* Back Button */}
            <div className="mt-6 flex justify-start">
                <button 
                    onClick={() => navigate(ROUTES.REPAIRS)}
                    className="rounded-lg border border-gray-300 bg-white py-2 px-5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                    ← Back to Repairs
                </button>
            </div>

        </div>
      </main>

      {/* 3. Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 py-16">
            <div className="col-span-2 md:col-span-4 lg:col-span-1">
              <a href="#" className="text-2xl font-extrabold text-blue-600">PixelPatch</a>
              <p className="mt-3 text-sm text-gray-600">Where technology and expertise meet to bring your gadgets back to life.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Quick Links</h3>
              <ul className="mt-4 space-y-3">
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">AI Assistant</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Find Service</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Partner</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Company</h3>
              <ul className="mt-4 space-y-3">
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">About Us</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Career</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Support</h3>
              <ul className="mt-4 space-y-3">
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Help Center</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Connect With Us</h3>
              <ul className="mt-4 space-y-3">
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Facebook</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Instagram</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">X (Twitter)</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 py-6">
            <p className="text-center text-sm text-gray-500">&copy; 2025 PixelPatch Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}