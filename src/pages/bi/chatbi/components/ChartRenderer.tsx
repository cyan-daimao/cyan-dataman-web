import React, { useState } from 'react';
import { Table, Statistic, Empty, Button, Modal } from 'antd';
import { ExpandOutlined } from '@ant-design/icons';
import { ChartDataDTO, ChartType, DimensionConfig, MetricConfig } from '@/api/DatabiApi';
import EChartsChart from '@/pages/bi/components/EChartsChart';

interface ChartRendererProps {
  chartData: ChartDataDTO;
  chartType: ChartType;
}

/**
 * 将 ChartDataDTO 的 columns/rows 转换为 Table 的 columns
 */
function buildTableColumns(columns: string[]) {
  return columns.map((col) => ({
    title: col,
    dataIndex: col,
    key: col,
    ellipsis: true,
  }));
}

/**
 * 从 ChartDataDTO 推导 dimensions / metrics 配置
 */
function deriveChartConfig(
  columns: string[],
  chartType: ChartType
): { dimensions: DimensionConfig[]; metrics: MetricConfig[] } {
  if (chartType === ChartType.NUMBER) {
    return {
      dimensions: [],
      metrics: columns.slice(0, 1).map((c) => ({ field: c, aggregate: 'SUM' as const, alias: c })),
    };
  }

  if (chartType === ChartType.TABLE) {
    return { dimensions: [], metrics: [] };
  }

  const dimCount = 1;
  return {
    dimensions: columns.slice(0, dimCount).map((c) => ({ field: c, alias: c })),
    metrics: columns.slice(dimCount).map((c) => ({ field: c, aggregate: 'SUM' as const, alias: c })),
  };
}

/**
 * 根据图表类型和数据量计算自适应高度
 */
function calcChartHeight(chartType: ChartType, rowCount: number, expanded = false): number {
  if (expanded) {
    // 放大模式下使用更大的高度
    if (chartType === ChartType.PIE || chartType === ChartType.SCATTER) return 500;
    if (rowCount <= 10) return 450;
    if (rowCount <= 20) return 550;
    if (rowCount <= 40) return 650;
    return 750;
  }

  const baseHeight = 320;
  if (chartType === ChartType.PIE || chartType === ChartType.SCATTER) {
    return 360;
  }
  if (rowCount <= 10) return baseHeight;
  if (rowCount <= 20) return baseHeight + 60;
  if (rowCount <= 40) return baseHeight + 120;
  return baseHeight + 180;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ chartData, chartType }) => {
  const { columns, rows } = chartData;
  const [expanded, setExpanded] = useState(false);

  if (chartData.status !== 'SUCCESS') {
    return (
      <Empty
        description={chartData.errorMessage || '数据获取失败'}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  if (!rows || rows.length === 0) {
    return <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  // NUMBER 类型 → Statistic
  if (chartType === ChartType.NUMBER) {
    const valueField = columns[0];
    const value = Number(rows[0]?.[valueField] ?? 0);
    const statisticContent = (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Statistic
          title={valueField}
          value={value}
          valueStyle={{ fontSize: expanded ? 48 : 36, color: '#4F6DF5' }}
        />
      </div>
    );
    return (
      <>
        {statisticContent}
        <Button
          type="text"
          size="small"
          icon={<ExpandOutlined />}
          className="chatbi-chart-expand-btn"
          onClick={() => setExpanded(true)}
        >
          放大
        </Button>
        <Modal
          title="指标详情"
          open={expanded}
          onCancel={() => setExpanded(false)}
          footer={null}
          width={600}
          className="chatbi-chart-expand-modal"
          destroyOnClose
        >
          <div className="chatbi-chart-expand-content">
            {statisticContent}
          </div>
        </Modal>
      </>
    );
  }

  // TABLE 类型 → Table
  if (chartType === ChartType.TABLE) {
    const tableContent = (
      <Table
        size="small"
        dataSource={rows.map((r, idx) => ({ ...r, key: idx }))}
        columns={buildTableColumns(columns)}
        pagination={{ pageSize: expanded ? 20 : 10, showSizeChanger: true }}
        scroll={{ x: 'max-content' }}
      />
    );
    return (
      <>
        {tableContent}
        <Button
          type="text"
          size="small"
          icon={<ExpandOutlined />}
          className="chatbi-chart-expand-btn"
          onClick={() => setExpanded(true)}
        >
          放大
        </Button>
        <Modal
          title="数据明细"
          open={expanded}
          onCancel={() => setExpanded(false)}
          footer={null}
          width={expanded ? 900 : 600}
          className="chatbi-chart-expand-modal"
          destroyOnClose
        >
          <div className="chatbi-chart-expand-content">
            <Table
              dataSource={rows.map((r, idx) => ({ ...r, key: idx }))}
              columns={buildTableColumns(columns)}
              pagination={{ pageSize: 20, showSizeChanger: true }}
              scroll={{ x: 'max-content' }}
            />
          </div>
        </Modal>
      </>
    );
  }

  // BAR / LINE → EChartsChart
  const { dimensions, metrics } = deriveChartConfig(columns, chartType);
  const chartHeight = calcChartHeight(chartType, rows.length);

  const chartElement = (
    <EChartsChart
      chartType={chartType}
      columns={columns}
      rows={rows}
      dimensions={dimensions}
      metrics={metrics}
      style={{ height: chartHeight }}
    />
  );

  const expandedHeight = calcChartHeight(chartType, rows.length, true);

  return (
    <>
      {chartElement}
      <Button
        type="text"
        size="small"
        icon={<ExpandOutlined />}
        className="chatbi-chart-expand-btn"
        onClick={() => setExpanded(true)}
      >
        放大
      </Button>
      <Modal
        title="图表详情"
        open={expanded}
        onCancel={() => setExpanded(false)}
        footer={null}
        width={900}
        className="chatbi-chart-expand-modal"
        destroyOnClose
      >
        <div className="chatbi-chart-expand-content">
          <EChartsChart
            chartType={chartType}
            columns={columns}
            rows={rows}
            dimensions={dimensions}
            metrics={metrics}
            style={{ height: expandedHeight }}
          />
        </div>
      </Modal>
    </>
  );
};

export default ChartRenderer;