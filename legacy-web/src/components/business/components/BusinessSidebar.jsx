import { Link } from "react-router-dom";
import { ROUTES } from "../../../constants/routes";
import {
  LayoutDashboard,
  Wrench,
  Notebook,
  Tag,
  Star,
  Settings,
  HelpCircle,
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", route: ROUTES.BUSINESS.DASHBOARD, icon: LayoutDashboard },
  { label: "Repair", route: ROUTES.BUSINESS.REPAIRS, icon: Wrench, group: "Request" },
  { label: "Disputes", route: ROUTES.BUSINESS.DISPUTES, icon: Notebook },
  { label: "Services", route: ROUTES.BUSINESS.SERVICES, icon: Notebook },
  { label: "Discounts", route: ROUTES.BUSINESS.DISCOUNTS, icon: Tag },
  { label: "Reviews", route: ROUTES.BUSINESS.REVIEWS, icon: Star },
];

const settingsItems = [
  { label: "Settings", route: ROUTES.BUSINESS.SETTINGS, icon: Settings },
  { label: "Help", route: ROUTES.HELP, icon: HelpCircle },
];

export default function BusinessSidebar({ active }) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
      <div className="py-6 px-4">
        {/* Logo */}
        {/* <Link to="/" className="text-2xl font-extrabold text-blue-600 px-2">
          PixelPatch
        </Link> */}

        {/* Navigation */}
        <nav className="mt-8 space-y-2">

          {/* MAIN MENU */}
          {menuItems.map((item, index) => {
            const Icon = item.icon;

            // Section label
            const isFirstInGroup =
              item.group &&
              (index === 0 || menuItems[index - 1].group !== item.group);

            return (
              <div key={item.route}>
                {isFirstInGroup && (
                  <span className="block px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {item.group}
                  </span>
                )}

                <Link
                  to={item.route}
                  className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                    active === item.label.toLowerCase()
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="ml-3 text-sm font-medium">{item.label}</span>
                </Link>
              </div>
            );
          })}

          {/* SETTINGS */}
          <span className="block px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Settings
          </span>

          {settingsItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.route}
                to={item.route}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                  active === item.label.toLowerCase()
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="ml-3 text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
