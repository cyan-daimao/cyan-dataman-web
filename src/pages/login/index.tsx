import React, { useState } from 'react';
import { Form, Input, Button, Card, Layout, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom'; // 引入路由钩子
import 'antd/dist/reset.css';
import {login} from "../../api/LoginApi";
import {currentEmployee} from "../../api/EmployeeApi"; // AntD v5 样式引入
import {KEY, setStorage} from "../../utils/storage";
// 类型定义
interface LoginFormValues {
    username: string;
    password: string;
}

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const LoginPage: React.FC = () => {
    // 表单实例
    const [form] = Form.useForm();
    // 加载状态
    const [loading, setLoading] = useState<boolean>(false);
    // 路由导航钩子
    const navigate = useNavigate();
    // 获取路由参数（用于读取原页面地址）
    const location = useLocation();
    /**
     * 登录提交处理函数
     * @param values 表单提交的值
     */
    const handleLogin = async (values: LoginFormValues) => {
        try {
            setLoading(true);
          const resp =  await login({passport:values.username, password:values.password})
            if (resp.code==200){
                // 登录成功后，将 token 存储到 localStorage
                setStorage(KEY.TOKEN, resp.data);
                message.success('登录成功！');
                // 读取跳转前的页面地址，优先跳回原页面，否则跳首页
                // 1. 从路由参数中获取原页面地址（redirect 参数）
                const redirectPath = (location.state?.from as string) || '/';
                // 2. 跳转到目标页面
                navigate(redirectPath, { replace: true }); // replace 避免回退到登录页
            }else{
                message.error(resp.message);
            }
            const employeeDTO = await currentEmployee();
            setStorage(KEY.CURRENT, employeeDTO.data);
        } catch (error) {
            // 登录失败处理
            message.error('登录失败，请检查账号密码！');
            console.error('登录错误:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* 页面头部 */}
            <Header style={{ background: '#fff', padding: '0 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                <Title level={3} style={{ margin: '16px 0', color: '#1890ff' }}>
                    系统登录
                </Title>
            </Header>

            {/* 登录主体 */}
            <Content style={{
                background: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '50px 20px'
            }}>
                <Card
                    style={{
                        width: '100%',
                        maxWidth: 400,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                >
                    <Title level={4} style={{ textAlign: 'center', marginBottom: 30 }}>
                        账号密码登录
                    </Title>

                    {/* 登录表单 */}
                    <Form
                        form={form}
                        name="login_form"
                        initialValues={{ username: 'cyan1', password: '12345' }}
                        onFinish={handleLogin}
                        autoComplete="off"
                    >
                        {/* 用户名输入框 */}
                        <Form.Item
                            name="username"
                            rules={[
                                { required: true, message: '请输入用户名！'},
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined className="site-form-item-icon" />}
                                placeholder="请输入用户名"
                                size="large"
                                value={'cyan1'}
                            />
                        </Form.Item>

                        {/* 密码输入框 */}
                        <Form.Item
                            name="password"
                            rules={[
                                { required: true, message: '请输入密码！' },
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined className="site-form-item-icon" />}
                                placeholder="请输入密码"
                                size="large"
                                value={'123456'}
                            />
                        </Form.Item>

                        {/* 登录按钮 */}
                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                block
                                size="large"
                                style={{ height: 48 }}
                            >
                                登录
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            </Content>

            {/* 页面底部 */}
            <Footer style={{ textAlign: 'center' }}>
                ©{new Date().getFullYear()} 系统登录页面 | 基于 React + AntD 开发
            </Footer>
        </Layout>
    );
};

export default LoginPage;