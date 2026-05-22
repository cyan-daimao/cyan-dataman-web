import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, message, Empty, Tag, Input, Select, DatePicker, Row, Col,
  Typography, Spin,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import {
  debugApi, EventSampleDTO, EventSamplePageQuery,
} from '@/api/DataCollectionApi';
import { ApiResponse } from '@/api/Response';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface PageResult<T> {
  records: T[];
  total: number;
  pageNo: number;
  pageSize: number;
}

const validateStatusTag: Record<string, { color: string; label: string }> = {
  PASS: { color: 'success', label: 'PASS' },
  WARN: { color: 'warning', label: 'WARN' },
  FAIL: { color: 'error', label: 'FAIL' },
  UNKNOWN: { color: 'default', label: 'UNKNOWN' },
};

const DebugConsolePage: React.FC = () => {
  const [data, setData] = useState<EventSampleDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState<EventSamplePageQuery>({});
  const [selectedSample, setSelectedSample] = useState<EventSampleDTO | null>(null);

  const fetchList = async (page = 1, query = filters) => {
    setLoading(true);
    try {
      const res = await debugApi.pageEvents({
        pageNo: page,
        pageSize,
        ...query,
      }) as unknown as ApiResponse<PageResult<EventSampleDTO>>;
      if (res.code === 200 && res.data) {
        setData(res.data.records || []);
        setTotal(res.data.total);
        setPageNo(res.data.pageNo);
        if (res.data.records && res.data.records.length > 0) {
          setSelectedSample(res.data.records[0]);
        } else {
          setSelectedSample(null);
        }
      }
    } catch {
      message.error('获取Debug事件列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    setPageNo(1);
    fetchList(1, filters);
  };

  const handleFilterChange = (changed: Partial<EventSamplePageQuery>) => {
    setFilters((prev) => ({ ...prev, ...changed }));
  };

  const columns = [
    { title: '事件编码', dataIndex: 'eventCode', key: 'eventCode', width: 150 },
    { title: '环境', dataIndex: 'environment', key: 'environment', width: 80 },
    {
      title: '终端',
      dataIndex: 'terminalType',
      key: 'terminalType',
      width: 80,
    },
    {
      title: '校验状态',
      dataIndex: 'validateStatus',
      key: 'validateStatus',
      width: 90,
      render: (v: string) => <Tag color={validateStatusTag[v]?.color}>{validateStatusTag[v]?.label}</Tag>,
    },
    { title: '上报时间', dataIndex: 'eventTime', key: 'eventTime', width: 170 },
    { title: '入库时间', dataIndex: 'ingestionTime', key: 'ingestionTime', width: 170 },
  ];

  const formatJson = (jsonString: string) => {
    try {
      return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch {
      return jsonString;
    }
  };

  return (
    <div style={{ padding: '0 8px' }}>
      <Title level={4} style={{ marginBottom: 16 }}>Debug 控制台</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="debugToken"
            value={filters.debugToken || ''}
            onChange={(e) => handleFilterChange({ debugToken: e.target.value })}
            style={{ width: 180 }}
          />
          <Input
            placeholder="userId"
            value={filters.userId || ''}
            onChange={(e) => handleFilterChange({ userId: e.target.value })}
            style={{ width: 140 }}
          />
          <Input
            placeholder="anonymousId"
            value={filters.anonymousId || ''}
            onChange={(e) => handleFilterChange({ anonymousId: e.target.value })}
            style={{ width: 160 }}
          />
          <Input
            placeholder="deviceId"
            value={filters.deviceId || ''}
            onChange={(e) => handleFilterChange({ deviceId: e.target.value })}
            style={{ width: 160 }}
          />
          <Input
            placeholder="eventCode"
            value={filters.eventCode || ''}
            onChange={(e) => handleFilterChange({ eventCode: e.target.value })}
            style={{ width: 160 }}
          />
          <Select
            placeholder="环境"
            allowClear
            style={{ width: 120 }}
            value={filters.environment}
            onChange={(v) => handleFilterChange({ environment: v })}
          >
            <Option value="DEV">DEV</Option>
            <Option value="TEST">TEST</Option>
            <Option value="STAGING">STAGING</Option>
            <Option value="PROD">PROD</Option>
          </Select>
          <RangePicker
            showTime
            placeholder={['开始时间', '结束时间']}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                handleFilterChange({
                  startTime: dates[0].toISOString(),
                  endTime: dates[1].toISOString(),
                });
              } else {
                handleFilterChange({ startTime: undefined, endTime: undefined });
              }
            }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
        </Space>
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="事件流" bodyStyle={{ padding: 0 }}>
            <Spin spinning={loading}>
              <Table
                rowKey="id"
                columns={columns}
                dataSource={data}
                size="small"
                pagination={{
                  current: pageNo,
                  pageSize,
                  total,
                  onChange: (p) => {
                    setPageNo(p);
                    fetchList(p);
                  },
                  showTotal: (t) => `共 ${t} 条`,
                }}
                locale={{ emptyText: <Empty description="暂无事件数据" /> }}
                onRow={(record) => ({
                  onClick: () => setSelectedSample(record),
                  style: { cursor: 'pointer', background: selectedSample?.id === record.id ? '#e6f7ff' : undefined },
                })}
              />
            </Spin>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="事件详情" style={{ height: '100%' }}>
            {selectedSample ? (
              <div>
                <div style={{ marginBottom: 8 }}>
                  <Tag color={validateStatusTag[selectedSample.validateStatus]?.color}>
                    {validateStatusTag[selectedSample.validateStatus]?.label}
                  </Tag>
                </div>
                <pre
                  style={{
                    background: '#f6f8fa',
                    padding: 12,
                    borderRadius: 6,
                    overflow: 'auto',
                    maxHeight: 600,
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  {formatJson(selectedSample.payload)}
                </pre>
                {selectedSample.validateErrors && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ color: '#ff4d4f', fontWeight: 'bold', marginBottom: 4 }}>校验错误</div>
                    <pre
                      style={{
                        background: '#fff2f0',
                        padding: 12,
                        borderRadius: 6,
                        overflow: 'auto',
                        fontSize: 12,
                        color: '#ff4d4f',
                      }}
                    >
                      {selectedSample.validateErrors}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <Empty description="请选择左侧事件查看详情" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DebugConsolePage;
