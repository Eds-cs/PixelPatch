import { Link, useNavigate } from 'react-router-dom';

const ProfileDropdown = ({ isOpen }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogout = () => {
    // Clear all auth data
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    // Redirect to home
    navigate("/");
    window.location.reload(); // to refresh header state
  };

  return (
    <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
      <div className="py-1" role="none">

        {/* User Info */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <img className="h-10 w-10 rounded-full" src="https://placehold.co/40x40/dbeafe/1e40af?text=JD&font=inter" alt="User Avatar" />
          <div className="ml-3">
            <p className="text-sm font-semibold text-gray-900">John Doe</p>
            <p className="text-sm text-gray-500">johndoe@gmail.com</p>
          </div>
        </div>

        {/* Links Section 1 */}
        <div className="py-1">
          <Link to="/profile" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100">Profile</Link>
          {/* <Link to="/repairs" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100">Repairs</Link>
          <Link to="/devices" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100">Devices</Link>
          <Link to="/ai-assistant" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100">AI Assistant</Link> */}
        </div>

        {/* Links Section 2 */}
        <div className="py-1 border-t border-gray-200">
          <Link to="/business" className="block px-4 py-3 text-sm text-blue-600 hover:bg-gray-100">Switch to Business</Link>
        </div>

        {/* Links Section 3 */}
        <div className="py-1 border-t border-gray-200">
          <Link to="/settings" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100">Settings</Link>
          <Link to="/help" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100">Help</Link>
        </div>

        {/* LOG OUT */}
        <div className="py-1 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gray-100"
          >
            Log Out
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfileDropdown;
