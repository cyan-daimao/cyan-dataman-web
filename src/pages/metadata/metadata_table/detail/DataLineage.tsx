import React, {useEffect, useState} from "react";
import {Card, Col, Row, Tag, Timeline, Typography} from "antd";
import {DatabaseOutlined} from "@ant-design/icons";

const {Title, Text} = Typography;

// 数据分层颜色映射
const LAYER_COLOR: Record<string, string> = {
    'ODS': 'cyan',
    'DWD': 'blue',
    'DWM': 'purple',
    'DWS': 'magenta',
    'ADS': 'gold',
    'DIM': 'green',
};

// 数据血缘节点类型
interface LineageNode {
    id: string;
    name: string;
    type: 'source' | 'target' | 'current';
    level: string;
}

// 数据血缘响应类型
interface LineageData {
    upstream: LineageNode[];
    downstream: LineageNode[];
}

interface DataLineageProps {
    tableName: string;
    tableComment: string;
}

const DataLineage: React.FC<DataLineageProps> = ({tableName, tableComment}) => {
    const [lineageData, setLineageData] = useState<LineageData>({
        upstream: [],
        downstream: [],
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadLineageData();
    }, [tableName]);

    // 加载血缘数据（目前使用模拟数据）
    const loadLineageData = async () => {
        setLoading(true);
        // TODO: 替换为真实 API 调用
        // 模拟数据
        setTimeout(() => {
            setLineageData({
                upstream: [
                    {id: '1', name: 'ods_user_info', type: 'source', level: 'ODS'},
                    {id: '2', name: 'ods_order_detail', type: 'source', level: 'ODS'},
                ],
                downstream: [
                    {id: '3', name: 'dws_user_behavior_summary', type: 'target', level: 'DWS'},
                    {id: '4', name: 'ads_user_profile_report', type: 'target', level: 'ADS'},
                ],
            });
            setLoading(false);
        }, 300);
    };

    return (
        <Row gutter={24}>
            {/* 上游血缘 */}
            <Col span={8}>
                <Card
                    title={
                        <span>
                            <DatabaseOutlined style={{color: '#1890ff', marginRight: 8}}/>
                            上游数据源
                        </span>
                    }
                    size="small"
                    style={{height: '100%'}}
                    loading={loading}
                >
                    {lineageData.upstream.length > 0 ? (
                        <Timeline>
                            {lineageData.upstream.map((node) => (
                                <Timeline.Item key={node.id} color="blue">
                                    <div>
                                        <Text strong>{node.name}</Text>
                                        <br/>
                                        <Tag color={LAYER_COLOR[node.level] || 'default'} style={{marginTop: 4}}>
                                            {node.level}
                                        </Tag>
                                    </div>
                                </Timeline.Item>
                            ))}
                        </Timeline>
                    ) : (
                        <Text type="secondary">暂无上游数据源</Text>
                    )}
                </Card>
            </Col>

            {/* 当前表 */}
            <Col span={8}>
                <Card
                    style={{
                        height: '100%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                    }}
                    styles={{ body: { padding: 24 } }}
                    loading={loading}
                >
                    <div style={{textAlign: 'center', color: '#fff'}}>
                        <DatabaseOutlined style={{fontSize: 48, marginBottom: 16}}/>
                        <Title level={4} style={{color: '#fff', margin: 0}}>
                            {tableName || '当前表'}
                        </Title>
                        <Text style={{color: 'rgba(255,255,255,0.8)'}}>
                            {tableComment || '暂无描述'}
                        </Text>
                    </div>
                </Card>
            </Col>

            {/* 下游血缘 */}
            <Col span={8}>
                <Card
                    title={
                        <span>
                            <DatabaseOutlined style={{color: '#52c41a', marginRight: 8}}/>
                            下游应用
                        </span>
                    }
                    size="small"
                    style={{height: '100%'}}
                    loading={loading}
                >
                    {lineageData.downstream.length > 0 ? (
                        <Timeline>
                            {lineageData.downstream.map((node) => (
                                <Timeline.Item key={node.id} color="green">
                                    <div>
                                        <Text strong>{node.name}</Text>
                                        <br/>
                                        <Tag color={LAYER_COLOR[node.level] || 'default'} style={{marginTop: 4}}>
                                            {node.level}
                                        </Tag>
                                    </div>
                                </Timeline.Item>
                            ))}
                        </Timeline>
                    ) : (
                        <Text type="secondary">暂无下游应用</Text>
                    )}
                </Card>
            </Col>
        </Row>
    );
};

export default DataLineage;
