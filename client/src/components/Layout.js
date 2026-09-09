import { Outlet } from "react-router-dom";
import Nav from "./nav-component";
import PageFooter from "./pageFooter";
import "./css/layout.css";

const Layout = () => {
  return (
    <div className="app-container">
      <Nav />
      <div className="main">
        <Outlet />
      </div>

      <PageFooter />
    </div>
  );
};

export default Layout;
