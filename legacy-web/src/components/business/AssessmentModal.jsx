import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ROUTES } from '../../constants/routes';

const AssessmentModal = ({ isOpen, onClose, requestId }) => {
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // TODO: Replace with actual API call
    console.log('Submitting assessment:', {
      requestId,
      assessment: assessmentNotes
    });

    // Close modal and navigate to assessment without quotation
    onClose();
    navigate(`/business/repairs/${requestId}/assessment`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-5">
          <h2 className="text-xl font-semibold text-gray-900">Add Assessment</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-5 pt-0">
            <div>
              <label htmlFor="assessment_notes" className="block text-sm font-medium text-gray-700 mb-1">
                Assessment Notes
              </label>
              <textarea
                id="assessment_notes"
                name="assessment_notes"
                rows="6"
                className="mt-1 block w-full rounded-lg border-gray-200 bg-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-4"
                placeholder="Enter your assessment details..."
                value={assessmentNotes}
                onChange={(e) => setAssessmentNotes(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end p-5 pt-0">
            <button
              type="submit"
              className="rounded-lg border border-transparent bg-blue-600 py-2 px-6 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

AssessmentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  requestId: PropTypes.string.isRequired
};

export default AssessmentModal;