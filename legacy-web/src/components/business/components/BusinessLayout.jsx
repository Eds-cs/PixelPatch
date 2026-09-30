// business/components/BusinessLayout.jsx
import BusinessSidebar from "./BusinessSidebar.jsx";

export default function BusinessLayout({ active, children }) {
  return (
    <div className="flex min-h-screen bg-gray-100 font-inter">
      {/* Sidebar */}
      <BusinessSidebar active={active} />
      

      {/* Page Content */}
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
