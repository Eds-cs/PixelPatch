import { useState, useEffect  } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from "axios";



const Login = () => {
  const navigate = useNavigate();
  useEffect(() => {
    /* global google */
    if (window.google) {
      google.accounts.id.initialize({
        client_id: "336535186008-435fgksv3m1oj49cv43inibs2eajdg3p.apps.googleusercontent.com",
        callback: handleGoogleLogin,
      });

      google.accounts.id.renderButton(
        document.getElementById("googleLogin"),
        { theme: "outline", size: "large", width: "100%" }
      );
    }
  }, []);

  const handleGoogleLogin = () => {
    /* Google popup */
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          const res = await axios.post("http://72.62.248.151/api/auth/google-login", {
            credential: response.credential,
          });

          // Save token + user
          localStorage.setItem("token", res.data.token);
          localStorage.setItem("user", JSON.stringify(res.data.user));

          const pendingIssue = sessionStorage.getItem("pending_ai_issue");

          if (pendingIssue) {
            navigate("/messages");
          } else {
            navigate("/");
          }

        } catch (err) {
          console.error(err);
          alert("Google Login failed");
        }
      },
    });

    google.accounts.id.prompt(); // Google popup
  };




  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    let isValid = true;
    const newErrors = { email: '', password: '' };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
      isValid = false;
    }

    if (formData.password.trim().length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const response = await axios.post("http://72.62.248.151/api/auth/login", {
        email: formData.email,
        password: formData.password
      });

      // Save token + user info depending on Remember Me
      if (formData.rememberMe) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");

      } else {
        sessionStorage.setItem("token", response.data.token);
        sessionStorage.setItem("user", JSON.stringify(response.data.user));

        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }


      // Silent redirect (no alert)
      const pendingIssue = sessionStorage.getItem("pending_ai_issue");

      if (pendingIssue) {
        navigate("/messages");
      } else {
        navigate("/");
      }

    } catch (error) {
      console.error("Login error:", error);

      // Clear old errors
      setErrors({ email: "", password: "" });

      const message = error.response?.data?.error || "";

      if (message.includes("Email not found")) {
        setErrors((prev) => ({ ...prev, email: "Email does not exist." }));
      } 
      else if (message.includes("Invalid credentials") || message.includes("Wrong password")) {
        setErrors((prev) => ({ ...prev, password: "Incorrect password." }));
      } 
      else {
        setErrors((prev) => ({ ...prev, password: "Login failed. Try again." }));
      }
    }
  };



  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="bg-gray-100 flex justify-center items-center min-h-screen px-4">
      <div className="bg-white shadow-lg rounded-2xl w-full max-w-5xl flex overflow-hidden">
        
        {/* Left side (Form) */}
        <div className="w-full lg:w-1/2 p-10">
          <h1 className="text-4xl font-extrabold text-gray-800 mb-2">
            Welcome to <span className="text-sky-600">Pixel</span>
            <span className="text-gray-500">Patch</span>
          </h1>
          <p className="text-gray-500 mb-6 italic font-medium">
            Log in to start your session.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-gray-700 font-semibold mb-1"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="sample@gmail.com"
                className={`border p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-sm ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-gray-700 font-semibold mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className={`border p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-sm pr-10 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                      <circle cx="12" cy="12" r="3" strokeWidth="1.5" stroke="currentColor" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M3 3l18 18M10.477 10.477A3 3 0 0113.5 13.5m4.245 1.934A9.956 9.956 0 0121.542 12C20.268 7.943 16.478 5 12 5a9.958 9.958 0 00-4.743 1.194M6.414 6.414A9.956 9.956 0 002.458 12c1.274 4.057 5.064 7 9.542 7 1.714 0 3.322-.43 4.743-1.194"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password}</p>
              )}
            </div>

            {/* Remember Me + Forgot Password */}
            <div className="flex justify-between items-center text-sm text-gray-600">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="mr-2 accent-sky-600"
                />
                Remember Me
              </label>
              <Link
                to="/forgot-password"
                className="text-sky-600 hover:underline hover:text-sky-700"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Login button */}
            <button
              type="submit"
              className="bg-sky-500 hover:bg-sky-600 text-white w-full py-3 rounded-lg transition font-semibold shadow-md hover:shadow-lg"
            >
              <link ></link>
              Log In
            </button>

            {/* OR Divider */}
            <div className="flex items-center justify-center my-2">
              <span className="h-px bg-gray-300 w-1/3"></span>
              <span className="mx-2 text-gray-500 text-sm">or</span>
              <span className="h-px bg-gray-300 w-1/3"></span>
            </div>

            {/* Google Login */}
            <button
              type="button"
              id="googleLogin"
              onClick={handleGoogleLogin}
              className="font-semibold border bg-white border-gray-300 flex items-center justify-center w-full py-3 rounded-lg hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <img
                src="https://www.svgrepo.com/show/355037/google.svg"
                alt="Google"
                className="w-5 h-5 mr-2"
              />
              Continue with Google
            </button>

            {/* Sign Up */}
            <p className="text-center text-sm text-gray-500 mt-5">
              Don’t have an account?{' '}
              <Link
                to="/signup"
                className="text-sky-600 hover:underline font-semibold"
              >
                Sign Up
              </Link>
            </p>
          </form>
        </div>

        {/* Right side (Logo) */}
        <div className="hidden lg:flex w-1/2 flex-col items-center justify-center bg-gradient-to-br from-sky-100 to-white p-12">
          <img
            src="/PixelpatchLogo.jpg"
            alt="PixelPatch Logo"
            className="w-52 h-auto mx-auto mb-6 drop-shadow-md"
          />
          <p className="text-gray-600 text-sm">Developed by:</p>
          <h2 className="text-3xl font-bold text-sky-700 mt-1 drop-shadow-sm">
            IntegriTech
          </h2>
        </div>
      </div>
    </div>
  );
};

export default Login;
