import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

const mockRequests = {
  '1': {
    id: 1,
    client: 'John Doe',
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
    ],
    rejectionReason: "We currently can't provide this service as our technician has no experience about your device."
  }
};

const RepairRejected = () => {
  const { id } = useParams();
  const request = mockRequests[id] || mockRequests['1'];

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Request #{request.id.toString().padStart(3, '0')}</h1>
        <span className="text-sm font-medium bg-red-100 text-red-800 px-3 py-1 rounded-full">Rejected</span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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

        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reference Images</h2>
          <div className="flex flex-wrap gap-4">
            {request.images.map((src, i) => (
              <img key={i} src={src} alt={`reference-${i}`} className="w-24 h-24 rounded-lg object-contain border border-gray-200" />
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reason for Rejection.</h2>
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-700">{request.rejectionReason}</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Link to={ROUTES.REPAIRS} className="inline-block rounded-lg border border-gray-200 bg-white py-2 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Back to repairs
        </Link>
      </div>
    </main>
  );
};

export default RepairRejected;
