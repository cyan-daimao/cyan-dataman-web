import React from 'react'
import Layout from "./layout";
import {ConfigProvider, ThemeConfig} from "antd";
import zhCN from 'antd/locale/zh_CN'; // 👈 引入中文包

// 可选：设置 moment 或 dayjs 语言（如果你用到了日期组件）
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn');

/**
 * 全局 Ant Design 主题定制
 * 参考现代数据产品（Superset / Metabase / DataHub）风格：
 * - 主色使用低饱和靛蓝 #4F6DF5
 * - 圆角统一 8px
 * - 背景色柔和
 */
const themeConfig: ThemeConfig = {
    token: {
        // 品牌主色：现代靛蓝，比默认 #1890ff 更高级
        colorPrimary: '#4F6DF5',
        colorPrimaryHover: '#3D5BD9',
        colorPrimaryActive: '#2F4ABF',
        colorPrimaryBg: '#EEF1FF',
        colorPrimaryBgHover: '#DEE3FC',

        // 圆角系统
        borderRadius: 8,
        borderRadiusLG: 12,
        borderRadiusSM: 6,
        borderRadiusXS: 4,

        // 字体颜色层级
        colorText: '#1D2333',
        colorTextSecondary: '#4E5566',
        colorTextTertiary: '#8B909A',
        colorTextQuaternary: '#B0B5BF',

        // 背景色
        colorBgLayout: '#F8F9FA',
        colorBgContainer: '#FFFFFF',
        colorBgElevated: '#FFFFFF',

        // 边框与分割线
        colorBorder: '#EDEFF5',
        colorBorderSecondary: '#E5E8F0',
        colorSplit: '#EDEFF5',

        // 阴影
        boxShadow: '0 4px 12px rgba(29, 35, 51, 0.06)',
        boxShadowSecondary: '0 8px 24px rgba(29, 35, 51, 0.08)',

        // 字体
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    },
    components: {
        // 表格：去边框化，表头柔和背景
        Table: {
            headerBg: '#F8F9FA',
            headerColor: '#4E5566',
            headerSplitColor: '#EDEFF5',
            rowHoverBg: '#F4F6FA',
            borderColor: '#EDEFF5',
            cellPaddingInline: 16,
            cellPaddingBlock: 12,
        },
        // 按钮：统一圆角
        Button: {
            borderRadius: 6,
            borderRadiusLG: 8,
            paddingInline: 16,
            contentFontSize: 14,
        },
        // 卡片：轻阴影
        Card: {
            borderRadius: 12,
            borderRadiusLG: 12,
            boxShadow: '0 4px 12px rgba(29, 35, 51, 0.04)',
            boxShadowTertiary: '0 2px 8px rgba(29, 35, 51, 0.03)',
        },
        // 标签：大圆角 pill 形状
        Tag: {
            borderRadius: 50,
            defaultBg: '#F4F6FA',
            defaultColor: '#4E5566',
        },
        // 输入框
        Input: {
            borderRadius: 8,
            activeBorderColor: '#4F6DF5',
            hoverBorderColor: '#7B8FF7',
            activeShadow: '0 0 0 3px rgba(79, 109, 245, 0.12)',
        },
        // 选择器
        Select: {
            borderRadius: 8,
        },
        // 模态框
        Modal: {
            borderRadius: 12,
            headerBg: '#FFFFFF',
            titleColor: '#1D2333',
            titleFontSize: 16,
            titleLineHeight: 1.5,
        },
        // 菜单
        Menu: {
            borderRadius: 6,
            itemBorderRadius: 6,
            itemSelectedBg: '#EEF1FF',
            itemSelectedColor: '#4F6DF5',
            itemHoverBg: '#F4F6FA',
            itemHoverColor: '#4F6DF5',
            activeBarWidth: 3,
            activeBarBorderWidth: 0,
        },
        // 分页
        Pagination: {
            borderRadius: 6,
            itemActiveBg: '#EEF1FF',
            itemActiveColor: '#4F6DF5',
        },
        // 消息
        Message: {
            borderRadius: 8,
        },
    },
};

const App: React.FC = () => {
    return (
        <ConfigProvider locale={zhCN} theme={themeConfig}>
            <Layout/>
        </ConfigProvider>
    )
}

export default App
