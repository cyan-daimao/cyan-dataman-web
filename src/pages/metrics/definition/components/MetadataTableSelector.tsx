import React, { useEffect, useState } from 'react';
import { Select, Space, message } from 'antd';
import { MetadataTableSelectorApi, MetadataColumnDTO } from '@/api/MetricConfigApi';

export interface MetadataTableSelectorValue {
  dsName?: string;
  dbName?: string;
  tblName?: string;
  colName?: string;
}

interface MetadataTableSelectorProps {
  value?: MetadataTableSelectorValue;
  onChange?: (value: MetadataTableSelectorValue) => void;
  onColumnsChange?: (columns: MetadataColumnDTO[]) => void;
}

const MetadataTableSelector: React.FC<MetadataTableSelectorProps> = ({ value, onChange, onColumnsChange }) => {
  const [tableOptions, setTableOptions] = useState<{ id: string; name: string; layerCode?: string; catalog?: string; schema?: string; comment?: string }[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [columns, setColumns] = useState<MetadataColumnDTO[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);

  const current = value || {};
  const currentTableName = current.tblName || '';

  // 加载数仓表列表
  useEffect(() => {
    setTableLoading(true);
    MetadataTableSelectorApi.list()
      .then(res => {
        if (res.code === 200 && res.data) {
          setTableOptions((res.data.data || []).map(item => ({
            id: item.id,
            name: item.name,
            comment: item.comment,
            layerCode: item.layerCode,
            catalog: item.table?.catalog,
            schema: item.table?.schema,
          })));
        }
      })
      .catch(() => message.error('加载数仓表列表失败'))
      .finally(() => setTableLoading(false));
  }, []);

  // 根据当前表名加载字段列表
  useEffect(() => {
    const selected = tableOptions.find(t => t.name === currentTableName);
    if (!selected) {
      setColumns([]);
      onColumnsChange?.([]);
      return;
    }
    setColumnsLoading(true);
    MetadataTableSelectorApi.columns(selected.id)
      .then(res => {
        if (res.code === 200 && res.data) {
          setColumns(res.data);
          onColumnsChange?.(res.data);
        } else {
          setColumns([]);
          onColumnsChange?.([]);
        }
      })
      .catch(() => {
        message.error('加载字段列表失败');
        setColumns([]);
        onColumnsChange?.([]);
      })
      .finally(() => setColumnsLoading(false));
  }, [currentTableName, tableOptions, onColumnsChange]);

  const handleTableChange = (tableName: string | undefined) => {
    const selected = tableOptions.find(t => t.name === tableName);
    onChange?.({
      dsName: selected?.catalog || '',
      dbName: selected?.schema || '',
      tblName: tableName || '',
      colName: '',
    });
  };

  const handleColumnChange = (colName: string | undefined) => {
    onChange?.({ ...current, colName: colName || '' });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Select
        showSearch
        placeholder="选择数仓表"
        value={currentTableName}
        onChange={handleTableChange}
        loading={tableLoading}
        style={{ width: '100%' }}
        allowClear
        optionFilterProp="label"
        options={tableOptions.map(t => ({
          value: t.name,
          label: `${t.name} - ${t.comment}`,
        }))}
      />
      <Select
        showSearch
        placeholder={currentTableName ? '选择字段' : '请先选择数仓表'}
        value={current.colName}
        onChange={handleColumnChange}
        loading={columnsLoading}
        style={{ width: '100%' }}
        allowClear
        disabled={!currentTableName || columnsLoading}
        optionFilterProp="label"
        options={columns.map(c => ({
          value: c.col,
          label: `${c.col}${c.comment ? ' - ' + c.comment : ''}`,
        }))}
      />
    </Space>
  );
};

export default MetadataTableSelector;
