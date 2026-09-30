import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 py-16">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link to="/" className="text-2xl font-extrabold text-blue-600">PixelPatch</Link>
            <p className="mt-3 text-sm text-gray-600">Where technology and expertise meet to bring your gadgets back to life.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Quick Links</h3>
            <ul className="mt-4 space-y-3">
              <li><Link to="/services" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Find Service</Link></li>
              <li><Link to="/services" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Services</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Company</h3>
            <ul className="mt-4 space-y-3">
              <li><Link to="/about" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">About</Link></li>
              <li><Link to="/careers" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Career</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Support</h3>
            <ul className="mt-4 space-y-3">
              <li><Link to="/help" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Help Center</Link></li>
              <li><Link to="/terms" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Connect With Us</h3>
            <ul className="mt-4 space-y-3">
              <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Facebook</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 py-6">
          <p className="text-center text-sm text-gray-500">&copy; {new Date().getFullYear()} PixelPatch Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;