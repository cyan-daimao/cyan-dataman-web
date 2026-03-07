import React from 'react';
import {Layout, Menu, MenuProps, theme} from 'antd';
import Logo from "./logo";
import {Outlet} from "react-router-dom";

const {Header, Content, Footer} = Layout;

const items: MenuProps['items'] = [
    {
        label: <a href={'/metadata'}>元数据</a>,
        key: '1',
    },
    {
        label: <a href={'/metrics'}>指标平台</a>,
        key: '2',
    },
    {
        label: '自助取数',
        key: '3',
    }
]

const App: React.FC = () => {

    const {
        token: {colorBgContainer, borderRadiusLG},
    } = theme.useToken();

    return (
        <Layout style={{minHeight: '100vh', display: 'flex', flexDirection: 'column'}}>
            <Header style={{display: 'flex', alignItems: 'center', background: "#fff", color: '#333', flexShrink: 0}}>
                <div style={{background: "#fff"}}>
                    <Logo/>
                </div>
                <Menu
                    theme="light"
                    mode="horizontal"
                    defaultSelectedKeys={['1']}
                    items={items}
                    style={{flex: 1, minWidth: 0, marginLeft: 24}}
                />
            </Header>
            <Content style={{flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
                <div
                    style={{
                        background: colorBgContainer,
                        flex: 1,
                        padding: 24,
                        borderRadius: borderRadiusLG,
                        boxSizing: 'border-box',
                        display: 'flex',
                    }}
                >
                    <Outlet/>
                </div>
            </Content>
            <Footer style={{textAlign: 'center', flexShrink: 0, padding: '8px 16px',}}>
                Infra-System ©{new Date().getFullYear()} Created by cyan
            </Footer>

        </Layout>
    );
};

export default App;