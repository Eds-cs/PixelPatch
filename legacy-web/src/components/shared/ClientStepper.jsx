import React from "react";

const Stepper = ({ currentStep = 1, steps }) => {
  return (
    <div className="w-full flex items-center justify-between mt-10">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        let bgColor = "bg-gray-300";
        let textColor = "text-gray-500";

        if (stepNumber < currentStep) {
          bgColor = "bg-blue-500";
          textColor = "text-blue-600";
        } else if (stepNumber === currentStep) {
          bgColor = "bg-blue-500";
          textColor = "text-blue-600";
        }

        return (
          <div key={index} className="flex flex-col items-center flex-1 relative">
            {index !== steps.length - 1 && (
              <div className={`absolute top-1/2 left-0 w-full h-1 -z-10 ${stepNumber < currentStep ? "bg-blue-500" : "bg-gray-300"}`}></div>
            )}

            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${bgColor}`}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d={step.iconPath}></path>
              </svg>
            </div>

            <span className={`mt-2 text-sm font-medium ${textColor}`}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default Stepper;
