import React, { useState, useRef, useEffect } from 'react';

// Main App component for preview
export default function App() {
  return <ShopReviews />;
}

// The Shop Reviews Component
function ShopReviews() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const profileButtonRef = useRef(null);
  const profileDropdownRef = useRef(null);

  // Handle profile dropdown toggle
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target) &&
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Sample review data
  const reviews = [
    {
      id: 1,
      username: 'username_098',
      avatar: 'https://placehold.co/40x40/dbeafe/1e40af?text=U&font=inter',
      rating: 5,
      time: '1 Month Ago',
      device: 'Vivo 30 E',
      comment: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam excepturi eos a sit amet consectetur adipisicing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor.',
      likes: 23,
    },
    {
      id: 2,
      username: 'username_098',
      avatar: 'https://placehold.co/40x40/dbeafe/1e40af?text=U&font=inter',
      rating: 5,
      time: '3 Weeks Ago',
      device: 'Oppo Reno 5',
      comment: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor.',
      likes: 20,
    },
    {
      id: 3,
      username: 'username_098',
      avatar: 'https://placehold.co/40x40/dbeafe/1e40af?text=U&font=inter',
      rating: 3,
      time: '2 Months Ago',
      device: 'Infinix Hot 30',
      comment: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor.',
      likes: 12,
    },
  ];
  
  // Star rating component
  const StarRating = ({ rating }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          className={`h-4 w-4 ${i <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.868 5.748a1 1 0 00.95.69h6.03c.969 0 1.371 1.24.588 1.81l-4.88 3.54a1 1 0 00-.364 1.118l1.868 5.748c.3.921-.755 1.688-1.54 1.118l-4.88-3.54a1 1 0 00-1.175 0l-4.88 3.54c-.784.57-1.838-.197-1.54-1.118l1.868-5.748a1 1 0 00-.364-1.118L2.48 11.175c-.783-.57-.38-1.81.588-1.81h6.03a1 1 0 00.95-.69l1.868-5.748z" />
        </svg>
      );
    }
    return <div className="flex items-center">{stars}</div>;
  };

  return (
    <div className="flex min-h-screen bg-gray-100 font-inter">
      {/* 1. Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="py-6 px-4">
          <a href="#" className="text-2xl font-extrabold text-blue-600 px-2">
            PixelPatch
          </a>
          <nav className="mt-8 space-y-2">
            {/* Dashboard Link */}
            <a href="#" className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
              </svg>
              <span className="ml-3 text-sm font-medium">Dashboard</span>
            </a>
            
            <span className="block px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Request</span>
            
            {/* Repair Link */}
            <a href="#" className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="ml-3 text-sm font-medium">Repair</span>
            </a>
            
            {/* Services Link */}
            <a href="#" className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
              </svg>
              <span className="ml-3 text-sm font-medium">Services</span>
            </a>
            
            {/* Discounts Link */}
            <a href="#" className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-5.25 0h3m-3 0h-3m2.25-4.125c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v.375c0 1.036-.84 1.875-1.875 1.875h-.375C8.34 14.625 7.5 13.785 7.5 12.75v-.375zm-3.75 0c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v.375c0 1.036-.84 1.875-1.875 1.875h-.375C4.34 14.625 3.5 13.785 3.5 12.75v-.375z" />
              </svg>
              <span className="ml-3 text-sm font-medium">Discounts</span>
            </a>
            
            {/* Reviews Link (Active) */}
            <a href="#" className="flex items-center px-3 py-2.5 bg-blue-50 text-blue-600 rounded-lg transition-colors">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.31h5.518a.562.562 0 01.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-3.882a.563.563 0 00-.652 0L3.18 19.673a.563.563 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988h5.518a.563.563 0 00.475-.31L11.48 3.5z" />
              </svg>
              <span className="ml-3 text-sm font-medium">Reviews</span>
            </a>

            <span className="block px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Settings</span>
            
            {/* Settings Link */}
            <a href="#" className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456c.476-.178.986.098 1.103.557l.955 2.599c.117.459-.169.932-.615.986l-1.15.213c-.33.061-.6.312-.766.598a3.689 3.689 0 010 1.003c.166.286.436.537.766.598l1.15.213c.446.054.732.527.615.986l-.955 2.599a.562.562 0 01-1.103.557l-1.217-.456c-.354-.133-.75-.072-1.075.124a6.57 6.57 0 01-.22.127c-.332.183-.582.495-.645.87l-.213 1.28c-.09.543-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456c-.476.178-.986-.098-1.103-.557l-.955-2.599c-.117-.459.169.932.615.986l1.15-.213c.33-.061.6-.312.766-.598a3.689 3.689 0 010-1.003c-.166-.286-.436-.537-.766-.598l-1.15-.213c-.446-.054-.732.527-.615.986l.955-2.599a.562.562 0 011.103-.557l1.217.456c.354.133.75.072 1.075-.124a6.57 6.57 0 01.22-.127c.332-.183.582-.495-.645-.87l.213-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="ml-3 text-sm font-medium">Settings</span>
            </a>
            
            {/* Help Link */}
            <a href="#" className="flex items-center px-3 py-2.5 text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
              <span className="ml-3 text-sm font-medium">Help</span>
            </a>
          </nav>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col">
        
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 p-4 h-20 flex-shrink-0">
          <div className="flex justify-end items-center h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4">
              <button className="text-gray-500 hover:text-blue-600 rounded-full p-2 transition-colors" aria-label="Notifications">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </button>
              <button className="text-gray-500 hover:text-blue-600 rounded-full p-2 transition-colors" aria-label="Messages">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76v-1.503c0-.858.694-1.553 1.553-1.553h.002c.859 0 1.554.695 1.554 1.553v1.503A1.553 1.553 0 013.805 14.313H3.803A1.553 1.553 0 012.25 12.76zm3.003-1.503v1.503c0 .858.695 1.553 1.553 1.553h.002c.859 0 1.554-.695 1.554-1.553v-1.503c0-.858-.695-1.553-1.554-1.553h-.002a1.553 1.553 0 00-1.553 1.553zm3.004v1.503c0 .858.695 1.553 1.553 1.553h.002c.859 0 1.554-.695 1.554-1.553v-1.503c0-.858-.695-1.553-1.554-1.553h-.002a1.553 1.553 0 00-1.553 1.553zm10.493-1.553h-.002a1.553 1.553 0 00-1.553 1.553v1.503c0 .858.694 1.553 1.553 1.553h.002c.859 0 1.553-.695 1.553-1.553v-1.503c0-.858-.694-1.553-1.553-1.553zM9.75 12c0-.858.695-1.553 1.554-1.553h.002c.859 0 1.553.695 1.553 1.553v1.503c0 .858-.694 1.553-1.553 1.553h-.002c-.859 0-1.554-.695-1.554-1.553V12zm3.003 0v1.503c0 .858.695 1.553 1.553 1.553h.002c.859 0 1.554-.695 1.554-1.553V12c0-.858-.695-1.553-1.554-1.553h-.002a1.553 1.553 0 00-1.553 1.553z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 19.5v2.25c0 .621.504 1.125 1.125 1.125h.375c.621 0 1.125-.504 1.125-1.125V19.5m-3.375 0v2.25c0 .621.504 1.125 1.125 1.125h.375c.621 0 1.125-.504 1.125-1.125V19.5m-3.375 0h3.375m-3.375 0v-1.5c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v1.5m-3.375 0h3.375M9 19.5v2.25c0 .621.504 1.125 1.125 1.125h.375c.621 0 1.125-.504 1.125-1.125V19.5m-3.375 0v2.25c0 .621.504 1.125 1.125 1.125h.375c.621 0 1.125-.504 1.125-1.125V19.5m-3.375 0h3.375m-3.375 0v-1.5c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v1.5m-3.375 0h3.375M4.5 19.5v2.25c0 .621.504 1.125 1.125 1.125h.375c.621 0 1.125-.504 1.125-1.125V19.5m-3.375 0v2.25c0 .621.504 1.125 1.125 1.125h.375c.621 0 1.125-.504 1.125-1.125V19.5m-3.375 0h3.375m-3.375 0v-1.5c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v1.5m-3.375 0h3.375" />
                </svg>
              </button>
              
              {/* Profile Avatar & Dropdown */}
              <div className="relative">
                <button
                  ref={profileButtonRef}
                  onClick={toggleDropdown}
                  className="flex items-center justify-center h-10 w-10 rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors"
                  aria-label="Open user menu"
                >
                  <img className="h-full w-full object-cover" src="https://placehold.co/40x40/e0f2fe/3b82f6?text=U&font=inter" alt="User avatar" />
                </button>
                
                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div
                    ref={profileDropdownRef}
                    className="absolute right-0 mt-2 w-64 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                  >
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
                      </div>
                      <div className="py-1 border-t border-gray-200">
                        <a href="#" className="block px-4 py-3 text-sm text-red-600 hover:bg-gray-100">Log Out</a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Contents dito */}
        <main className="p-8 flex-grow overflow-y-auto">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Reviews and Ratings</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-700 mb-6">
            <span>Average Rating: <span className="font-medium text-gray-900">4.5/5</span></span>
            <span className="text-gray-300">|</span>
            <span>Reports: <span className="font-medium text-gray-900">2</span></span>
            <button className="flex items-center text-blue-600 font-medium hover:underline">
              View
              <svg className="h-4 w-4 ml-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </button>
            <span className="text-gray-300">|</span>
            <span>Total Reviews: <span className="font-medium text-gray-900">24</span></span>
          </div>
          
          {/* Customer Reviews Cards nila */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Customer Reviews</h2>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <button className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm">
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  All
                </button>
                <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Smartphone <span className="text-gray-500 ml-1">12</span>
                </button>
                <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Laptop <span className="text-gray-500 ml-1">8</span>
                </button>
                <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Tablet <span className="text-gray-500 ml-1">4</span>
                </button>
                <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  +2
                </button>
              </div>
            </div>
            
            {/* Reviews List part */}
            <div className="divide-y divide-gray-200">
              {reviews.map((review) => (
                <div key={review.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img className="h-10 w-10 rounded-full" src={review.avatar} alt="User avatar" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{review.username}</p>
                        <p className="text-xs text-gray-500">Device: {review.device}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <StarRating rating={review.rating} />
                        <span className="ml-1 text-gray-700 font-medium">{review.rating}.0</span>
                        <span className="text-gray-400 mx-1">|</span>
                        <span>{review.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span>{review.likes}</span>
                        <button className="text-gray-500 hover:text-blue-600">
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.42 2.031-1.087C9.66 8.78 10.79 8 12 8c1.209 0 2.34.78 2.936 1.413C15.536 10.08 16.264 10.5 17.07 10.5c.806 0 1.533-.42 2.031-1.087C20.14 8.78 21.27 8 22.5 8c.138 0 .273.006.406.017l-3.23 6.46a.75.75 0 01-1.353.027l-.62-1.239a.75.75 0 00-1.352-.027l-.62 1.239a.75.75 0 01-1.353.027L12 11.758v3.272a.75.75 0 01-1.5 0V11.758l-1.339 2.678a.75.75 0 01-1.353-.027l-.62-1.239a.75.75 0 00-1.352-.027l-.62 1.239a.75.75 0 01-1.353.027L1.094 8.017A.75.75 0 011.5 8c1.209 0 2.34.78 2.936 1.413C5.036 10.08 5.764 10.5 6.633 10.5zM3.75 15a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H3.75z" />
                          </svg>
                        </button>
                      </div>
                      <button className="text-gray-500 hover:text-gray-700">
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-700 leading-relaxed">
                    {review.comment}
                  </p>
                </div>
              ))}
            </div>
            
            {/* Pages part to */}
            <div className="p-4 border-t border-gray-200 flex justify-between items-center text-sm">
              <button className="text-gray-700 hover:text-blue-600 font-medium">Previous</button>
              <div className="flex gap-2">
                <button className="text-blue-600 font-medium">1</button>
                <button className="text-gray-700 hover:text-blue-600">2</button>
                <button className="text-gray-700 hover:text-blue-600">3</button>
              </div>
              <button className="text-gray-700 hover:text-blue-600 font-medium">Next</button>
            </div>
            
          </div>
          
        </main>
      </div>
    </div>
  );
}