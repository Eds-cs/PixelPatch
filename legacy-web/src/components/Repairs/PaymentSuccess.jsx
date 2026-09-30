import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate("/repairs", { replace: true }); // 👈 change later if needed
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-lg shadow-lg text-center max-w-md">
        <div className="text-5xl mb-4">✅</div>

        <h1 className="text-2xl font-bold text-gray-900">
          Payment Successful
        </h1>

        <p className="mt-3 text-gray-600 text-sm">
          Your payment has been received successfully.
        </p>

        <p className="mt-1 text-gray-500 text-sm">
          Redirecting you back shortly…
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
