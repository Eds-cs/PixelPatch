import React, { useState } from 'react';

// This is the main export, but it's designed to be used by another component.
// For a standalone preview, we can wrap it.
export default function App() {
  // A simple wrapper to show the modal by default for preview
  return (
    <div className="bg-gray-200 p-10 relative min-h-screen">
      <ReviewModal onClose={() => console.log('Close modal')} />
    </div>
  );
}

// The Review Modal Component
export function ReviewModal({ onClose }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  return (
    // Modal Overlay
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      
      {/* Modal Panel */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Leave a Review</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {/* Rate Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Rate</label>
            <div className="flex items-center mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className={`text-3xl transition-colors ${
                    (hoverRating || rating) >= star ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-1">Selected Rating: {rating}</p>
          </div>
          
          {/* Comment Section */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700">Comment</label>
            <textarea
              id="comment"
              name="comment"
              rows="5"
              className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3"
              placeholder="Nice, Ganda!"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            ></textarea>
          </div>
          
        </div>
        
        {/* Modal Footer */}
        <div className="flex justify-end p-5 bg-gray-50 border-t border-gray-200">
          <button
            type="submit"
            className="rounded-lg border border-transparent bg-green-600 py-2 px-6 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Submit Review
          </button>
        </div>
      </div>
    </div>
  );
}