import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants/routes';

const TopNavigation = () => (
  <div className="hidden md:block">
    <div className="ml-10 flex items-baseline space-x-6">
      {NAV_ITEMS.map(({ id, path, label, exact }) => (
        <NavLink
          key={id}
          to={path}
          end={exact}
          className={({ isActive }) =>
            `${isActive ? 'text-gray-900 font-medium' : 'text-gray-700 hover:text-blue-600'} px-3 py-2 rounded-md text-sm font-medium transition-colors`
          }
        >
          {label}
        </NavLink>
      ))}
    </div>
  </div>
);

export default TopNavigation;
