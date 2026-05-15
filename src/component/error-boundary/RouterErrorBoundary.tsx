import React from 'react';
import { Button, Result } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/**
 * 路由级错误边界，捕获 React.lazy 动态导入失败等渲染错误。
 *
 * 常见场景：新部署后浏览器缓存了旧 index.html，引用已不存在的 chunk 文件，
 * 用户点击导航到未加载过的页面时触发 "Failed to fetch dynamically imported module"。
 */
class RouterErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[RouterErrorBoundary]', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            const isChunkError =
                this.state.error?.message?.includes('dynamically imported module') ||
                this.state.error?.message?.includes('Loading chunk');

            return (
                <Result
                    status="warning"
                    title={isChunkError ? '页面资源已更新' : '页面加载失败'}
                    subTitle={
                        isChunkError
                            ? '系统已发布新版本，当前页面资源已过期，请点击刷新获取最新版本。'
                            : '发生未知错误，请刷新页面重试。'
                    }
                    extra={
                        <Button
                            type="primary"
                            icon={<ReloadOutlined />}
                            onClick={this.handleReload}
                        >
                            刷新页面
                        </Button>
                    }
                    style={{
                        height: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                    }}
                />
            );
        }

        return this.props.children;
    }
}

export default RouterErrorBoundary;
