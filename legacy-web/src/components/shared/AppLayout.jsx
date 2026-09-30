// shared/AppLayout.jsx
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { useState, useEffect, useRef } from "react";
import { Bell, MessageCircle, Menu } from "lucide-react";

import TopNavigation from "./TopNavigation";
import UserAvatar from "./UserAvatar";
import ProfileDropdown from "./ProfileDropdown";
import Footer from "./Footer";

import { ROUTES } from "../../constants/routes"; 

const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();


  const handleLogin = () => navigate(ROUTES.LOGIN);
  const handleSignUp = () => navigate(ROUTES.SIGNUP);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Accept token from localStorage or sessionStorage
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const isLoggedIn = Boolean(token);

  // Determine if footer should be hidden
  const hideFooterRoutes = ["/messages", "/ai-assistant", "/","/login", "/signup", "/account-sign-up","/chat", "/chat/:shopId","/chat/:chatId"];
  const shouldHideFooter = hideFooterRoutes.includes(location.pathname);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={`bg-gray-50 text-gray-900 flex flex-col 
      ${location.pathname === "/messages" || location.pathname === "/ai-assistant"
        ? "h-screen"      // chat pages
        : "min-h-screen"  // normal pages
      }`}
    >


      {/* HEADER */}
      <header className="border-b border-gray-200 bg-white w-full flex-shrink-0 h-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between h-20">

            <Link to="/" className="text-2xl font-extrabold text-blue-600">
              PixelPatch
            </Link>

            {isLoggedIn && <TopNavigation />}

            {isLoggedIn ? (
              <div className="hidden md:block">
                <div className="ml-4 flex items-center space-x-4">

                  {/* <button className="bg-white text-gray-500 hover:text-blue-600 rounded-full p-2">
                    <Bell className="w-6 h-6" />
                  </button> */}

                  <Link to={ROUTES.CHAT_LIST}>
                    <button className="bg-white text-gray-500 hover:text-blue-600 rounded-full p-2">
                      <MessageCircle className="w-6 h-6" />
                    </button>
                  </Link>

                  <div ref={dropdownRef}>
                    <UserAvatar
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      showDropdown={isDropdownOpen}
                      dropdownContent={<ProfileDropdown isOpen={isDropdownOpen} />}
                    />
                  </div>

                </div>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-4">
                <button onClick={handleLogin} className="bg-white text-blue-600 px-4 py-2 border border-gray-400 rounded-lg">
                  Login
                </button>
                <button onClick={handleSignUp} className="bg-blue-600 text-white px-5 py-2 rounded-lg">
                  Sign Up
                </button>
              </div>
            )}

            <div className="md:hidden">
              <button className="bg-white p-2 rounded-md text-gray-500 hover:bg-gray-900 hover:bg-gray-100">
                <Menu className="w-6 h-6" />
              </button>
            </div>

          </nav>
        </div>
      </header>

      <main className="flex-grow flex flex-col h-full min-h-0">{children ?? <Outlet />}</main>

      {/* FOOTER (hidden for AI chat page) */}
      {!shouldHideFooter && <Footer />}

    </div>
  );
};

AppLayout.propTypes = {
  children: PropTypes.node,
};

export default AppLayout;
