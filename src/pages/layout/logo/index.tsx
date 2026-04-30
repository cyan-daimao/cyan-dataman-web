import React from "react";
import "./index.less";

const Logo: React.FC = () => {
    return (
        <div className="sidebar-logo-container">
            <span className="logo-en">
                <span className="logo-en-accent">Data</span>
                <span className="logo-en-base">Center</span>
            </span>
            <span className="logo-cn">数据中心</span>
        </div>
    );
};

export default Logo;
