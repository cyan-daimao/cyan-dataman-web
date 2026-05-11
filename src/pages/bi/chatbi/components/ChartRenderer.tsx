import React from 'react';
import { Table, Statistic, Empty } from 'antd';
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
 * 从 ChartDataDTO 推导 dimensions / metrics 配置（用于 EChartsChart）
 * 优先用 columns 前 N 个作为维度，后面的作为指标
 */
function deriveChartConfig(
  columns: string[],
  chartType: ChartType
): { dimensions: DimensionConfig[]; metrics: MetricConfig[] } {
  if (chartType === ChartType.NUMBER) {
    // NUMBER 类型：第一个 column 作为指标
    return {
      dimensions: [],
      metrics: columns.slice(0, 1).map((c) => ({ field: c, aggregate: 'SUM' as const, alias: c })),
    };
  }

  if (chartType === ChartType.TABLE) {
    return { dimensions: [], metrics: [] };
  }

  // BAR / LINE：第一个 column 作为维度（X轴），其余作为指标（Y轴）
  const dimCount = 1;
  return {
    dimensions: columns.slice(0, dimCount).map((c) => ({ field: c, alias: c })),
    metrics: columns.slice(dimCount).map((c) => ({ field: c, aggregate: 'SUM' as const, alias: c })),
  };
}

/**
 * 根据图表类型和数据量计算自适应高度
 */
function calcChartHeight(chartType: ChartType, rowCount: number): number {
  const baseHeight = 320;
  if (chartType === ChartType.PIE || chartType === ChartType.SCATTER) {
    return 360;
  }
  // BAR / LINE / AREA：数据点多时增加高度，避免拥挤
  if (rowCount <= 10) return baseHeight;
  if (rowCount <= 20) return baseHeight + 60;
  if (rowCount <= 40) return baseHeight + 120;
  return baseHeight + 180;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ chartData, chartType }) => {
  const { columns, rows } = chartData;

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
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Statistic
          title={valueField}
          value={value}
          valueStyle={{ fontSize: 36, color: '#4F6DF5' }}
        />
      </div>
    );
  }

  // TABLE 类型 → Table
  if (chartType === ChartType.TABLE) {
    return (
      <Table
        size="small"
        dataSource={rows.map((r, idx) => ({ ...r, key: idx }))}
        columns={buildTableColumns(columns)}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 'max-content' }}
      />
    );
  }

  // BAR / LINE → EChartsChart
  const { dimensions, metrics } = deriveChartConfig(columns, chartType);

  const chartHeight = calcChartHeight(chartType, rows.length);

  return (
    <EChartsChart
      chartType={chartType}
      columns={columns}
      rows={rows}
      dimensions={dimensions}
      metrics={metrics}
      style={{ height: chartHeight }}
    />
  );
};

export default ChartRenderer;
