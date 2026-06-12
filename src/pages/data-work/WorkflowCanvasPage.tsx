import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    addEdge,
    Background,
    Controls,
    Edge,
    Node,
    ReactFlow,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
    Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeftOutlined, CloudUploadOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Empty, Form, Input, Layout, List, message, Select, Space, Spin, Switch, Tag, Typography } from 'antd';
import {
    createWorkflow,
    getWorkflow,
    getWorkflowDefinition,
    getWorkflowDependencies,
    getWorkflowSchedule,
    EngineType,
    NodeType,
    pageWorkflows,
    publishWorkflow,
    saveWorkflowDefinition,
    saveWorkflowDependencies,
    saveWorkflowSchedule,
    updateWorkflow,
    WorkflowDTO,
} from '@/api/DataworksApi.ts';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const DEFAULT_CRON_EXPRESSION = '0 */10 * * * ?';

const NODE_TEMPLATES: Array<{ nodeType: NodeType; engineType: EngineType; name: string; content: string; color: string }> = [
    { nodeType: 'SHELL', engineType: 'SHELL', name: 'Shell', content: 'echo hello dataworks', color: 'blue' },
    { nodeType: 'PYTHON', engineType: 'PYTHON', name: 'Python', content: 'print("hello dataworks")', color: 'green' },
    { nodeType: 'FLINK_BATCH', engineType: 'FLINK', name: 'FlinkSQL 批任务', content: 'SELECT 1;', color: 'magenta' },
    { nodeType: 'SPARK_SQL', engineType: 'SPARK', name: 'Spark SQL', content: 'SELECT 1;', color: 'orange' },
];

interface WorkflowNodeData extends Record<string, unknown> {
    label: string;
    nodeCode: string;
    nodeName: string;
    engineType: EngineType;
    nodeType: NodeType;
    content: string;
    configJson?: string;
}

const WorkflowCanvasPage: React.FC = () => {
    const { workflowId } = useParams();
    const navigate = useNavigate();
    const isNew = !workflowId || workflowId === 'new';
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [workflow, setWorkflow] = useState<WorkflowDTO | null>(null);
    const [workflows, setWorkflows] = useState<WorkflowDTO[]>([]);
    const [name, setName] = useState('未命名工作流');
    const [description, setDescription] = useState('');
    const [cronExpression, setCronExpression] = useState(DEFAULT_CRON_EXPRESSION);
    const [scheduleEnabled, setScheduleEnabled] = useState(true);
    const [upstreamWorkflowIds, setUpstreamWorkflowIds] = useState<string[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string>();
    const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const workflowOptions = useMemo(() => workflows
        .filter(item => item.id !== workflow?.id)
        .map(item => ({ label: item.name, value: item.id })), [workflow?.id, workflows]);

    const selectedNode = useMemo(() => nodes.find(node => node.id === selectedNodeId), [nodes, selectedNodeId]);

    const loadBaseData = useCallback(async () => {
        try {
            const workflowPage = await pageWorkflows({ current: 1, size: 100 });
            setWorkflows(workflowPage.data || []);
        } catch {
            setWorkflows([]);
        }
    }, []);

    const loadWorkflow = useCallback(async () => {
        if (isNew || !workflowId) {
            return;
        }
        setLoading(true);
        try {
            const [wf, definition, schedule, dependency] = await Promise.all([
                getWorkflow(workflowId),
                getWorkflowDefinition(workflowId),
                getWorkflowSchedule(workflowId).catch(() => null),
                getWorkflowDependencies(workflowId).catch(() => null),
            ]);
            setWorkflow(wf);
            setName(wf.name || '未命名工作流');
            setDescription(wf.description || '');
            setCronExpression(schedule?.cronExpression || DEFAULT_CRON_EXPRESSION);
            setScheduleEnabled(schedule?.enabled ?? true);
            setUpstreamWorkflowIds((dependency?.upstreamWorkflows || []).map(item => item.id));
            setNodes((definition.nodes || []).map(item => ({
                id: item.nodeCode,
                type: 'default',
                position: { x: item.positionX || 120, y: item.positionY || 120 },
                data: {
                    label: item.nodeName,
                    nodeCode: item.nodeCode,
                    nodeName: item.nodeName,
                    engineType: item.engineType,
                    nodeType: item.nodeType,
                    content: item.content || '',
                    configJson: item.configJson || '',
                },
            })));
            setEdges((definition.edges || []).map((item, index) => ({
                id: item.id || `edge-${index}`,
                source: item.upstreamNodeCode || item.upstreamNodeId || '',
                target: item.downstreamNodeCode || item.downstreamNodeId || '',
                animated: true,
            })).filter(item => item.source && item.target));
        } catch {
            message.error('加载工作流失败');
        } finally {
            setLoading(false);
        }
    }, [isNew, setEdges, setNodes, workflowId]);

    useEffect(() => {
        loadBaseData();
    }, [loadBaseData]);

    useEffect(() => {
        loadWorkflow();
    }, [loadWorkflow]);

    const handleAddNode = useCallback((template: typeof NODE_TEMPLATES[number]) => {
        const nodeCode = `node_${template.nodeType.toLowerCase()}_${Date.now()}`;
        setNodes(current => current.concat({
            id: nodeCode,
            type: 'default',
            position: { x: 120 + current.length * 40, y: 120 + current.length * 40 },
            data: {
                label: template.name,
                nodeCode,
                nodeName: template.name,
                engineType: template.engineType,
                nodeType: template.nodeType,
                content: template.content,
                configJson: '',
            },
        }));
    }, [setNodes]);

    const updateSelectedNode = useCallback((patch: Partial<WorkflowNodeData>) => {
        if (!selectedNodeId) {
            return;
        }
        setNodes(current => current.map(node => {
            if (node.id !== selectedNodeId) {
                return node;
            }
            const nextData = { ...node.data, ...patch };
            return {
                ...node,
                data: {
                    ...nextData,
                    label: nextData.nodeName,
                },
            };
        }));
    }, [selectedNodeId, setNodes]);

    const handleChangeSelectedNodeType = useCallback((nodeType: NodeType) => {
        const template = NODE_TEMPLATES.find(item => item.nodeType === nodeType);
        if (!template) {
            return;
        }
        updateSelectedNode({
            nodeType: template.nodeType,
            engineType: template.engineType,
            content: selectedNode?.data.content || template.content,
        });
    }, [selectedNode?.data.content, updateSelectedNode]);

    const handleConnect = useCallback((connection: Connection) => {
        setEdges(current => addEdge({ ...connection, animated: true }, current));
    }, [setEdges]);

    const handleSave = useCallback(async () => {
        if (!name.trim()) {
            message.warning('请输入工作流名称');
            return null;
        }
        if (nodes.length === 0) {
            message.warning('请至少添加一个任务节点');
            return null;
        }
        setSaving(true);
        try {
            const currentWorkflow = workflow && !isNew
                ? (await updateWorkflow(workflow.id, { name: name.trim(), description })).data
                : (await createWorkflow({ name: name.trim(), description })).data;
            await saveWorkflowDefinition(currentWorkflow.id, {
                nodes: nodes.map(node => ({
                    nodeCode: node.data.nodeCode,
                    nodeName: node.data.nodeName,
                    engineType: node.data.engineType,
                    nodeType: node.data.nodeType,
                    content: node.data.content,
                    positionX: Math.round(node.position.x),
                    positionY: Math.round(node.position.y),
                    configJson: node.data.configJson || '',
                })),
                edges: edges.map(edge => ({
                    upstreamNodeCode: edge.source,
                    downstreamNodeCode: edge.target,
                    dependencyType: 'SCHEDULE',
                })),
            });
            await saveWorkflowSchedule(currentWorkflow.id, {
                cronExpression: cronExpression.trim() || DEFAULT_CRON_EXPRESSION,
                enabled: scheduleEnabled,
                schedulerType: 'AIRFLOW',
            });
            await saveWorkflowDependencies(currentWorkflow.id, { upstreamWorkflowIds });
            setWorkflow(currentWorkflow);
            if (isNew) {
                navigate(`/data-work/workflows/${currentWorkflow.id}`, { replace: true });
            }
            message.success('工作流已保存');
            return currentWorkflow;
        } finally {
            setSaving(false);
        }
    }, [cronExpression, description, edges, isNew, name, navigate, nodes, scheduleEnabled, upstreamWorkflowIds, workflow]);

    const handlePublish = useCallback(async () => {
        const savedWorkflow = await handleSave();
        if (!savedWorkflow) {
            return;
        }
        await publishWorkflow(savedWorkflow.id);
        message.success('工作流已发布，Airflow DAG 将在调度器刷新后生效');
    }, [handleSave]);

    return (
        <ReactFlowProvider>
            <Layout style={{ height: '100%', minHeight: 0, background: '#f5f7fa' }}>
                <Header style={{ height: 48, lineHeight: '48px', background: '#fff', borderBottom: '1px solid #e5e6eb', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/data-work')} />
                    <Input value={name} onChange={event => setName(event.target.value)} style={{ width: 260 }} />
                    <Input value={description} onChange={event => setDescription(event.target.value)} placeholder="描述" style={{ width: 320 }} />
                    <Space style={{ marginLeft: 'auto' }}>
                        <Button icon={<SaveOutlined />} loading={saving} onClick={handleSave}>保存</Button>
                        <Button type="primary" icon={<CloudUploadOutlined />} loading={saving} onClick={handlePublish}>发布</Button>
                    </Space>
                </Header>
                <Layout style={{ minHeight: 0 }}>
                    <Sider width={260} theme="light" style={{ borderRight: '1px solid #e5e6eb', overflow: 'auto' }}>
                        <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
                            <Text strong>任务节点</Text>
                        </div>
                        <List
                            dataSource={NODE_TEMPLATES}
                            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无节点类型" /> }}
                            renderItem={template => (
                                <List.Item style={{ padding: '10px 12px' }} actions={[<Button key="add" size="small" icon={<PlusOutlined />} onClick={() => handleAddNode(template)} />]}>
                                    <List.Item.Meta
                                        title={<span style={{ fontSize: 13 }}>{template.name}</span>}
                                        description={<Tag color={template.color}>{template.nodeType}</Tag>}
                                    />
                                </List.Item>
                            )}
                        />
                    </Sider>
                    <Content style={{ minWidth: 0, minHeight: 0, position: 'relative' }}>
                        {loading && (
                            <Spin
                                spinning
                                style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            />
                        )}
                        <div style={{ height: '100%', width: '100%', minHeight: 0 }}>
                            <ReactFlow<Node<WorkflowNodeData>, Edge>
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={handleConnect}
                                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                                fitView
                            >
                                <Background />
                                <Controls />
                            </ReactFlow>
                        </div>
                    </Content>
                    <Sider width={320} theme="light" style={{ borderLeft: '1px solid #e5e6eb', padding: 16, overflow: 'auto' }}>
                        <Form layout="vertical">
                            {selectedNode && (
                                <>
                                    <Form.Item label="节点名称">
                                        <Input value={selectedNode.data.nodeName} onChange={event => updateSelectedNode({ nodeName: event.target.value })} />
                                    </Form.Item>
                                    <Form.Item label="节点类型">
                                        <Select
                                            value={selectedNode.data.nodeType}
                                            options={NODE_TEMPLATES.map(item => ({ label: item.name, value: item.nodeType }))}
                                            onChange={handleChangeSelectedNodeType}
                                        />
                                    </Form.Item>
                                    <Form.Item label="节点内容">
                                        <Input.TextArea
                                            value={selectedNode.data.content}
                                            onChange={event => updateSelectedNode({ content: event.target.value })}
                                            autoSize={{ minRows: 8, maxRows: 16 }}
                                        />
                                    </Form.Item>
                                    <Form.Item label="配置 JSON">
                                        <Input.TextArea
                                            value={selectedNode.data.configJson}
                                            onChange={event => updateSelectedNode({ configJson: event.target.value })}
                                            autoSize={{ minRows: 3, maxRows: 8 }}
                                        />
                                    </Form.Item>
                                </>
                            )}
                            <Form.Item label="启用调度">
                                <Switch checked={scheduleEnabled} onChange={setScheduleEnabled} />
                            </Form.Item>
                            <Form.Item label="Cron 表达式">
                                <Input value={cronExpression} onChange={event => setCronExpression(event.target.value)} />
                            </Form.Item>
                            <Form.Item label="DAG 级上游工作流">
                                <Select
                                    mode="multiple"
                                    allowClear
                                    value={upstreamWorkflowIds}
                                    options={workflowOptions}
                                    onChange={setUpstreamWorkflowIds}
                                    placeholder="选择同周期依赖的上游工作流"
                                />
                            </Form.Item>
                            <Form.Item label="节点数量">
                                <Tag>{nodes.length}</Tag>
                            </Form.Item>
                            <Form.Item label="连线数量">
                                <Tag>{edges.length}</Tag>
                            </Form.Item>
                        </Form>
                    </Sider>
                </Layout>
            </Layout>
        </ReactFlowProvider>
    );
};

export default WorkflowCanvasPage;
