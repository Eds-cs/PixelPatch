import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../constants/routes";

// ChatGPT-style pulsing loader
function ChatLoader() {
  return (
    <div className="flex space-x-2 justify-center items-center mt-16">
      <span className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
      <span className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
      <span className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></span>
    </div>
  );
}

export default function HomeLoggedInAI() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileButtonRef = useRef(null);
  const profileDropdownRef = useRef(null);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // CLOSE DROPDOWN (your original logic)
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
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isProfileOpen]);


  // SEND BUTTON — KEEPING ALL YOUR LOGIC
  const handleSend = () => {
    if (!input.trim()) return;

    // Save message safely in sessionStorage
    sessionStorage.setItem("pending_ai_issue", input);

    if (!token) {
      navigate(ROUTES.LOGIN);
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      navigate(ROUTES.MESSAGES);
    }, 600);
  };




  return (
    <div
      className="bg-white min-h-screen text-gray-900"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row">

          {/* SIDEBAR ICONS (unchanged) */}
          {/* <aside className="w-full md:w-20 lg:w-24 py-6 md:py-10 flex flex-row md:flex-col items-center flex-shrink-0">
            <a href="#" className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <svg className="h-6 w-6" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
            </a>

            <a href="#" className="p-3 rounded-lg text-gray-500 hover:bg-gray-100 mt-4">
              <svg className="h-6 w-6" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"/>
              </svg>
            </a>

            <a href="#" className="p-3 rounded-lg text-gray-500 hover:bg-gray-100 mt-4">
              <svg className="h-6 w-6" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
              </svg>
            </a>
          </aside> */}

          {/* LANDING + LOADER */}
          <div className="w-full min-h-screen flex flex-col items-center pt-12">

            {/* NEW — show loader if sending */}
            {isLoading ? (
              <ChatLoader />
            ) : (
              <div className="pt-20 md:pt-28 flex flex-col items-center gap-10">
                <h1 className="text-3xl font-bold text-center">
                  Welcome to PixelPatch Troubleshooting AI, How can I help?
                </h1>

                <div className="w-full max-w-3xl relative">
                  <input
                    type="text"
                    placeholder="Explain your situation..."
                    value={input}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full pl-5 pr-16 py-4 rounded-lg text-base bg-white border border-gray-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* YOUR ORIGINAL SEND BUTTON LOGIC + new loader behavior */}
                  <button
                    onClick={handleSend}
                    className="absolute right-3 top-1/2 -translate-y-[50%]
                      w-10 h-10 p-2 rounded-lg bg-white text-blue-600
                      hover:bg-blue-100 focus:bg-white active:bg-white
                      visited:bg-white focus:ring-0 outline-none flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                      viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"
                      className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M6 12L3 3l18 9-18 9 3-9h7.5"/>
                    </svg>
                  </button>

                  {!token && (
                    <p className="text-sm text-gray-400 text-center absolute left-0 right-0 -bottom-6 pointer-events-none">
                      You must log in first to start the troubleshooting.
                    </p>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
