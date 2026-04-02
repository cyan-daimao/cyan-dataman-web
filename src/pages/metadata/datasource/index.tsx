import 'antd/dist/reset.css';

function App() {
    // 目标URL
    const targetUrl = 'http://gravitino.cyan.com/';

    return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            {/* iframe 加载指定URL */}
            <iframe
                src={targetUrl}
                title="Gravitino Metalake Page" // 必加的无障碍属性
                width="100%"
                height="100%"
                allowFullScreen // 允许全屏
                style={{ border: 'none' }} // 确保无边框
            />
        </div>
    );
}

export default App;