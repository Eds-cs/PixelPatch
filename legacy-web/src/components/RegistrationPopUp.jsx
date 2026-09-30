import React from 'react';
import PixelpatchLogo from '../assets/PixelpatchLogo.jpg';

export default function App() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <RegistrationPopup />
    </div>
  );
}

function RegistrationPopup() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 w-full max-w-2xl mx-auto flex flex-col items-center">
      
      {/* Icon ng PixelPatch Part */}
<div className="w-24 h-24 flex items-center justify-center">
  <img
    src={PixelpatchLogo}
    alt="PixelPatch Logo"
    className="w-full h-full object-contain rounded-xl"
  />
</div>

      <h1 className="text-3xl font-bold text-gray-900 mt-6">
        Welcome to PixelPatch
      </h1>
      <p className="text-base text-gray-500 mt-3 text-center max-w-md">
        To get started, register as a seller by providing the
        necessary information
      </p>

      {/* Main Button ng modal */}
      <button
        className="w-full sm:w-auto mt-8 px-10 py-3 rounded-lg text-base font-medium text-white shadow-lg transition-all
                   bg-cyan-400 hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
        style={{ backgroundColor: '#7dd3fc', color: '#0369a1' }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = '#38bdf8'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = '#7dd3fc'}
      >
        Start Registration
      </button>
    </div>
  );
}
