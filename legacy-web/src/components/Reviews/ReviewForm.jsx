import { useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL;

const StarRating = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        className="text-2xl"
      >
        <span
          className={
            star <= value
              ? "text-yellow-400"
              : "text-gray-300"
          }
        >
          ★
        </span>
      </button>
    ))}
  </div>
);

const ReviewForm = ({ requestId, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const submitReview = async () => {
    try {
      setLoading(true);

      await axios.post(
        `${API_BASE}/api/client/reviews`,
        { request_id: requestId, rating, feedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onSuccess(); // refresh repair details
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <StarRating value={rating} onChange={setRating} />

      <textarea
        placeholder="Write your feedback..."
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        className="w-full border rounded-lg p-3 text-sm"
      />

      <button
        onClick={submitReview}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg disabled:opacity-50"
      >
        Submit Review
      </button>
    </div>
  );
};

export default ReviewForm;
