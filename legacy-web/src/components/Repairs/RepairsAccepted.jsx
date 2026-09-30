import React from "react";

// Mock data for demonstration
const mockRepair = {
  status: "Accepted",
  device: {
    name: "Samsung S25",
    type: "Smartphone",
    pickupAddress: "112, Normal Road, Baliwasan Zamboanga City",
    preferredTime: "Oct 25, 2025",
    repairType: "Screen Replacement",
    serviceType: "Pickup",
    description: "The screen of the phone is broken and it is not turning on.",
    images: [
      "https://placehold.co/150x150/e0f2fe/3b82f6?text=Phone+Front",
      "https://placehold.co/150x150/e0f2fe/3b82f6?text=Phone+Back",
    ],
  },
  shop: {
    name: "TechFix Pro",
    address: "5433 Dona Benita Drive, Canelar Zamboanga City",
    email: "techfix@gmail.com",
    phone: "998-505-177",
  },
  assessment: {
    condition: "Not Good.",
    issues: "The phone might have internal problems.",
    recommendation: "Overall it can be done.",
    references: [
      "https://placehold.co/150x150/e0f2fe/3b82f6?text=Ref+1",
      "https://placehold.co/150x150/e0f2fe/3b82f6?text=Ref+2",
    ],
  },
  quotation: {
    labor: "500.00 PHP",
    parts: [
      { name: "Samsung S25 Screen", cost: "4,500.00 PHP" },
      { name: "Samsung Front Camera", cost: "2,000.00 PHP" },
    ],
    total: "7,000.00 PHP",
    completion: "5 days",
    warranty: "6 Months",
  },
};

const RepairAccepted = () => {
  const { device, shop, assessment, quotation, status } = mockRepair;
  return (
    <div className="bg-gray-50 text-gray-900 flex flex-col min-h-screen font-inter">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-grow">
        {/* Status Banner */}
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded-lg flex justify-between items-center mb-6">
          <p className="font-medium">Repair is ready to start.</p>
          <span className="text-xs font-medium bg-blue-200 text-blue-900 px-2.5 py-0.5 rounded-full">{status}</span>
        </div>

        {/* Progress Stepper */}
        <div className="w-full mb-8">
          {/* ...stepper code omitted for brevity... */}
        </div>

        {/* Main Content Area */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          {/* Request Information */}
          <div className="relative pb-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Request Information</h2>
            <div className="absolute top-0 right-0 text-right">
              <p className="text-xs text-gray-500">Estimates Reply</p>
              <p className="text-sm font-semibold text-gray-900">3-4 Days</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <span className="text-gray-500">Device</span>
                <p className="font-medium text-gray-800">{device.name}</p>
              </div>
              <div>
                <span className="text-gray-500">Pickup Address</span>
                <p className="font-medium text-gray-800">{device.pickupAddress}</p>
              </div>
              <div>
                <span className="text-gray-500">Device Type</span>
                <p className="font-medium text-gray-800">{device.type}</p>
              </div>
              <div>
                <span className="text-gray-500">Preferred Time</span>
                <p className="font-medium text-gray-800">{device.preferredTime}</p>
              </div>
              <div>
                <span className="text-gray-500">Repair Type</span>
                <p className="font-medium text-gray-800">{device.repairType}</p>
              </div>
              <div>
                <span className="text-gray-500">Service Type</span>
                <p className="font-medium text-gray-800">{device.serviceType}</p>
              </div>
              <div className="md:col-span-2">
                <span className="text-gray-500">Description</span>
                <p className="font-medium text-gray-800">{device.description}</p>
              </div>
            </div>
          </div>

          {/* Shop Info & Reference Images */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-b border-gray-200 pb-6">
            {/* Shop Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Shop Information</h2>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                <h3 className="font-semibold text-gray-900">{shop.name}</h3>
                <div className="text-sm">
                  <span className="text-gray-500">Address</span>
                  <p className="font-medium text-gray-800">{shop.address}</p>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Email</span>
                  <p className="font-medium text-gray-800">{shop.email}</p>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Phone</span>
                  <p className="font-medium text-gray-800">{shop.phone}</p>
                </div>
              </div>
            </div>
            {/* Reference Images */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Reference Images</h2>
              <div className="flex flex-wrap gap-4">
                {device.images.map((img, i) => (
                  <img key={i} src={img} alt={`Reference ${i + 1}`} className="w-24 h-24 rounded-lg object-contain border border-gray-200 bg-white p-1" />
                ))}
              </div>
            </div>
          </div>

          {/* Assessment & Quotation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            {/* Assessment */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Assessment</h2>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Device Condition</span>
                  <p className="font-medium text-gray-800">{assessment.condition}</p>
                </div>
                <div>
                  <span className="text-gray-500">Observed Issues</span>
                  <p className="font-medium text-gray-800">{assessment.issues}</p>
                </div>
                <div>
                  <span className="text-gray-500">Recommendation Summary</span>
                  <p className="font-medium text-gray-800">{assessment.recommendation}</p>
                </div>
                <div>
                  <span className="text-gray-500">References</span>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {assessment.references.map((img, i) => (
                      <img key={i} src={img} alt={`Assessment Reference ${i + 1}`} className="w-24 h-24 rounded-lg object-contain border border-gray-200 bg-white p-1" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Quotation */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quotation</h2>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Labor Fee:</span>
                  <span className="font-medium text-gray-800">{quotation.labor}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <span className="text-gray-600">Parts Cost:</span>
                  {quotation.parts.map((part, i) => (
                    <div key={i} className="flex justify-between items-center mt-1">
                      <span className="text-gray-500 pl-2">{part.name}</span>
                      <span className="font-medium text-gray-800">{part.cost}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-base">
                    <span className="font-semibold text-gray-900">Total Estimate:</span>
                    <span className="font-bold text-blue-600">{quotation.total}</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Completion Time:</span>
                    <span className="font-medium text-gray-800">{quotation.completion}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Warranty Coverage:</span>
                    <span className="font-medium text-gray-800">{quotation.warranty}</span>
                  </div>
                </div>
                <a href="#" className="text-blue-600 hover:underline text-xs pt-2 inline-block">More...</a>
              </div>
            </div>
          </div>
        </div>

        {/* Support Center Banner */}
        <div className="mt-6 bg-blue-100 p-4 rounded-lg flex items-center justify-between">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Support Center:</span>
            Having issues with your request? <a href="#" className="font-medium underline hover:text-blue-600">Contact Support</a>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
          <button className="rounded-lg border border-gray-300 bg-white py-2 px-5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
            Cancel Request
          </button>
          <button className="rounded-lg border border-transparent bg-blue-600 py-2 px-5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Proceed to Payment
          </button>
        </div>
      </main>
    </div>
  );
};

export default RepairAccepted;
