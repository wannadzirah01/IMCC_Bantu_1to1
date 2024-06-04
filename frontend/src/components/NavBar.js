import { Link, useMatch, useResolvedPath, useNavigate } from "react-router-dom";
import axios from "../api/axios";

function NavBar({ userRole, setUserRole }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post("http://localhost:5000/logout", {}, { withCredentials: true });
      setUserRole('');
      navigate("/");
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <nav className="nav">
      <Link className="site-title">
        <img src="./USM_LOGO.png" alt="USM Logo" width={100} height={36} />
        <img src="./IMCC_LOGO.png" alt="IMCC Logo" width={100} height={36} />
        IMCC Bantu: 1 to 1
      </Link>
      <ul>
        <CustomLink to="/@me">User</CustomLink>
        {userRole == "client" && (
          <CustomLink to="/packageListing">Bantu Packages</CustomLink>
        )}
        <CustomLink to="/ticketManagement">Service Status</CustomLink>
        {/* <CustomLink to="/complaintStatus">Complaint Status</CustomLink> */}
        <CustomLink to="/dashboard">Dashboard</CustomLink>
        <CustomLink to="/forum">Forum</CustomLink>
        {userRole ? (
            <div className="button-general-logout">
                <button onClick={handleLogout}>Logout</button>
            </div>
        ) : (
            <div className="link">
                <Link to="/">Login</Link>
            </div>
        )}
      </ul>
    </nav>
  );
}

function CustomLink({ to, children, ...props }) {
  const resolvedPath = useResolvedPath(to);
  const isActive = useMatch({ path: resolvedPath.pathname, end: true });
  return (
    <li className={isActive ? "active" : ""}>
      <Link to={to} {...props}>{children}</Link>
    </li>
  );
}

export default NavBar;