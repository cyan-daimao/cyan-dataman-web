import {DatabaseOutlined, FundProjectionScreenOutlined, UploadOutlined, UserOutlined,} from "@ant-design/icons";
import {Menu} from "antd";
import React from "react";

const App: React.FC = () => {
    return (
        <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={['1']}
            items={[
                {
                    key: '1',
                    icon: <UserOutlined/>,
                    label: <a href={'/home/metrics'}>命名空间</a>,
                },
                {
                    key: '2',
                    icon: <DatabaseOutlined/>,
                    label: <a href={'/#'}>数据源</a>,
                },
                {
                    key: '3',
                    icon: <UploadOutlined/>,
                    label: '数据集',
                },
                {
                    key: '4',
                    icon: <FundProjectionScreenOutlined/>,
                    label: '数据分析',
                },
            ]}
        />
    )
}
export default App