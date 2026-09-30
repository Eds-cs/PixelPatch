import PropTypes from "prop-types";

const UserAvatar = ({ onClick, showDropdown, dropdownContent }) => {
  const user =
    JSON.parse(localStorage.getItem("user")) ||
    JSON.parse(sessionStorage.getItem("user"));

  const firstName = user?.first_name || "";
  const lastName = user?.last_name || "";
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

  return (
  <div className="relative">
    <button
      onClick={onClick}
      className="
        h-10 w-10 rounded-full
        border-2 border-gray-200 hover:border-blue-500
        transition-colors
        p-0 overflow-hidden
      "
    >
      <span className="sr-only">Open user menu</span>

      <div className="
        h-full w-full
        rounded-full
        bg-gradient-to-br from-blue-100 to-blue-200
        text-blue-900
        flex items-center justify-center
        font-bold shadow
      ">
        {initials}
      </div>
    </button>

    {showDropdown && dropdownContent}
  </div>
  );
};

UserAvatar.propTypes = {
  onClick: PropTypes.func.isRequired,
  showDropdown: PropTypes.bool,
  dropdownContent: PropTypes.node,
};

UserAvatar.defaultProps = {
  showDropdown: false,
  dropdownContent: null,
};

export default UserAvatar;
