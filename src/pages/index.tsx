import React from 'react'
import Layout from "./layout";
import {ConfigProvider} from "antd";
import zhCN from 'antd/locale/zh_CN'; // 👈 引入中文包

// 可选：设置 moment 或 dayjs 语言（如果你用到了日期组件）
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn');

const App: React.FC = () => {
    return (
        <ConfigProvider locale={zhCN}>
            <Layout/>
        </ConfigProvider>
    )
}

export default App