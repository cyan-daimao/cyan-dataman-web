import React, { useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { login } from "../../api/LoginApi";
import { currentEmployee } from "../../api/EmployeeApi";
import { KEY, setStorage } from "../../utils/storage";
import './index.less';

// 类型定义
interface LoginFormValues {
    username: string;
    password: string;
}

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState<boolean>(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogin = async (values: LoginFormValues) => {
        try {
            setLoading(true);
            const resp = await login({ passport: values.username, password: values.password });
            if (resp.code == 200) {
                setStorage(KEY.TOKEN, resp.data);
                message.success('登录成功！');
                const redirectPath = (location.state?.from as string) || '/';
                navigate(redirectPath, { replace: true });
            } else {
                message.error(resp.message);
                return;
            }
            const employeeDTO = await currentEmployee();
            setStorage(KEY.CURRENT, employeeDTO.data);
        } catch (error) {
            message.error('登录失败，请检查账号密码！');
            console.error('登录错误:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* 背景装饰 */}
            <div className="login-bg-decoration">
                <div className="bg-circle bg-circle-1" />
                <div className="bg-circle bg-circle-2" />
                <div className="bg-circle bg-circle-3" />
            </div>

            <div className="login-container">
                {/* 左侧品牌区 */}
                <div className="login-brand">
                    <div className="brand-content">
                        <div className="brand-logo-text">
                            <span className="brand-en">
                                <span className="brand-en-accent">Data</span>
                                <span className="brand-en-base">Center</span>
                            </span>
                            <span className="brand-cn">数据中心</span>
                        </div>
                        <Text className="brand-slogan">
                            企业级数据资产管理平台
                        </Text>
                        <div className="brand-features">
                            <div className="feature-item">
                                <div className="feature-dot" />
                                <Text>元数据统一管理</Text>
                            </div>
                            <div className="feature-item">
                                <div className="feature-dot" />
                                <Text>指标平台可视化</Text>
                            </div>
                            <div className="feature-item">
                                <div className="feature-dot" />
                                <Text>SQL 在线查询分析</Text>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 右侧表单区 */}
                <div className="login-form-wrapper">
                    <div className="login-form-card">
                        <div className="form-header">
                            <Title level={3} className="form-title">欢迎回来</Title>
                            <Text type="secondary" className="form-subtitle">
                                请登录您的账号以继续
                            </Text>
                        </div>

                        <Form
                            form={form}
                            name="login_form"
                            onFinish={handleLogin}
                            autoComplete="off"
                            layout="vertical"
                            className="login-form"
                        >
                            <Form.Item
                                name="username"
                                label="用户名"
                                rules={[
                                    { required: true, message: '请输入用户名！' },
                                ]}
                            >
                                <Input
                                    prefix={<UserOutlined style={{ color: '#8B909A', marginRight: 8 }} />}
                                    placeholder="请输入用户名"
                                    size="large"
                                    className="login-input"
                                />
                            </Form.Item>

                            <Form.Item
                                name="password"
                                label="密码"
                                rules={[
                                    { required: true, message: '请输入密码！' },
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined style={{ color: '#8B909A', marginRight: 8 }} />}
                                    placeholder="请输入密码"
                                    size="large"
                                    className="login-input"
                                />
                            </Form.Item>

                            <Form.Item style={{ marginTop: 8 }}>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    block
                                    size="large"
                                    className="login-btn"
                                >
                                    登 录
                                </Button>
                            </Form.Item>
                        </Form>

                        <div className="form-footer">
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                ©{new Date().getFullYear()} DATA-CENTER | cyan
                            </Text>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
