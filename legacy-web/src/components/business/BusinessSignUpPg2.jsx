import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import axios from "axios";

/* ---------------- STEP INDICATOR ---------------- */
function Stepper({ currentStep }) {
  const steps = [
    { number: 1, title: "Account Info" },
    { number: 2, title: "Business Info" },
    { number: 3, title: "Services" },
    { number: 4, title: "Payment" },
  ];

  return (
    <nav className="w-full max-w-3xl mx-auto mb-16">
      <div className="flex items-start">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step.number === currentStep
                    ? "bg-blue-600 border-blue-600 text-white"
                    : step.number < currentStep
                    ? "border-blue-600 text-blue-600"
                    : "border-gray-300 text-gray-500"
                }`}
              >
                {step.number < currentStep ? (
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                  </svg>
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              <p className={`mt-3 text-sm text-center w-24 ${
                step.number <= currentStep ? "text-blue-600" : "text-gray-500"
              }`}>
                {step.title}
              </p>
            </div>

            {index < steps.length - 1 && (
              <div className="flex-1 h-1 mt-5">
                <div
                  className={`h-full ${
                    step.number < currentStep ? "bg-blue-600" : "bg-gray-300"
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
}

/* ---------------- SERVICE BLOCK ---------------- */
function ServiceBlock({ id, index, onRemove, categories }) {
  return (
    <div className="space-y-6 p-8 border border-blue-500 rounded-lg shadow-md w-full">

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Service #{index + 1}</h3>

        {index > 0 && (
          <button onClick={onRemove} type="button" className="text-red-500 hover:text-red-600">
            Remove
          </button>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium mb-1">Category</label>

        <select
          name={`category_${id}`}
          className="w-full rounded-lg border-gray-300 bg-gray-50 p-3"
        >
          {categories.length === 0 ? (
            <option>Loading...</option>
          ) : (
            categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0) + cat.slice(1).toLowerCase()}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Repair Name */}
      <div>
        <label className="block text-sm mb-1">Repair Service</label>
        <input
          name={`repair_service_${id}`}
          className="w-full rounded-lg border-gray-300 bg-gray-50 p-3"
          placeholder="Screen replacement, cleaning, etc."
        />
      </div>

      {/* Timeframe */}
      <div>
        <label className="block text-sm mb-1">Estimated Timeframe</label>
        <div className="flex items-center gap-3">
          <input type="number" min="1" name={`time_from_${id}`} className="w-20 rounded-lg bg-gray-50 border-gray-300 p-2" />
          <span>to</span>
          <input type="number" min="1" name={`time_to_${id}`} className="w-20 rounded-lg bg-gray-50 border-gray-300 p-2" />
          <select name={`time_unit_${id}`} className="rounded-lg bg-gray-50 border-gray-300 p-2">
            <option>Days</option>
            <option>Hours</option>
            <option>Weeks</option>
          </select>
        </div>
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm mb-1">Estimated Price</label>
        <div className="flex items-center gap-3">
          <input name={`price_${id}`} className="w-40 rounded-lg bg-gray-50 border-gray-300 p-2" />
          <select name={`currency_${id}`} className="rounded-lg bg-gray-50 border-gray-300 p-2">
            <option>PHP</option>
            <option>USD</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/* ---------------- MAIN PAGE ---------------- */
export default function BusinessSignUpPageTwo() {
  const navigate = useNavigate();

  useEffect(() => {
    const data = localStorage.getItem("businessSignup");
    if (!data) {
      alert("Complete business information first.");
      navigate(ROUTES.BUSINESS_SIGNUP.STEP1);
    }
  }, [navigate]);
  const [categories, setCategories] = useState([]);

  const [serviceBlocks, setServiceBlocks] = useState([
    { id: Date.now() }
  ]);

  /* Fetch categories from backend */
  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/shop-services/categories`)
      .then((res) => setCategories(res.data.categories))
      .catch(() => {
        alert("Unable to load service categories. Try again later.");
      });
  }, []);

  /* Add new block */
  const addBlock = () => {
    setServiceBlocks((prev) => [...prev, { id: Date.now() }]);
  };

  /* Remove block */
  const removeBlock = (id) => {
    setServiceBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  /* Submit */
  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.target;

    const savedData = JSON.parse(localStorage.getItem("businessSignup")) || {};

    const services = serviceBlocks.map((block, index) => {
      const id = block.id;
      return {
        category: form[`category_${id}`]?.value || "",
        repair_service: form[`repair_service_${id}`]?.value || "",
        time_from: form[`time_from_${id}`]?.value || "",
        time_to: form[`time_to_${id}`]?.value || "",
        time_unit: form[`time_unit_${id}`]?.value || "Days",
        price: form[`price_${id}`]?.value || "",
        currency: form[`currency_${id}`]?.value || "PHP",
      };
    });

    const filteredServices = services.filter(
      s => s.repair_service && s.price
    );

    const updated = {
      ...savedData,
      services: filteredServices
    };

    if (!serviceBlocks.length) {
      alert("At least one service is required.");
      return;
    }

    for (const svc of services) {
      if (
        !svc.repair_service ||
        !svc.price ||
        isNaN(parseFloat(svc.price)) ||
        parseFloat(svc.price) <= 0
      ) {
        alert("Each service must have a name and a valid price.");
        return;
      }
    }


    localStorage.setItem("businessSignup", JSON.stringify(updated));

    console.log("UPDATED FULL DATA:", updated);

    navigate(ROUTES.BUSINESS_SIGNUP.STEP3);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-12 w-full max-w-7xl mx-auto">
      <Stepper currentStep={3} />
      <h1 className="text-3xl font-bold mb-8">Services</h1>

      <form onSubmit={handleSubmit} className="space-y-10 w-full">
        {serviceBlocks.map((block, index) => (
          <ServiceBlock
            key={block.id}
            id={block.id}
            index={index}
            onRemove={() => removeBlock(block.id)}
            categories={categories}
          />
        ))}

        <button onClick={addBlock} type="button" className="text-blue-600 hover:text-blue-500">
          + Add Another Category
        </button>

        <div className="flex justify-end gap-4 pt-6 border-t border-gray-300">
            <button type="button" className="px-6 py-3 border rounded-lg" onClick={() => navigate(ROUTES.BUSINESS_SIGNUP.STEP1)}>
              Back
            </button>

          <button
            type="submit"
            disabled={!categories.length}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
