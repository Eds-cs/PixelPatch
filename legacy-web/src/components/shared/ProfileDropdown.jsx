import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";

const ProfileDropdown = ({ isOpen }) => {
  const navigate = useNavigate();
  if (!isOpen) return null;

  const user =
    JSON.parse(localStorage.getItem("user")) ||
    JSON.parse(sessionStorage.getItem("user"));

  // ✅ BUSINESS USER CHECK (role_id === 3)
  const isBusiness = user?.role_id === 3;
  const currentMode = localStorage.getItem("app_mode") || "user";

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
    window.location.reload();
  };

  return (
    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">

      {/* USER INFO */}
      <div className="flex items-center px-4 py-3 border-b bg-gray-50">
        <div className="h-10 w-10 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold">
          {user?.first_name?.[0]}
          {user?.last_name?.[0]}
        </div>

        <div className="ml-3">
          <p className="text-sm font-semibold">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
      </div>

      {/* LINKS */}
      <div className="py-1">
        <Link to={ROUTES.PROFILE} className="block px-4 py-3 hover:bg-gray-100">Profile</Link>
        <Link to={ROUTES.REPAIRS} className="block px-4 py-3 hover:bg-gray-100">Repairs</Link>
        </div>

      {/* BUSINESS SECTION */}
      <div className="border-t py-1">
        {!isBusiness ? (
          /* USER IS NOT A BUSINESS */
          <Link
            to={ROUTES.BUSINESS_SIGNUP.STEP1}
            className="block px-4 py-3 text-blue-600 hover:bg-gray-100"
          >
            Register as Business
          </Link>
        ) : (
          <>
            {currentMode === "user" && (
              <button
                onClick={() => {
                  localStorage.setItem("app_mode", "business");
                  navigate(ROUTES.BUSINESS.DASHBOARD);
                  window.location.reload();
                }}
                className=" bg-white w-full text-left px-4 py-3 text-blue-600 hover:bg-gray-100"
              >
                Switch to Business
              </button>
            )}

            {currentMode === "business" && (
              <button
                onClick={() => {
                  localStorage.setItem("app_mode", "user");
                  navigate(ROUTES.HOME);
                  window.location.reload();
                }}
                className=" bg-white w-full text-left px-4 py-3 text-blue-600 hover:bg-gray-100"
              >
                Switch to User
              </button>
            )}
          </>
        )}
      </div>


      {/* SETTINGS */}
      <div className="border-t py-1">
        <Link to={ROUTES.SETTINGS} className="block px-4 py-3 hover:bg-gray-100">Settings</Link>
        <Link to={ROUTES.HELP} className="block px-4 py-3 hover:bg-gray-100">Help</Link>
      </div>

      {/* LOG OUT */}
      <div className="border-t py-1">
        <button
          onClick={handleLogout}
          className="w-full bg-white text-left px-4 py-3 text-red-600 hover:bg-gray-100"
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default ProfileDropdown;
