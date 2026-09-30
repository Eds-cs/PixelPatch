// src/components/business/RepairAwaitingAssessment.jsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AssessmentModal } from './index';

const RepairAwaitingAssessment = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);

  const handleAddAssessment = () => {
    setIsAssessmentModalOpen(true);
  };

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Request #{id || '001'}</h1>
        <span className="text-sm font-medium bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full mt-2 sm:mt-0">Awaiting assessment</span>
      </div>

      {/* Request Details Card */}
      <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
        {/* Request Information */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
            Request Information
          </h2>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Samsung S25</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Device Type</label>
                <p className="text-sm text-gray-800">Smartphone</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Repair Type</label>
                <p className="text-sm text-gray-800">Screen Replacement</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Service Type</label>
                <p className="text-sm text-gray-800">Pickup</p>
              </div>
            </div>
            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Pickup Address</label>
                <p className="text-sm text-gray-800">112, Normal Road, Baliwasan Zamboanga City</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Preferred Time</label>
                <p className="text-sm text-gray-800">Oct 25, 2025</p>
              </div>
            </div>
          </div>
          {/* Full Width Description */}
          <div className="mt-6">
            <label className="text-sm font-medium text-gray-500">Description</label>
            <p className="text-sm text-gray-800">The screen of the phone is broken and it is not turning on.</p>
          </div>
        </section>

        {/* Reference Images */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
            Reference Images
          </h2>
          <div className="flex flex-wrap gap-4">
            <img src="https://placehold.co/200x200/e0f2fe/3b82f6?text=Phone+Image+1" alt="Reference Image 1" className="h-32 w-32 rounded-lg object-contain border border-gray-200 bg-gray-50" />
            <img src="https://placehold.co/200x200/e0f2fe/3b82f6?text=Phone+Image+2" alt="Reference Image 2" className="h-32 w-32 rounded-lg object-contain border border-gray-200 bg-gray-50" />
            <img src="https://placehold.co/200x200/e0f2fe/3b82f6?text=Phone+Image+3" alt="Reference Image 3" className="h-32 w-32 rounded-lg object-contain border border-gray-200 bg-gray-50" />
          </div>
        </section>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mt-6">
        <button onClick={handleAddAssessment} className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          Add Assessment
        </button>
      </div>

      {/* Assessment Modal */}
      <AssessmentModal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        requestId={id || '001'}
      />
    </main>
  );
};

export default RepairAwaitingAssessment;
