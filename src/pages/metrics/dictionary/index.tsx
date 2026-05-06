import React, { useEffect, useState } from 'react';
import {
    Card, Tree, Input, List, Tag, Spin, Empty, Drawer, Tabs, Typography, Button,
    Space, Segmented, Table, message, Switch, Row, Col, Pagination,
} from 'antd';
import {
    StarOutlined, StarFilled, FileTextOutlined,
    BranchesOutlined, AppstoreOutlined, EyeOutlined, PlayCircleOutlined,
} from '@ant-design/icons';
import {
    MetricDictionaryApi, MetricApi, MetricLineageApi,
    DictionaryMetricDTO, MetricDetail, MetricType, MetricStatus, LineageResult, NodeType,
} from '@/api/MetricApi';
import { MetricSubjectApi, MetricSubject } from '@/api/MetricSubjectApi';
import { executeSql } from '@/api/DatagawayApi';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const typeTagMap: Record<string, { color: string; label: string }> = {
    ATOMIC: { color: 'blue', label: '原子' },
    DERIVED: { color: 'green', label: '派生' },
    COMPOSITE: { color: 'purple', label: '复合' },
};

const statusTagMap: Record<string, { color: string; label: string }> = {
    DRAFT: { color: 'default', label: '草稿' },
    PUBLISHED: { color: 'success', label: '已发布' },
    OFFLINE: { color: 'error', label: '已下线' },
};

const MetricsDictionary: React.FC = () => {
    const [subjects, setSubjects] = useState<MetricSubject[]>([]);
    const [subjectLoading, setSubjectLoading] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<string | undefined>(undefined);

    const [query, setQuery] = useState('');
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [data, setData] = useState<DictionaryMetricDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [pageNum, setPageNum] = useState(1);
    const [pageSize] = useState(20);
    const [total, setTotal] = useState(0);

    const [drawerVisible, setDrawerVisible] = useState(false);
    const [detail, setDetail] = useState<MetricDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [lineage, setLineage] = useState<LineageResult | null>(null);
    const [lineageLoading, setLineageLoading] = useState(false);
    const [sql, setSql] = useState<string>('');
    const [sqlLoading, setSqlLoading] = useState(false);
    const [trialLoading, setTrialLoading] = useState(false);
    const [sqlResult, setSqlResult] = useState<any>(null);
    const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);

    const fetchSubjects = async () => {
        setSubjectLoading(true);
        try {
            const res = await MetricSubjectApi.tree();
            setSubjects(res);
        } catch {
            message.error('加载主题域失败');
        } finally {
            setSubjectLoading(false);
        }
    };

    const fetchData = async (page = 1, subjectCode?: string, search?: string, favorite?: boolean) => {
        setLoading(true);
        try {
            const res = await MetricDictionaryApi.page({
                pageNum: page,
                pageSize,
                subjectCode,
                metricName: search,
                favorite,
            });
            if (res.code === 200 && res.data) {
                setData(res.data.list);
                setTotal(res.data.total);
            }
        } catch {
            message.error('加载指标列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubjects();
        fetchData(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubjectSelect = (_: React.Key[], info: { node: { key: string; subjectCode?: string } }) => {
        const code = info.node.subjectCode || String(info.node.key);
        setSelectedSubject(code);
        setPageNum(1);
        fetchData(1, code, query, showFavoriteOnly);
    };

    const handleSelectAllSubjects = () => {
        setSelectedSubject(undefined);
        setPageNum(1);
        fetchData(1, undefined, query, showFavoriteOnly);
    };

    const handleToggleFavoriteOnly = (checked: boolean) => {
        setShowFavoriteOnly(checked);
        setPageNum(1);
        fetchData(1, selectedSubject, query, checked);
    };

    const handleSearch = (value: string) => {
        setQuery(value);
        setPageNum(1);
        fetchData(1, selectedSubject, value, showFavoriteOnly);
    };

    const handlePageChange = (page: number) => {
        setPageNum(page);
        fetchData(page, selectedSubject, query, showFavoriteOnly);
    };

    const buildDefinitionBody = (d: MetricDetail): Record<string, unknown> => {
        if (d.metricType === MetricType.ATOMIC && d.atomic) {
            return {
                statFunc: d.atomic.statFunc,
                dsName: d.atomic.dsName,
                dbName: d.atomic.dbName,
                tblName: d.atomic.tblName,
                colName: d.atomic.colName,
                filterCondition: d.atomic.filterCondition || [],
            };
        }
        if (d.metricType === MetricType.DERIVED && d.derived) {
            return {
                atomicMetricId: d.derived.atomicMetricId,
                timePeriodId: d.derived.timePeriodId,
                modifierIds: d.derived.modifierIds || [],
                dimensionIds: d.derived.dimensionIds || [],
                groupByFields: d.derived.groupByFields || [],
            };
        }
        if (d.metricType === MetricType.COMPOSITE && d.composite) {
            return {
                formula: d.composite.formula,
                metricRefs: d.composite.metricRefs || [],
            };
        }
        return {};
    };

    const fetchSql = async (d: MetricDetail) => {
        if (!d.metricType) return;
        setSqlLoading(true);
        try {
            const definitionBody = buildDefinitionBody(d);
            const res = await MetricApi.previewSql({ metricType: d.metricType, definitionBody });
            if (res.code === 200 && res.data) {
                setSql(res.data);
            }
        } catch {
            message.error('SQL生成失败');
        } finally {
            setSqlLoading(false);
        }
    };

    const handleTrial = async (d: MetricDetail) => {
        setTrialLoading(true);
        try {
            let currentSql = sql;
            if (!currentSql) {
                const definitionBody = buildDefinitionBody(d);
                const previewRes = await MetricApi.previewSql({ metricType: d.metricType, definitionBody });
                if (previewRes.code === 200 && previewRes.data) {
                    currentSql = previewRes.data;
                    setSql(currentSql);
                } else {
                    message.error(previewRes.message || 'SQL生成失败');
                    return;
                }
            }
            const res = await executeSql(currentSql);
            if (res.code === 200 && res.data) {
                setSqlResult(res.data);
            } else {
                message.error(res.message || '试算失败');
            }
        } catch (err: any) {
            message.error(err?.message || 'SQL试算失败');
        } finally {
            setTrialLoading(false);
        }
    };

    const openDetail = async (id: string) => {
        setDrawerVisible(true);
        setDetailLoading(true);
        setLineageLoading(true);
        setSql('');
        setSqlResult(null);
        try {
            const res = await MetricApi.detail(id);
            if (res.code === 200 && res.data) {
                setDetail(res.data);
                // 自动加载SQL
                fetchSql(res.data);
            }
        } catch {
            message.error('加载详情失败');
        } finally {
            setDetailLoading(false);
        }

        try {
            const lineageRes = await MetricLineageApi.getLineage(id);
            if (lineageRes.code === 200 && lineageRes.data) {
                setLineage(lineageRes.data);
            }
        } catch {
            // ignore
        } finally {
            setLineageLoading(false);
        }
    };

    const toggleFavorite = async (item: DictionaryMetricDTO, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            if (item.isFavorite) {
                await MetricDictionaryApi.unfavorite(item.id);
                message.success('已取消收藏');
            } else {
                await MetricDictionaryApi.favorite(item.id);
                message.success('已收藏');
            }
            fetchData(pageNum, selectedSubject, query, showFavoriteOnly);
        } catch {
            message.error('操作失败');
        }
    };

    const buildTreeData = (list: MetricSubject[]): React.ComponentProps<typeof Tree>['treeData'] => {
        return list.map(item => ({
            key: item.id,
            title: item.subjectName,
            subjectCode: item.subjectCode,
            children: item.children ? buildTreeData(item.children) : undefined,
        }));
    };

    const renderLineageNode = (node: { id: string; name: string; nodeType: NodeType; children?: { id: string; name: string; nodeType: NodeType; children?: unknown[] }[] }) => {
        const icon = node.nodeType === NodeType.METRIC ? <FileTextOutlined /> : node.nodeType === NodeType.TABLE ? <AppstoreOutlined /> : <BranchesOutlined />;
        return (
            <div key={node.id} style={{ marginLeft: 16, marginTop: 8 }}>
                <Space>
                    {icon}
                    <Text strong>{node.name}</Text>
                    <Tag size="small">{node.nodeType}</Tag>
                </Space>
                {node.children && node.children.length > 0 && (
                    <div style={{ borderLeft: '1px dashed #d9d9d9', paddingLeft: 8 }}>
                        {node.children.map(child => renderLineageNode(child as { id: string; name: string; nodeType: NodeType; children?: { id: string; name: string; nodeType: NodeType; children?: unknown[] }[] }))}
                    </div>
                )}
            </div>
        );
    };

    const listColumns = [
        { title: '指标编码', dataIndex: 'metricCode', key: 'metricCode' },
        { title: '指标名称', dataIndex: 'metricName', key: 'metricName' },
        {
            title: '类型',
            dataIndex: 'metricType',
            key: 'metricType',
            render: (v: MetricType) => <Tag color={typeTagMap[v]?.color}>{typeTagMap[v]?.label}</Tag>,
        },
        { title: '主题域', dataIndex: 'subjectName', key: 'subjectName' },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (v: MetricStatus) => <Tag color={statusTagMap[v]?.color}>{statusTagMap[v]?.label}</Tag>,
        },
        { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt' },
        {
            title: '操作',
            key: 'action',
            render: (_: unknown, record: DictionaryMetricDTO) => (
                <Space>
                    <Button type="link" onClick={() => openDetail(record.id)}>详情</Button>
                    <Button type="link" icon={record.isFavorite ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />} onClick={(e) => toggleFavorite(record, e)}>
                        {record.isFavorite ? '已收藏' : '收藏'}
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ display: 'flex', height: '100%', gap: 16 }}>
            {/* 左侧主题域树 */}
            <Card
                title="主题域"
                style={{ width: 260, minWidth: 260, overflow: 'auto' }}
                styles={{ body: { padding: '12px' } }}
            >
                <Button
                    type={selectedSubject === undefined ? 'primary' : 'default'}
                    block
                    style={{ marginBottom: 12 }}
                    onClick={handleSelectAllSubjects}
                >
                    全部主题
                </Button>
                {subjectLoading ? (
                    <Spin size="small" />
                ) : (
                    <Tree
                        treeData={buildTreeData(subjects)}
                        defaultExpandAll
                        onSelect={handleSubjectSelect}
                        selectedKeys={selectedSubject ? [selectedSubject] : []}
                    />
                )}
            </Card>

            {/* 右侧内容 */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                <Card
                    title={
                        <Space>
                            <Title level={5} style={{ margin: 0 }}>指标字典</Title>
                        </Space>
                    }
                    extra={
                        <Space>
                            <Input.Search
                                placeholder="搜索指标名称"
                                allowClear
                                onSearch={handleSearch}
                                style={{ width: 240 }}
                            />
                            <Switch
                                checked={showFavoriteOnly}
                                onChange={handleToggleFavoriteOnly}
                                checkedChildren="只看收藏"
                                unCheckedChildren="全部"
                            />
                            <Segmented
                                value={viewMode}
                                onChange={(v) => setViewMode(v as 'card' | 'list')}
                                options={[
                                    { label: '卡片', value: 'card' },
                                    { label: '列表', value: 'list' },
                                ]}
                            />
                        </Space>
                    }
                >
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <Spin tip="加载中..." />
                        </div>
                    ) : data.length === 0 ? (
                        <Empty description="暂无指标数据" />
                    ) : viewMode === 'card' ? (
                        <>
                            <Row gutter={[16, 16]}>
                                {data.map(item => (
                                    <Col key={item.id} xs={24} sm={12} md={8} lg={8} xl={6}>
                                        <Card
                                            hoverable
                                            size="small"
                                            onClick={() => openDetail(item.id)}
                                            style={{ height: 170 }}
                                            title={
                                                <Space>
                                                    <Text strong ellipsis style={{ maxWidth: 140 }}>{item.metricName}</Text>
                                                    <Tag color={typeTagMap[item.metricType]?.color}>{typeTagMap[item.metricType]?.label}</Tag>
                                                </Space>
                                            }
                                            extra={
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={item.isFavorite ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                                                    onClick={(e) => toggleFavorite(item, e)}
                                                />
                                            }
                                        >
                                            <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ marginBottom: 8, height: 40 }}>
                                                {item.bizCaliber || '暂无业务口径'}
                                            </Paragraph>
                                            <Space size="small">
                                                <Tag color={statusTagMap[item.status]?.color}>{statusTagMap[item.status]?.label}</Tag>
                                                <Text type="secondary" style={{ fontSize: 12 }}>{item.subjectName}</Text>
                                            </Space>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                            <div style={{ marginTop: 16, textAlign: 'right' }}>
                                <Pagination current={pageNum} pageSize={pageSize} total={total} onChange={handlePageChange} showTotal={(t) => `共 ${t} 条`} />
                            </div>
                        </>
                    ) : (
                        <Table
                            rowKey="id"
                            columns={listColumns}
                            dataSource={data}
                            pagination={{ current: pageNum, pageSize, total, onChange: handlePageChange, showTotal: (t) => `共 ${t} 条` }}
                            loading={loading}
                        />
                    )}
                </Card>
            </div>

            {/* 详情 Drawer */}
            <Drawer
                title={detail ? `${detail.metricName} (${detail.metricCode})` : '指标详情'}
                width={720}
                open={drawerVisible}
                onClose={() => { setDrawerVisible(false); setDetail(null); setLineage(null); }}
            >
                {detailLoading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <Spin tip="加载中..." />
                    </div>
                ) : detail ? (
                    <Tabs defaultActiveKey="basic">
                        <TabPane tab="基本信息" key="basic">
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <div>
                                    <Text type="secondary">指标类型</Text>
                                    <div><Tag color={typeTagMap[detail.metricType]?.color}>{typeTagMap[detail.metricType]?.label}</Tag></div>
                                </div>
                                <div>
                                    <Text type="secondary">主题域</Text>
                                    <div><Text>{detail.subjectName} ({detail.subjectCode})</Text></div>
                                </div>
                                <div>
                                    <Text type="secondary">状态</Text>
                                    <div><Tag color={statusTagMap[detail.status]?.color}>{statusTagMap[detail.status]?.label}</Tag></div>
                                </div>
                                <div>
                                    <Text type="secondary">负责人</Text>
                                    <div><Text>{detail.owner || '-'}</Text></div>
                                </div>
                                <div>
                                    <Text type="secondary">业务口径</Text>
                                    <div><Paragraph>{detail.bizCaliber || '-'}</Paragraph></div>
                                </div>
                                <div>
                                    <Text type="secondary">技术口径</Text>
                                    <div><Paragraph code>{detail.techCaliber || '-'}</Paragraph></div>
                                </div>
                                <div>
                                    <Text type="secondary">版本</Text>
                                    <div><Text>{detail.version}</Text></div>
                                </div>
                                <div>
                                    <Text type="secondary">更新时间</Text>
                                    <div><Text>{detail.updatedAt}</Text></div>
                                </div>
                                {detail.atomic && (
                                    <>
                                        <div>
                                            <Text type="secondary">统计函数</Text>
                                            <div><Tag>{detail.atomic.statFunc}</Tag></div>
                                        </div>
                                        <div>
                                            <Text type="secondary">数据来源</Text>
                                            <div><Text>{detail.atomic.dsName} / {detail.atomic.dbName} / {detail.atomic.tblName} / {detail.atomic.colName}</Text></div>
                                        </div>
                                    </>
                                )}
                                {detail.derived && (
                                    <>
                                        <div>
                                            <Text type="secondary">原子指标ID</Text>
                                            <div><Text copyable>{detail.derived.atomicMetricId}</Text></div>
                                        </div>
                                        <div>
                                            <Text type="secondary">时间周期ID</Text>
                                            <div><Text copyable>{detail.derived.timePeriodId}</Text></div>
                                        </div>
                                    </>
                                )}
                                {detail.composite && (
                                    <div>
                                        <Text type="secondary">计算公式</Text>
                                        <div><Paragraph code>{detail.composite.formula}</Paragraph></div>
                                    </div>
                                )}
                            </Space>
                        </TabPane>
                        <TabPane tab="计算逻辑" key="sql">
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <div>
                                    <Text type="secondary">技术口径</Text>
                                    <Paragraph>
                                        <pre style={{ background: '#f6f8fa', padding: 16, borderRadius: 6, overflow: 'auto' }}>
                                            {detail.techCaliber || '暂无技术口径'}
                                        </pre>
                                    </Paragraph>
                                </div>
                                <div>
                                    <Space style={{ marginBottom: 8 }}>
                                        <Text type="secondary">物理SQL</Text>
                                        <Button icon={<PlayCircleOutlined />} loading={trialLoading} onClick={() => handleTrial(detail)}>试算</Button>
                                    </Space>
                                    {sql && (
                                        <pre style={{ background: '#f6f8fa', padding: 16, borderRadius: 6, overflow: 'auto' }}>
                                            {sql}
                                        </pre>
                                    )}
                                    {sqlResult && (
                                        <div style={{ marginTop: 8 }}>
                                            <Text type="secondary">执行耗时: {sqlResult.costTimeMs}ms</Text>
                                            <Table
                                                size="small"
                                                dataSource={sqlResult.data || []}
                                                columns={sqlResult.data && sqlResult.data.length > 0 ? Object.keys(sqlResult.data[0]).map(key => ({
                                                    title: key,
                                                    dataIndex: key,
                                                    key: key,
                                                })) : []}
                                                pagination={false}
                                            />
                                        </div>
                                    )}
                                </div>
                            </Space>
                        </TabPane>
                        <TabPane tab="血缘关系" key="lineage">
                            {lineageLoading ? (
                                <Spin tip="加载血缘中..." />
                            ) : lineage ? (
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Card title="上游血缘" size="small">
                                        {renderLineageNode(lineage.upstream)}
                                    </Card>
                                    <Card title="下游血缘" size="small">
                                        {renderLineageNode(lineage.downstream)}
                                    </Card>
                                </Space>
                            ) : (
                                <Empty description="暂无血缘数据" />
                            )}
                        </TabPane>
                    </Tabs>
                ) : (
                    <Empty description="暂无数据" />
                )}
            </Drawer>
        </div>
    );
};

export default MetricsDictionary;
