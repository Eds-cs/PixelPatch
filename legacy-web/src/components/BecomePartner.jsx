
import { Link } from 'react-router-dom';

const BecomePartner = () => {
  return (
    <div className="bg-white text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <main>
          <div className="py-16 md:py-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="text-center md:text-left">
                <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight">Grow your Repair Business with <span className="text-blue-600">PixelPatch</span></h1>
                <p className="mt-6 text-lg text-gray-600 max-w-lg mx-auto md:mx-0">Join our network of trusted repair shops and connect with clients who need electronic repairs every day.</p>
                
                <div className="mt-8 flex justify-center md:justify-start">
                  <Link
                  to="/business-sign-up/step-1" 
                  className="flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-md"
                  >
                    Register Your Business
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4l-8 8-4-4-6 6"/>                       
                    </svg>
                  </Link>
                </div>
                
              </div>
              <div className="flex items-center justify-center">
                <img src="https://placehold.co/500x350/e0f2fe/3b82f6?text=Partner+Working&font=inter" alt="A technician wearing goggles works on a circuit board" className="rounded-lg w-full max-w-md md:max-w-full h-auto shadow-lg" />
              </div>
            </div>
          </div>

          <div className="bg-blue-50/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 space-y-20">
              <section className="text-center">
                <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-12">Why Partner With Us</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow text-left">
                    <h3 className="font-semibold text-gray-900">Get new clients</h3>
                    <p className="text-sm text-gray-600 mt-1">Connect with a steady stream of customers actively seeking repairs.</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow text-left">
                    <h3 className="font-semibold text-gray-900">Smart AI Referrals</h3>
                    <p className="text-sm text-gray-600 mt-1">Our AI matches the right job to your shop's specialties.</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow text-left">
                    <h3 className="font-semibold text-gray-900">Secure Payments</h3>
                    <p className="text-sm text-gray-600 mt-1">Reliable and easy payment processing through our platform.</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow text-left">
                    <h3 className="font-semibold text-gray-900">Analytics Dashboard</h3>
                    <p className="text-sm text-gray-600 mt-1">Track your performance, earnings, and customer ratings.</p>
                  </div>
                </div>
              </section>

              <section className="text-center">
                <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-12">How It Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-600 text-white mb-4">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </div>
                    <h3 className="font-semibold text-gray-900">Sign Up Your Business</h3>
                    <p className="text-sm text-gray-600 mt-1">Fill out our simple registration form with your shop's details and services.</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-600 text-white mb-4">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <h3 className="font-semibold text-gray-900">Get Verified</h3>
                    <p className="text-sm text-gray-600 mt-1">Submit your business documents for our team to review and approve.</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-600 text-white mb-4">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                    </div>
                    <h3 className="font-semibold text-gray-900">Start Receiving Jobs</h3>
                    <p className="text-sm text-gray-600 mt-1">Once approved, you'll appear in search results and start getting client requests.</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-600 text-white mb-4">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                    </div>
                    <h3 className="font-semibold text-gray-900">Earn & Grow</h3>
                    <p className="text-sm text-gray-600 mt-1">Complete jobs, get paid, and build your reputation on PixelPatch.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 text-center mb-12">Requirements for Partnership</h2>
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow space-y-4">
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <div className="ml-3">
                        <h3 className="font-semibold text-gray-900">Valid Business Permit</h3>
                        <p className="text-sm text-gray-600">Issued by your local municipality.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <div className="ml-3">
                        <h3 className="font-semibold text-gray-900">DTI / SEC Registration</h3>
                        <p className="text-sm text-gray-600">Proof of official business registration.</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow space-y-4">
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <div className="ml-3">
                        <h3 className="font-semibold text-gray-900">Valid ID of Owner / Rep</h3>
                        <p className="text-sm text-gray-600">Government-issued photo ID.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <div className="ml-3">
                        <h3 className="font-semibold text-gray-900">Service Address & Price List</h3>
                        <p className="text-sm text-gray-600">List of services offered and pricing.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <div className="ml-3">
                        <h3 className="font-semibold text-gray-900">Active Phone Number</h3>
                        <p className="text-sm text-gray-600">For client and system communication.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm text-gray-600 mt-6">Reminder: Prepare these before you click Register to speed up verification.</p>
              </section>

              <section className="mt-12 text-center">
                <div className="max-w-5xl mx-auto text-center">
                  <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Testimonials</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 max-w-7xl mx-auto">
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 flex flex-col items-center text-center">
                    <img className="h-20 w-20 rounded-full" src="https://placehold.co/100x100/e0f2fe/3b82f6?text=U1&font=inter" alt="User 1" />
                    <h3 className="mt-4 font-semibold text-lg text-gray-900">Jane Doe</h3>
                    <p className="text-sm text-blue-600 font-medium">Tech Enthusiast</p>
                    <blockquote className="mt-4 text-gray-700 relative">“PixelPatch is so easy for me to fix my phone, the diagnosis is always on point. Highly recommended.”</blockquote>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 flex flex-col items-center text-center">
                    <img className="h-20 w-20 rounded-full" src="https://placehold.co/100x100/e0f2fe/3b82f6?text=U2&font=inter" alt="User 2" />
                    <h3 className="mt-4 font-semibold text-lg text-gray-900">John Smith</h3>
                    <p className="text-sm text-blue-600 font-medium">Gamer</p>
                    <blockquote className="mt-4 text-gray-700 relative">“Used this to find a shop that could fix my console's drift issue. Found one in 10 minutes. 10/10.”</blockquote>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 flex flex-col items-center text-center">
                    <img className="h-20 w-20 rounded-full" src="https://placehold.co/100x100/e0f2fe/3b82f6?text=U3&font=inter" alt="User 3" />
                    <h3 className="mt-4 font-semibold text-lg text-gray-900">Sarah Lee</h3>
                    <p className="text-sm text-blue-600 font-medium">Student</p>
                    <blockquote className="mt-4 text-gray-700 relative">“My laptop screen cracked, and the AI Assistant helped me figure out what part I needed before I even went to the shop!”</blockquote>
                  </div>
                </div>
              </section>

              <section className="text-center mt-12 mb-20">
                <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Ready to Grow Your Repair Business?</h2>
                <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">Join now and start connecting with clients today.</p>
                <div className="mt-8">
                  <a href="#" className="flex items-center justify-center w-auto max-w-xs mx-auto px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-md">Become a Partner Now
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                  </a>
                </div>
              </section>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default BecomePartner;