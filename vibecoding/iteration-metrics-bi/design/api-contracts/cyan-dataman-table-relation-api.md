# cyan-dataman 元数据平台 —— 表关系管理接口契约

## 1. 通用约定

- **Base URL**: `http://cyan-dataman:8080`
- **统一响应格式**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": { ... }
  }
  ```
- **认证**: Bearer Token

---

## 2. 接口列表

### 2.1 获取表的所有关联关系

- **Method**: GET
- **Path**: `/api/v1/metadata/tables/{catalog}/{schema}/{table}/relations`
- **Path Parameters**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | `catalog` | string | 是 | 数据源 catalog |
  | `schema` | string | 是 | 数据库 schema |
  | `table` | string | 是 | 表名 |

- **Response 200**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "outgoing": [
        {
          "id": "1",
          "sourceCatalog": "gravitino",
          "sourceSchema": "ods",
          "sourceTable": "ods_user_info",
          "sourceColumn": "city_id",
          "targetCatalog": "gravitino",
          "targetSchema": "dim",
          "targetTable": "dim_public_cn_city",
          "targetColumn": "id",
          "joinType": "LEFT",
          "description": "用户城市关联"
        }
      ],
      "incoming": [
        {
          "id": "2",
          "sourceCatalog": "gravitino",
          "sourceSchema": "ods",
          "sourceTable": "order_detail",
          "sourceColumn": "user_id",
          "targetCatalog": "gravitino",
          "targetSchema": "ods",
          "targetTable": "ods_user_info",
          "targetColumn": "id",
          "joinType": "LEFT",
          "description": "订单用户关联"
        }
      ]
    }
  }
  ```

### 2.2 创建关联关系

- **Method**: POST
- **Path**: `/api/v1/metadata/tables/relations`
- **Request Body**:
  ```json
  {
    "sourceCatalog": "gravitino",
    "sourceSchema": "ods",
    "sourceTable": "ods_user_info",
    "sourceColumn": "city_id",
    "targetCatalog": "gravitino",
    "targetSchema": "dim",
    "targetTable": "dim_public_cn_city",
    "targetColumn": "id",
    "joinType": "LEFT",
    "description": "用户城市关联"
  }
  ```

- **Response 200**:
  ```json
  {
    "code": 200,
    "data": {
      "id": "1",
      "sourceCatalog": "gravitino",
      "sourceSchema": "ods",
      "sourceTable": "ods_user_info",
      "sourceColumn": "city_id",
      "targetCatalog": "gravitino",
      "targetSchema": "dim",
      "targetTable": "dim_public_cn_city",
      "targetColumn": "id",
      "joinType": "LEFT",
      "description": "用户城市关联"
    }
  }
  ```

### 2.3 删除关联关系

- **Method**: DELETE
- **Path**: `/api/v1/metadata/tables/relations/{id}`
- **Response 200**:
  ```json
  {
    "code": 200,
    "message": "success"
  }
  ```

### 2.4 批量获取多张表的 JOIN 路径（供指标平台调用）

- **Method**: POST
- **Path**: `/api/v1/metadata/tables/relations/join-paths`
- **Request Body**:
  ```json
  {
    "factTable": {
      "catalog": "gravitino",
      "schema": "ods",
      "table": "ods_user_info"
    },
    "dimensionTables": [
      {
        "catalog": "gravitino",
        "schema": "dim",
        "table": "dim_public_cn_city"
      }
    ]
  }
  ```

- **Response 200**:
  ```json
  {
    "code": 200,
    "data": [
      {
        "sourceCatalog": "gravitino",
        "sourceSchema": "ods",
        "sourceTable": "ods_user_info",
        "sourceColumn": "city_id",
        "targetCatalog": "gravitino",
        "targetSchema": "dim",
        "targetTable": "dim_public_cn_city",
        "targetColumn": "id",
        "joinType": "LEFT"
      }
    ]
  }
  ```

- **说明**: 指标平台调用此接口获取从事实表到所有维度表的 JOIN 关系。

---

## 3. 数据库 Schema

```sql
CREATE TABLE IF NOT EXISTS metadata_table_relation (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    source_catalog  VARCHAR(128) NOT NULL COMMENT '源表 catalog',
    source_schema   VARCHAR(128) NOT NULL COMMENT '源表 schema',
    source_table    VARCHAR(128) NOT NULL COMMENT '源表名',
    source_column   VARCHAR(128) NOT NULL COMMENT '源表字段',
    target_catalog  VARCHAR(128) NOT NULL COMMENT '目标表 catalog',
    target_schema   VARCHAR(128) NOT NULL COMMENT '目标表 schema',
    target_table    VARCHAR(128) NOT NULL COMMENT '目标表名',
    target_column   VARCHAR(128) NOT NULL COMMENT '目标表字段',
    join_type       VARCHAR(20)  DEFAULT 'LEFT' COMMENT 'JOIN类型：LEFT/INNER/RIGHT',
    description     VARCHAR(500) COMMENT '描述',
    created_by      VARCHAR(100) COMMENT '创建人',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_source (source_catalog, source_schema, source_table),
    INDEX idx_target (target_catalog, target_schema, target_table)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='元数据-表关系';
```
