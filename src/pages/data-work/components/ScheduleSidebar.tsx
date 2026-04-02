import React, {useState} from 'react';
import {
    Button,
    Divider,
    Empty,
    Form,
    Input,
    InputNumber,
    List,
    message,
    Radio,
    Select,
    Space,
    Switch,
    Tabs,
    Tag,
    Typography,
    Tooltip,
    Slider,
    Collapse
} from 'antd';
import {
    BellOutlined,
    ClockCircleOutlined,
    CloseOutlined,
    DeleteOutlined,
    EditOutlined,
    FileTextOutlined,
    HistoryOutlined,
    LinkOutlined,
    MonitorOutlined,
    PlayCircleOutlined,
    PlusOutlined,
    ReloadOutlined,
    SaveOutlined,
    SettingOutlined,
    ThunderboltOutlined,
    CodeOutlined,
    DatabaseOutlined,
    CloudServerOutlined
} from '@ant-design/icons';
import {ScheduleConfig, ScheduleInstance, SQLEngine} from '../types';

const {Text, Paragraph} = Typography;
const {TextArea} = Input;
const {Panel} = Collapse;

interface ScheduleSidebarProps {
    visible: boolean;
    currentSql: string;
    engine: SQLEngine;
    onClose: () => void;
    onSaveSchedule: (config: ScheduleConfig) => void;
    onRunImmediate: () => void;
}

const ScheduleSidebar: React.FC<ScheduleSidebarProps> = ({
    visible,
    currentSql,
    engine,
    onClose,
    onSaveSchedule,
    onRunImmediate
}) => {
    const [activeTab, setActiveTab] = useState('config');
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [schedules, setSchedules] = useState<ScheduleConfig[]>([]);
    const [instances, setInstances] = useState<ScheduleInstance[]>([]);
    const [editingSchedule, setEditingSchedule] = useState<ScheduleConfig | null>(null);
    
    // 版本管理状态
    const [versions, setVersions] = useState<{id: string; sql: string; version: string; createTime: string}[]>([]);
    
    // 依赖管理状态
    const [dependencies, setDependencies] = useState<{id: string; name: string; type: 'table' | 'task'}[]>([]);
    
    // 资源配置状态
    const [resourceConfig, setResourceConfig] = useState({
        memory: 4,
        cpu: 2,
        parallelism: 4
    });

    // 保存调度配置
    const handleSaveSchedule = async () => {
        try {
            const values = await form.validateFields();
            if (!currentSql.trim()) {
                message.warning('请先输入SQL语句');
                return;
            }
            
            setLoading(true);
            
            const config: ScheduleConfig = {
                ...values,
                id: editingSchedule?.id || Date.now().toString(),
            };
            
            onSaveSchedule(config);
            
            // 更新本地列表
            if (editingSchedule) {
                setSchedules(prev => prev.map(s => s.id === config.id ? config : s));
                message.success('调度配置更新成功');
            } else {
                setSchedules(prev => [config, ...prev]);
                message.success('调度配置保存成功');
            }
            
            // 保存版本
            const newVersion = {
                id: Date.now().toString(),
                sql: currentSql,
                version: `v${versions.length + 1}`,
                createTime: new Date().toLocaleString()
            };
            setVersions(prev => [newVersion, ...prev]);
            
            form.resetFields();
            setEditingSchedule(null);
            setActiveTab('list');
        } catch (error) {
            console.error('保存失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 编辑调度
    const handleEditSchedule = (schedule: ScheduleConfig) => {
        setEditingSchedule(schedule);
        form.setFieldsValue(schedule);
        setActiveTab('config');
    };

    // 删除调度
    const handleDeleteSchedule = (id: string) => {
        setSchedules(prev => prev.filter(s => s.id !== id));
        message.success('调度已删除');
    };

    // 切换调度状态
    const handleToggleSchedule = (id: string, enabled: boolean) => {
        setSchedules(prev => prev.map(s => 
            s.id === id ? {...s, enabled} : s
        ));
        message.success(enabled ? '调度已启用' : '调度已停用');
    };

    // 立即执行
    const handleRunImmediate = () => {
        if (!currentSql.trim()) {
            message.warning('请先输入SQL语句');
            return;
        }
        onRunImmediate();
    };

    // 新建调度配置
    const handleNewSchedule = () => {
        setEditingSchedule(null);
        form.resetFields();
        form.setFieldsValue({
            engine,
            enabled: true,
            retryTimes: 3,
            retryInterval: 5,
            timeout: 60,
        });
        setActiveTab('config');
    };

    // 渲染调度配置表单
    const renderConfigForm = () => (
        <Form
            form={form}
            layout="vertical"
            size="small"
            initialValues={{
                engine,
                enabled: true,
                retryTimes: 3,
                retryInterval: 5,
                timeout: 60,
            }}
        >
            <Form.Item
                name="name"
                label="调度名称"
                rules={[{required: true, message: '请输入调度名称'}]}
            >
                <Input placeholder="请输入调度名称"/>
            </Form.Item>

            <Form.Item
                name="description"
                label="描述"
            >
                <TextArea rows={2} placeholder="请输入描述"/>
            </Form.Item>

            <Form.Item
                name="engine"
                label="执行引擎"
                rules={[{required: true}]}
            >
                <Radio.Group>
                    <Radio.Button value="spark">SparkSQL</Radio.Button>
                    <Radio.Button value="flink">FlinkSQL</Radio.Button>
                </Radio.Group>
            </Form.Item>

            <Divider orientation="left" style={{margin: '12px 0'}}>
                <ClockCircleOutlined /> 调度时间
            </Divider>

            <Form.Item
                name="cronExpression"
                label="Cron 表达式"
                rules={[{required: true, message: '请输入Cron表达式'}]}
                extra="例如: 0 0 2 * * ? (每天凌晨2点执行)"
            >
                <Input placeholder="0 0 2 * * ?"/>
            </Form.Item>

            <Divider orientation="left" style={{margin: '12px 0'}}>
                <SettingOutlined /> 执行设置
            </Divider>

            <Form.Item
                name="timeout"
                label="超时时间（分钟）"
            >
                <InputNumber min={1} max={1440} style={{width: '100%'}}/>
            </Form.Item>

            <Form.Item
                name="retryTimes"
                label="重试次数"
            >
                <InputNumber min={0} max={10} style={{width: '100%'}}/>
            </Form.Item>

            <Form.Item
                name="retryInterval"
                label="重试间隔（分钟）"
            >
                <InputNumber min={1} max={60} style={{width: '100%'}}/>
            </Form.Item>

            <Divider orientation="left" style={{margin: '12px 0'}}>
                <BellOutlined /> 告警设置
            </Divider>

            <Form.Item
                name="alertEmails"
                label="告警邮箱"
                extra="多个邮箱用逗号分隔"
            >
                <Input placeholder="user@example.com"/>
            </Form.Item>

            <Form.Item
                name="alertDingTalk"
                label="钉钉 webhook"
            >
                <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx"/>
            </Form.Item>

            <Form.Item
                name="enabled"
                label="启用状态"
                valuePropName="checked"
            >
                <Switch checkedChildren="启用" unCheckedChildren="停用"/>
            </Form.Item>

            <Form.Item style={{marginBottom: 0}}>
                <Space style={{width: '100%'}} direction="vertical">
                    <Button
                        type="primary"
                        icon={<SaveOutlined/>}
                        onClick={handleSaveSchedule}
                        loading={loading}
                        block
                    >
                        {editingSchedule ? '更新调度' : '保存调度'}
                    </Button>
                    {editingSchedule && (
                        <Button
                            onClick={() => {
                                setEditingSchedule(null);
                                form.resetFields();
                            }}
                            block
                        >
                            取消编辑
                        </Button>
                    )}
                </Space>
            </Form.Item>
        </Form>
    );

    // 渲染调度列表
    const renderScheduleList = () => (
        <div>
            <Button
                type="dashed"
                icon={<PlusOutlined/>}
                onClick={handleNewSchedule}
                block
                style={{marginBottom: 12}}
            >
                新建调度
            </Button>

            {schedules.length > 0 ? (
                <List
                    size="small"
                    dataSource={schedules}
                    renderItem={(item) => (
                        <List.Item
                            actions={[
                                <Switch
                                    key="switch"
                                    size="small"
                                    checked={item.enabled}
                                    onChange={(checked) => handleToggleSchedule(item.id!, checked)}
                                />,
                                <EditOutlined
                                    key="edit"
                                    onClick={() => handleEditSchedule(item)}
                                    style={{color: '#1890ff'}}
                                />,
                                <DeleteOutlined
                                    key="delete"
                                    onClick={() => handleDeleteSchedule(item.id!)}
                                    style={{color: '#ff4d4f'}}
                                />
                            ]}
                        >
                            <List.Item.Meta
                                title={
                                    <Space>
                                        <Text strong style={{fontSize: 12}}>{item.name}</Text>
                                        <Tag color={item.engine === 'spark' ? 'blue' : 'green'} style={{fontSize: 11}}>
                                            {item.engine === 'spark' ? 'SparkSQL' : 'FlinkSQL'}
                                        </Tag>
                                    </Space>
                                }
                                description={
                                    <div>
                                        <Text type="secondary" style={{fontSize: 11}}>
                                            {item.cronExpression}
                                        </Text>
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            ) : (
                <Empty description="暂无调度配置" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
            )}
        </div>
    );

    // 渲染执行历史
    const renderHistory = () => (
        <div style={{height: '100%', overflow: 'auto'}}>
            {instances.length > 0 ? (
                <List
                    size="small"
                    dataSource={instances}
                    renderItem={(item) => (
                        <List.Item>
                            <List.Item.Meta
                                avatar={
                                    <div style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        background: item.status === 'success' ? '#52c41a' : 
                                            item.status === 'failed' ? '#ff4d4f' : 
                                            item.status === 'running' ? '#1890ff' : '#faad14',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {item.status === 'running' ? (
                                            <ReloadOutlined spin style={{color: '#fff', fontSize: 12}}/>
                                        ) : item.status === 'success' ? (
                                            <PlayCircleOutlined style={{color: '#fff', fontSize: 12}}/>
                                        ) : (
                                            <ThunderboltOutlined style={{color: '#fff', fontSize: 12}}/>
                                        )}
                                    </div>
                                }
                                title={
                                    <Space>
                                        <Text strong style={{fontSize: 12}}>{item.scheduleName}</Text>
                                        <Tag color={
                                            item.status === 'success' ? 'success' :
                                            item.status === 'failed' ? 'error' :
                                            item.status === 'running' ? 'processing' : 'warning'
                                        } style={{fontSize: 11}}>
                                            {item.status === 'success' ? '成功' :
                                             item.status === 'failed' ? '失败' :
                                             item.status === 'running' ? '运行中' : '待执行'}
                                        </Tag>
                                    </Space>
                                }
                                description={
                                    <div>
                                        <Text type="secondary" style={{fontSize: 11}}>
                                            {item.startTime}
                                        </Text>
                                        {item.duration && (
                                            <Text type="secondary" style={{fontSize: 11, marginLeft: 8}}>
                                                耗时: {item.duration}ms
                                            </Text>
                                        )}
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            ) : (
                <Empty description="暂无执行历史" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
            )}
        </div>
    );

    // 渲染资源配置
    const renderResources = () => (
        <div style={{padding: '8px 0'}}>
            <Collapse defaultActiveKey={['memory', 'cpu', 'parallel']} ghost>
                <Panel header={<><CloudServerOutlined /> 内存配置</>} key="memory">
                    <div style={{padding: '0 8px'}}>
                        <Text>内存大小 (GB)</Text>
                        <Slider
                            value={resourceConfig.memory}
                            onChange={(v) => setResourceConfig(prev => ({...prev, memory: v}))}
                            min={1}
                            max={64}
                            marks={{1: '1G', 16: '16G', 32: '32G', 64: '64G'}}
                        />
                        <Text type="secondary">当前: {resourceConfig.memory}GB</Text>
                    </div>
                </Panel>
                <Panel header={<><CloudServerOutlined /> CPU配置</>} key="cpu">
                    <div style={{padding: '0 8px'}}>
                        <Text>CPU 核数</Text>
                        <Slider
                            value={resourceConfig.cpu}
                            onChange={(v) => setResourceConfig(prev => ({...prev, cpu: v}))}
                            min={1}
                            max={32}
                            marks={{1: '1核', 8: '8核', 16: '16核', 32: '32核'}}
                        />
                        <Text type="secondary">当前: {resourceConfig.cpu}核</Text>
                    </div>
                </Panel>
                <Panel header={<><CloudServerOutlined /> 并行度配置</>} key="parallel">
                    <div style={{padding: '0 8px'}}>
                        <Text>并行度</Text>
                        <Slider
                            value={resourceConfig.parallelism}
                            onChange={(v) => setResourceConfig(prev => ({...prev, parallelism: v}))}
                            min={1}
                            max={64}
                            marks={{1: '1', 16: '16', 32: '32', 64: '64'}}
                        />
                        <Text type="secondary">当前: {resourceConfig.parallelism}</Text>
                    </div>
                </Panel>
            </Collapse>
            <Divider style={{margin: '12px 0'}}/>
            <Button type="primary" block size="small" icon={<SaveOutlined/>}>
                保存资源配置
            </Button>
        </div>
    );

    // 渲染依赖管理
    const renderDependencies = () => (
        <div>
            <div style={{marginBottom: 12}}>
                <Input.Group compact style={{display: 'flex'}}>
                    <Select
                        placeholder="选择依赖类型"
                        style={{width: 100}}
                        size="small"
                    >
                        <Select.Option value="table">数据表</Select.Option>
                        <Select.Option value="task">上游任务</Select.Option>
                    </Select>
                    <Input
                        placeholder="输入依赖名称"
                        style={{flex: 1}}
                        size="small"
                    />
                    <Button
                        type="primary"
                        icon={<PlusOutlined/>}
                        size="small"
                    />
                </Input.Group>
            </div>
            
            {dependencies.length > 0 ? (
                <List
                    size="small"
                    dataSource={dependencies}
                    renderItem={(item) => (
                        <List.Item
                            actions={[
                                <DeleteOutlined
                                    key="delete"
                                    onClick={() => setDependencies(prev => prev.filter(d => d.id !== item.id))}
                                    style={{color: '#ff4d4f'}}
                                />
                            ]}
                        >
                            <List.Item.Meta
                                avatar={
                                    item.type === 'table' 
                                        ? <DatabaseOutlined style={{color: '#1890ff'}}/>
                                        : <LinkOutlined style={{color: '#52c41a'}}/>
                                }
                                title={<Text style={{fontSize: 12}}>{item.name}</Text>}
                                description={
                                    <Tag color={item.type === 'table' ? 'blue' : 'green'} style={{fontSize: 11}}>
                                        {item.type === 'table' ? '数据表' : '上游任务'}
                                    </Tag>
                                }
                            />
                        </List.Item>
                    )}
                />
            ) : (
                <Empty description="暂无依赖配置" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
            )}
        </div>
    );

    // 渲染版本管理
    const renderVersions = () => (
        <div style={{height: '100%', overflow: 'auto'}}>
            {versions.length > 0 ? (
                <List
                    size="small"
                    dataSource={versions}
                    renderItem={(item) => (
                        <List.Item
                            actions={[
                                <Tooltip key="view" title="查看">
                                    <CodeOutlined style={{color: '#1890ff'}}/>
                                </Tooltip>
                            ]}
                        >
                            <List.Item.Meta
                                avatar={<FileTextOutlined style={{color: '#1890ff'}}/>}
                                title={<Text strong style={{fontSize: 12}}>{item.version}</Text>}
                                description={
                                    <div>
                                        <Text type="secondary" style={{fontSize: 11}}>{item.createTime}</Text>
                                        <Paragraph
                                            ellipsis={{rows: 1}}
                                            style={{fontSize: 11, marginBottom: 0, marginTop: 4}}
                                        >
                                            {item.sql}
                                        </Paragraph>
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            ) : (
                <Empty description="暂无版本记录" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
            )}
        </div>
    );

    // 渲染监控告警
    const renderMonitor = () => (
        <div style={{padding: '8px 0'}}>
            <Collapse defaultActiveKey={['metrics', 'alerts']} ghost>
                <Panel header={<><MonitorOutlined /> 运行指标</>} key="metrics">
                    <div style={{padding: '0 8px'}}>
                        <div style={{marginBottom: 8}}>
                            <Text type="secondary" style={{fontSize: 11}}>今日执行次数</Text>
                            <div><Text strong style={{fontSize: 20, color: '#1890ff'}}>23</Text></div>
                        </div>
                        <div style={{marginBottom: 8}}>
                            <Text type="secondary" style={{fontSize: 11}}>成功率</Text>
                            <div><Text strong style={{fontSize: 20, color: '#52c41a'}}>95.6%</Text></div>
                        </div>
                        <div>
                            <Text type="secondary" style={{fontSize: 11}}>平均执行时间</Text>
                            <div><Text strong style={{fontSize: 20, color: '#faad14'}}>2.3s</Text></div>
                        </div>
                    </div>
                </Panel>
                <Panel header={<><BellOutlined /> 告警记录</>} key="alerts">
                    <div style={{padding: '0 8px'}}>
                        <List
                            size="small"
                            dataSource={[
                                {time: '2024-01-15 10:23', type: '超时', level: 'warning'},
                                {time: '2024-01-14 15:45', type: '失败', level: 'error'},
                            ]}
                            renderItem={(item) => (
                                <List.Item style={{padding: '4px 0'}}>
                                    <Space>
                                        <Tag color={item.level === 'error' ? 'error' : 'warning'}>{item.type}</Tag>
                                        <Text type="secondary" style={{fontSize: 11}}>{item.time}</Text>
                                    </Space>
                                </List.Item>
                            )}
                        />
                    </div>
                </Panel>
            </Collapse>
        </div>
    );

    const tabItems = [
        {
            key: 'config',
            label: (
                <span>
                    <SettingOutlined/>
                    调度配置
                </span>
            ),
            children: renderConfigForm()
        },
        {
            key: 'list',
            label: (
                <span>
                    <ClockCircleOutlined/>
                    调度列表
                </span>
            ),
            children: renderScheduleList()
        },
        {
            key: 'history',
            label: (
                <span>
                    <HistoryOutlined/>
                    执行历史
                </span>
            ),
            children: renderHistory()
        },
        {
            key: 'resources',
            label: (
                <span>
                    <CloudServerOutlined/>
                    资源配置
                </span>
            ),
            children: renderResources()
        },
        {
            key: 'dependencies',
            label: (
                <span>
                    <LinkOutlined/>
                    依赖管理
                </span>
            ),
            children: renderDependencies()
        },
        {
            key: 'versions',
            label: (
                <span>
                    <FileTextOutlined/>
                    版本管理
                </span>
            ),
            children: renderVersions()
        },
        {
            key: 'monitor',
            label: (
                <span>
                    <MonitorOutlined/>
                    监控告警
                </span>
            ),
            children: renderMonitor()
        }
    ];

    if (!visible) return null;

    return (
        <div style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 360,
            background: '#fff',
            borderLeft: '1px solid #f0f0f0',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
            boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)'
        }}>
            {/* 头部 */}
            <div style={{
                padding: '8px 12px',
                borderBottom: '1px solid #f0f0f0',
                background: '#fafafa',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Text strong>任务配置</Text>
                <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined/>}
                    onClick={onClose}
                />
            </div>

            {/* 快捷操作栏 */}
            <div style={{
                padding: '8px 12px',
                borderBottom: '1px solid #f0f0f0',
                background: '#fff'
            }}>
                <Button
                    type="primary"
                    icon={<PlayCircleOutlined/>}
                    onClick={handleRunImmediate}
                    block
                    size="small"
                >
                    立即执行
                </Button>
            </div>

            {/* 标签页内容 */}
            <div style={{flex: 1, overflow: 'hidden'}}>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={tabItems}
                    size="small"
                    style={{padding: '0 12px', height: '100%'}}
                    tabBarStyle={{marginBottom: 8}}
                    tabBarGutter={8}
                />
            </div>
        </div>
    );
};

export default ScheduleSidebar;