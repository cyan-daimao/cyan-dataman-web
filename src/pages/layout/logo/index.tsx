import React from "react";
import logo from "@/assets/react.svg";
import "./index.less";
const Index:React.FC = () => {
  return (
    <div className="sidebar-logo-container">
      <img src={logo} className="sidebar-logo" alt="logo" />
      <h1 className="sidebar-title">Infra-System</h1>
    </div>
  );
};

export default Index;
