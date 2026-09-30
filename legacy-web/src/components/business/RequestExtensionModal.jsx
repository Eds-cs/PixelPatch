import { useState } from 'react';
import PropTypes from 'prop-types';

const RequestExtensionModal = ({ isOpen, onClose, requestId }) => {
  const [newDeadline, setNewDeadline] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Replace with real API call
    console.log('Requesting extension for', requestId, { newDeadline, reason, file });
    // Close modal after submit
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Request for Extension</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="new_deadline" className="block text-sm font-medium text-gray-700">New Estimated Deadline</label>
            <input
              id="new_deadline"
              name="new_deadline"
              className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
              placeholder="MM/DD/YY"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="extension_reason" className="block text-sm font-medium text-gray-700">Reason</label>
            <textarea
              id="extension_reason"
              name="extension_reason"
              rows="4"
              className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
              placeholder="We're sorry..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Evidence</label>
            <div className="mt-1 flex justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3 3m3-3l3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>

                <div className="flex text-sm text-gray-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-medium text-blue-600 hover:text-blue-500">
                    <span>Click to upload</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">SVG, PNG, JPG or GIF (max. 800x400px)</p>
              </div>
            </div>
            {file && <p className="mt-2 text-sm text-gray-600">Selected file: {file.name}</p>}
          </div>

          <div className="flex justify-end p-0">
            <button type="submit" className="rounded-lg border border-transparent bg-gray-800 py-2 px-6 text-base font-medium text-white shadow-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2">
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

RequestExtensionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  requestId: PropTypes.string
};

RequestExtensionModal.defaultProps = {
  requestId: '001'
};

export default RequestExtensionModal;