import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PaymentFailed = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect after 4 seconds
    const timer = setTimeout(() => {
      navigate("/repairs", { replace: true }); // 👈 change later if needed
    }, 4000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-lg shadow-lg text-center max-w-md">
        <div className="text-5xl mb-4">❌</div>

        <h1 className="text-2xl font-bold text-gray-900">
          Payment Failed
        </h1>

        <p className="mt-3 text-gray-600 text-sm">
          Your payment was not completed.
        </p>

        <p className="mt-1 text-gray-500 text-sm">
          You will be redirected shortly…
        </p>

        <button
          onClick={() => navigate("/repairs")}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Go Back Now
        </button>
      </div>
    </div>
  );
};

export default PaymentFailed;
