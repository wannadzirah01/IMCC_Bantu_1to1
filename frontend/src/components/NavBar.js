import { Link, useMatch, useResolvedPath } from "react-router-dom"

export default function NavBar() {
    return <nav className="nav">
        <Link to="/home" className="site-title">
            <img src="./USM_LOGO.png" alt="" width={100} height={36}/>
            <img src="./IMCC_LOGO.png" alt="" width={100} height={36}/>
            IMCC Bantu: 1 to 1
        </Link>
        <ul>
            <CustomLink to="/@me">User</CustomLink>
            <CustomLink to="/ticketMonitoring">Bantu Packages</CustomLink>
            <CustomLink to="/forum">Forum</CustomLink>
            <CustomLink to="/invoiceStatus">Invoice Status</CustomLink>
        </ul>
    </nav>
}

function CustomLink({ to, children, ...props }) {
    const resolvedPath = useResolvedPath(to)
    const isActive = useMatch({ path: resolvedPath.pathname, end: true })
    return (
        <li className={isActive ? "active" : ""}>
            <Link to={to} {...props}>{children}</Link>
        </li>
    )
}