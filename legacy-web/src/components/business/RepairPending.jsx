import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

const mockRequests = {
  '1': {
    id: 1,
    device: 'Samsung S25',
    pickupAddress: '112, Normal Road, Baliwasan Zamboanga City',
    deviceType: 'Smartphone',
    preferredTime: 'Oct 25, 2025',
    repairType: 'Screen Replacement',
    serviceType: 'Pickup',
    description: "The screen of the phone is broken and it is not turning on.",
    images: [
      'https://placehold.co/150x150/e0f2fe/3b82f6?text=Phone+Front',
      'https://placehold.co/150x150/e0f2fe/3b82f6?text=Phone+Back',
      'https://placehold.co/150x150/e0f2fe/3b82f6?text=Phone+Side'
    ]
  }
};

const RepairPending = () => {
  const { id } = useParams();
  const request = mockRequests[id] || mockRequests['1'];

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg flex justify-between items-center mb-6">
        <p className="font-medium">The shop is currently reviewing your request.</p>
        <span className="text-xs font-medium bg-yellow-200 text-yellow-900 px-2.5 py-0.5 rounded-full">Pending</span>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="relative pb-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Request Information</h2>
          <div className="absolute top-0 right-0 text-right">
            <p className="text-xs text-gray-500">Estimates Reply</p>
            <p className="text-sm font-semibold text-gray-900">3-4 Days</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <span className="text-gray-500">Device</span>
              <p className="font-medium text-gray-800">{request.device}</p>
            </div>
            <div>
              <span className="text-gray-500">Pickup Address</span>
              <p className="font-medium text-gray-800">{request.pickupAddress}</p>
            </div>
            <div>
              <span className="text-gray-500">Device Type</span>
              <p className="font-medium text-gray-800">{request.deviceType}</p>
            </div>
            <div>
              <span className="text-gray-500">Preferred Time</span>
              <p className="font-medium text-gray-800">{request.preferredTime}</p>
            </div>
            <div>
              <span className="text-gray-500">Repair Type</span>
              <p className="font-medium text-gray-800">{request.repairType}</p>
            </div>
            <div>
              <span className="text-gray-500">Service Type</span>
              <p className="font-medium text-gray-800">{request.serviceType}</p>
            </div>
            <div className="md:col-span-2">
              <span className="text-gray-500">Description</span>
              <p className="font-medium text-gray-800">{request.description}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Shop Information</h2>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
              <h3 className="font-semibold text-gray-900">TechFix Pro</h3>
              <div className="text-sm">
                <span className="text-gray-500">Address</span>
                <p className="font-medium text-gray-800">5433 Dona Benita Drive, Canelar Zamboanga City</p>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Email</span>
                <p className="font-medium text-gray-800">techfix@gmail.com</p>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Phone</span>
                <p className="font-medium text-gray-800">998-505-177</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Reference Images</h2>
            <div className="flex flex-wrap gap-4">
              {request.images.map((src, i) => (
                <img key={i} src={src} alt={`ref-${i}`} className="w-24 h-24 rounded-lg object-contain border border-gray-200 bg-white p-1" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-blue-100 p-4 rounded-lg flex items-center justify-between">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Support Center:</span>
          Having issues with your request? <a href="#" className="font-medium underline hover:text-blue-600">Contact Support</a>
        </p>
      </div>

      <div className="mt-8 flex justify-end">
        <button className="rounded-lg border border-transparent bg-red-600 py-2 px-5 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
          Cancel Request
        </button>
      </div>

      <div className="mt-6">
        <Link to={ROUTES.BUSINESS.REPAIRS} className="inline-block mt-6 text-sm text-blue-600 hover:underline">Back to repairs</Link>
      </div>
    </main>
  );
};

export default RepairPending;
