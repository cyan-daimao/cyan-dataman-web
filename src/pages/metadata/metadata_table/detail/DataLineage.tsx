import React, {useEffect, useMemo, useState} from "react";
import {Alert, Card, Col, Empty, List, Row, Select, Space, Spin, Tag, Typography} from "antd";
import {BranchesOutlined, FieldStringOutlined, FunctionOutlined, ThunderboltOutlined} from "@ant-design/icons";
import {
    ColumnVO,
    MetadataFieldLineageDTO,
    MetadataLineageNodeDTO,
    metadataLineageApi
} from "@/api/MetadataTableAPI";

const {Text, Title} = Typography;

interface DataLineageProps {
    tableName: string;
    tableComment: string;
    catalog?: string;
    schema?: string;
    columns?: ColumnVO[];
}

const parseError = (node?: MetadataLineageNodeDTO) => {
    if (!node?.propertiesJson) {
        return '';
    }
    try {
        const properties = JSON.parse(node.propertiesJson) as { parseError?: string };
        return properties.parseError || '';
    } catch {
        return '';
    }
};

const renderNode = (node: MetadataLineageNodeDTO) => (
    <List.Item key={`${node.nodeKey}-${node.refId || ''}`}>
        <List.Item.Meta
            avatar={node.nodeType === 'METRIC' ? <FunctionOutlined style={{color: '#1677ff'}}/> : <ThunderboltOutlined style={{color: '#52c41a'}}/>}
            title={
                <Space wrap>
                    <Text strong>{node.nodeName}</Text>
                    <Tag>{node.nodeType}</Tag>
                    {node.refId && <Text type="secondary">{node.refId}</Text>}
                </Space>
            }
            description={
                <Space direction="vertical" size={2}>
                    {node.tableRef && <Text type="secondary">{node.tableRef}</Text>}
                    {parseError(node) && <Text type="danger">{parseError(node)}</Text>}
                </Space>
            }
        />
    </List.Item>
);

const DataLineage: React.FC<DataLineageProps> = ({tableName, tableComment, catalog, schema, columns = []}) => {
    const [selectedColumn, setSelectedColumn] = useState<string>();
    const [lineage, setLineage] = useState<MetadataFieldLineageDTO>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const columnOptions = useMemo(() => columns.map(column => ({
        label: `${column.name}${column.comment ? `（${column.comment}）` : ''}`,
        value: column.name,
    })), [columns]);

    useEffect(() => {
        setSelectedColumn(columns[0]?.name);
    }, [columns]);

    useEffect(() => {
        if (!catalog || !schema || !tableName || !selectedColumn) {
            setLineage(undefined);
            return;
        }
        loadLineageData(selectedColumn);
    }, [catalog, schema, tableName, selectedColumn]);

    const loadLineageData = async (column: string) => {
        setLoading(true);
        setError('');
        try {
            const response = await metadataLineageApi.getFieldLineage({
                catalog: catalog!,
                schema: schema!,
                table: tableName,
                column,
                maxDepth: 5,
            });
            if (response.code === 200 && response.data) {
                setLineage(response.data);
            } else {
                setLineage(undefined);
                setError(response.message || '字段血缘加载失败');
            }
        } catch (err) {
            setLineage(undefined);
            setError(err instanceof Error ? err.message : '字段血缘加载失败');
        } finally {
            setLoading(false);
        }
    };

    const hasLineage = !!lineage
        && (lineage.upstreamJobs.length > 0 || lineage.downstreamJobs.length > 0 || lineage.metrics.length > 0);

    return (
        <Space direction="vertical" size={16} style={{width: '100%'}}>
            <Card size="small">
                <Row gutter={16} align="middle">
                    <Col flex="auto">
                        <Space direction="vertical" size={2}>
                            <Title level={5} style={{margin: 0}}>{tableName || '当前表'}</Title>
                            <Text type="secondary">{tableComment || '暂无描述'}</Text>
                            <Text type="secondary">{catalog && schema ? `${catalog}.${schema}.${tableName}` : '缺少 catalog/schema 信息'}</Text>
                        </Space>
                    </Col>
                    <Col>
                        <Select
                            style={{width: 280}}
                            placeholder="选择字段查看血缘"
                            value={selectedColumn}
                            options={columnOptions}
                            onChange={setSelectedColumn}
                            suffixIcon={<FieldStringOutlined/>}
                        />
                    </Col>
                </Row>
            </Card>

            {error && <Alert type="error" showIcon message={error}/>}

            <Spin spinning={loading}>
                {!selectedColumn ? (
                    <Empty description="当前表暂无字段"/>
                ) : !hasLineage ? (
                    <Empty description="暂无字段血缘或尚未同步"/>
                ) : (
                    <Row gutter={16}>
                        <Col span={8}>
                            <Card size="small" title={<Space><BranchesOutlined/>上游产出任务</Space>}>
                                <List
                                    dataSource={lineage?.upstreamJobs || []}
                                    locale={{emptyText: '暂无上游产出任务'}}
                                    renderItem={renderNode}
                                />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card size="small" title={<Space><BranchesOutlined/>下游读取任务</Space>}>
                                <List
                                    dataSource={lineage?.downstreamJobs || []}
                                    locale={{emptyText: '暂无下游读取任务'}}
                                    renderItem={renderNode}
                                />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card size="small" title={<Space><FunctionOutlined/>影响指标</Space>}>
                                <List
                                    dataSource={lineage?.metrics || []}
                                    locale={{emptyText: '暂无影响指标'}}
                                    renderItem={renderNode}
                                />
                            </Card>
                        </Col>
                    </Row>
                )}
            </Spin>
        </Space>
    );
};

export default DataLineage;
