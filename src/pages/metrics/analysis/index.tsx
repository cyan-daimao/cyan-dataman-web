import React, { useEffect, useState } from 'react';
import { Card, Table, Spin, Empty, Typography, Tag, Select, Space } from 'antd';
import { MetricAnalysisApi, SubjectDrilldownDTO, MetricType } from '@/api/MetricApi';
import { MetricSubjectApi, MetricSubject } from '@/api/MetricSubjectApi';

const { Title } = Typography;

const typeColorMap: Record<string, string> = {
    ATOMIC: 'blue',
    DERIVED: 'green',
    COMPOSITE: 'purple',
    PUBLISHED: 'success',
    DRAFT: 'warning',
    OFFLINE: 'default',
};

const MetricsAnalysis: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SubjectDrilldownDTO[]>([]);
    const [subjects, setSubjects] = useState<MetricSubject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    const fetchSubjects = async () => {
        try {
            const res = await MetricSubjectApi.tree();
            setSubjects(res);
        } catch {
            // ignore
        }
    };

    const fetchData = async (subjectCode?: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await MetricAnalysisApi.subjectDrilldown(subjectCode);
            if (res.code === 200 && res.data) {
                setData(res.data);
            } else {
                setError(res.message || '获取数据失败');
            }
        } catch {
            setError('获取分析数据失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubjects();
        fetchData();
    }, []);

    const handleSubjectChange = (value: string | undefined) => {
        setSelectedSubject(value);
        fetchData(value);
    };

    const buildTreeData = (list: SubjectDrilldownDTO[]): SubjectDrilldownDTO[] => {
        return list;
    };

    const columns = [
        {
            title: '主题域',
            dataIndex: 'subjectName',
            key: 'subjectName',
            width: 200,
        },
        {
            title: '指标总数',
            dataIndex: 'totalMetrics',
            key: 'totalMetrics',
            width: 120,
        },
        {
            title: '类型分布',
            key: 'typeDistribution',
            render: (_: unknown, record: SubjectDrilldownDTO) => (
                <Space size="small" wrap>
                    {Object.entries(record.typeDistribution).map(([type, count]) => (
                        <Tag key={type} color={typeColorMap[type] || 'default'}>
                            {type === MetricType.ATOMIC ? '原子' : type === MetricType.DERIVED ? '派生' : type === MetricType.COMPOSITE ? '复合' : type}: {count}
                        </Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: '状态分布',
            key: 'statusDistribution',
            render: (_: unknown, record: SubjectDrilldownDTO) => (
                <Space size="small" wrap>
                    {Object.entries(record.statusDistribution).map(([status, count]) => (
                        <Tag key={status} color={typeColorMap[status] || 'default'}>
                            {status}: {count}
                        </Tag>
                    ))}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '0 8px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>指标分析</Title>

            <Card style={{ marginBottom: 16 }}>
                <Space>
                    <span>主题域筛选：</span>
                    <Select
                        allowClear
                        placeholder="全部主题域"
                        style={{ width: 240 }}
                        value={selectedSubject}
                        onChange={handleSubjectChange}
                        options={subjects.map(s => ({ label: s.subjectName, value: s.subjectCode }))}
                    />
                </Space>
            </Card>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Spin size="large" tip="加载中..." />
                </div>
            ) : error ? (
                <Empty description={error} />
            ) : (
                <Table
                    rowKey="subjectCode"
                    columns={columns}
                    dataSource={buildTreeData(data)}
                    pagination={false}
                    expandable={{ childrenColumnName: 'children' }}
                    locale={{ emptyText: <Empty description="暂无数据" /> }}
                />
            )}
        </div>
    );
};

export default MetricsAnalysis;
