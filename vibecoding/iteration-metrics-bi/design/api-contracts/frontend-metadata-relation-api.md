# 前端 —— 元数据平台表关系管理接口汇总

## 1. 调用元数据平台（cyan-dataman）

### 1.1 获取表关联关系

- **Method**: GET
- **Path**: `/api/v1/metadata/tables/{catalog}/{schema}/{table}/relations`
- **前端封装**: `src/api/MetadataTableAPI.ts` 新增

```typescript
export interface TableRelationDTO {
  id: string;
  sourceCatalog: string;
  sourceSchema: string;
  sourceTable: string;
  sourceColumn: string;
  targetCatalog: string;
  targetSchema: string;
  targetTable: string;
  targetColumn: string;
  joinType: 'LEFT' | 'INNER' | 'RIGHT';
  description?: string;
}

export interface TableRelationsResponse {
  outgoing: TableRelationDTO[];  // 本表 → 其他表
  incoming: TableRelationDTO[];  // 其他表 → 本表
}

export const tableRelationApi = {
  getRelations: (catalog: string, schema: string, table: string): Promise<Response<TableRelationsResponse>> =>
    datamanRequest.get(`/api/v1/metadata/tables/${catalog}/${schema}/${table}/relations`),
  
  create: (data: Omit<TableRelationDTO, 'id'>): Promise<Response<TableRelationDTO>> =>
    datamanRequest.post('/api/v1/metadata/tables/relations', data),
  
  delete: (id: string): Promise<Response<void>> =>
    datamanRequest.delete(`/api/v1/metadata/tables/relations/${id}`),
};
```

### 1.2 获取表列表（用于选择目标表）

复用现有接口：
```typescript
// 已有接口
metadataTableApi.page({ content: keyword, current: 1, size: 20 })
```

### 1.3 获取表字段（用于选择字段）

复用现有接口：
```typescript
// 已有接口
metadataTableApi.getColumns(tableId)
```

---

## 2. 前端页面改造

### 2.1 新增组件

| 文件 | 说明 |
|------|------|
| `src/pages/metadata/metadata_table/detail/TableRelations.tsx` | 关联关系 Tab 内容 |

### 2.2 改造组件

| 文件 | 改造内容 |
|------|---------|
| `src/pages/metadata/metadata_table/TableDetailPage.tsx` | Tab items 新增「关联关系」Tab |

### 2.3 新增类型

```typescript
// src/api/MetadataTableAPI.ts

export interface TableRelationDTO {
  id: string;
  sourceCatalog: string;
  sourceSchema: string;
  sourceTable: string;
  sourceColumn: string;
  targetCatalog: string;
  targetSchema: string;
  targetTable: string;
  targetColumn: string;
  joinType: 'LEFT' | 'INNER' | 'RIGHT';
  description?: string;
}

export interface TableRelationsResponse {
  outgoing: TableRelationDTO[];
  incoming: TableRelationDTO[];
}
```
