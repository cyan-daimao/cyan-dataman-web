# ChatBI 业务术语表 —— Dify 知识库文档

> 本文件用于导入 Dify 知识库，帮助 LLM 理解企业业务术语和别名映射。
> 根据网络通用电商/BI/数据行业术语整理，请根据实际业务补充调整。

---

## 使用说明

每条术语格式：
```
- {别名1} / {别名2} / {别名3} = {标准名称} = {类型}: {编码}
```

类型说明：
- `metricCode` = 指标编码
- `dimCode` = 维度编码
- `statFunc` = 统计函数

---

## 一、销售/交易相关指标

- GMV / 商品交易总额 / 成交额 / 交易金额 / 成交金额 = 商品交易总额 = metricCode: M_GMV
- 销售额 / 销售金额 / 营收 / 收入 / 营业额 = 销售额 = metricCode: M_SALE_AMT
- 订单量 / 订单数 / 下单量 / 单量 = 订单量 = metricCode: M_ORDER_CNT
- 成交人数 / 支付人数 = 成交人数 = metricCode: M_PAY_USER_CNT
- 客单价 / 人均消费 / 笔单价 / ARPU / 每用户平均收入 = 客单价 = metricCode: M_ARPU
- 付费用户客单价 / ARPPU / 每付费用户平均收入 = 付费用户客单价 = metricCode: M_ARRPU
- 退款金额 / 退货金额 / 售后金额 / 退款 = 退款金额 = metricCode: M_REFUND_AMT
- 退款率 / 退货率 = 退款率 = metricCode: M_REFUND_RATE
- 实付金额 / 实收金额 / 实际收入 = 实付金额 = metricCode: M_PAY_AMT
- 折扣金额 / 优惠金额 / 让利金额 / 优惠 = 折扣金额 = metricCode: M_DISCOUNT_AMT
- 毛利润 / 毛利 = 毛利润 = metricCode: M_GROSS_PROFIT
- 毛利率 / 毛利占比 = 毛利率 = metricCode: M_GROSS_MARGIN
- 净利润 / 净收入 = 净利润 = metricCode: M_NET_PROFIT
- 净利润率 = 净利润率 = metricCode: M_NET_MARGIN
- 复购率 / 再次购买率 / 回购率 = 复购率 = metricCode: M_REPURCHASE_RATE
- 连带率 / 客单件数 = 连带率 = metricCode: M_UPT
- 售罄率 = 售罄率 = metricCode: M_SELL_THROUGH_RATE
- 库存量 / 库存数 / 存货 = 库存量 = metricCode: M_INVENTORY_QTY
- 库存金额 / 存货金额 = 库存金额 = metricCode: M_INVENTORY_AMT

## 二、用户相关指标

- DAU / 日活跃用户 / 日活 / 日活跃 = 日活跃用户 = metricCode: M_DAU
- MAU / 月活跃用户 / 月活 = 月活跃用户 = metricCode: M_MAU
- WAU / 周活跃用户 / 周活 = 周活跃用户 = metricCode: M_WAU
- 新增用户 / 新用户 / 新增 / 新注册 = 新增用户 = metricCode: M_NEW_USER
- 注册用户 / 注册人数 / 累计注册 = 注册用户数 = metricCode: M_REG_USER
- 留存率 / 次日留存 / 7日留存 / 30日留存 = 留存率 = metricCode: M_RETENTION
- 流失率 / 用户流失率 = 流失率 = metricCode: M_CHURN_RATE
- 活跃率 / 活跃度 = 活跃率 = metricCode: M_ACTIVE_RATE
- 用户回访率 / 回访率 = 用户回访率 = metricCode: M_RETURN_RATE
- 用户生命周期价值 / LTV / 用户价值 = 用户生命周期价值 = metricCode: M_LTV
- 获客成本 / CAC / 拉新成本 = 获客成本 = metricCode: M_CAC
- 用户分层 / 用户等级 / 会员等级 = 用户等级 = metricCode: M_USER_LEVEL

## 三、流量/访问相关指标

- PV / 页面浏览量 / 浏览量 / 访问量 = 页面浏览量 = metricCode: M_PV
- UV / 独立访客 / 访客数 / 独立访问 = 独立访客 = metricCode: M_UV
- IP / 独立IP = 独立IP = metricCode: M_IP
- 跳出率 / 跳失率 = 跳出率 = metricCode: M_BOUNCE_RATE
- 平均停留时长 / 平均访问时长 / 停留时间 = 平均停留时长 = metricCode: M_AVG_DURATION
- 点击率 / CTR = 点击率 = metricCode: M_CTR
- 转化率 / CVR / 成交转化率 / 支付转化率 = 转化率 = metricCode: M_CONVERSION
- 曝光量 / 展现量 / 展示量 = 曝光量 = metricCode: M_IMPRESSION
- 点击量 / 点击数 = 点击量 = metricCode: M_CLICK

## 四、广告/投放相关指标

- ROI / 投资回报率 / 投入产出比 = 投资回报率 = metricCode: M_ROI
- CPM / 千次展示成本 = 千次展示成本 = metricCode: M_CPM
- CPC / 点击成本 / 单次点击成本 = 点击成本 = metricCode: M_CPC
- CPA / 单次转化成本 / 转化成本 = 单次转化成本 = metricCode: M_CPA
- 广告消耗 / 投放金额 / 推广费用 = 广告消耗 = metricCode: M_AD_SPEND
- 广告收入 / 广告收益 = 广告收入 = metricCode: M_AD_REVENUE

## 五、产品/商品相关指标

- SKU / 库存量单位 / 单品 = SKU数量 = metricCode: M_SKU_CNT
- SPU / 标准产品单位 = SPU数量 = metricCode: M_SPU_CNT
- 商品数 / 商品总量 = 商品数 = metricCode: M_PRODUCT_CNT
- 上架商品数 = 上架商品数 = metricCode: M_ON_SHELF_CNT
- 动销率 / 商品动销率 = 动销率 = metricCode: M_SALES_RATE
- 缺货率 = 缺货率 = metricCode: M_STOCKOUT_RATE

## 六、维度

- 省份 / 省 / 省级 = 省份 = dimCode: D_PROVINCE
- 城市 / 市 / 市级 = 城市 = dimCode: D_CITY
- 区县 / 区 / 县 = 区县 = dimCode: D_DISTRICT
- 日期 / 时间 / dt / 天 = 日期 = dimCode: D_DATE
- 月份 / 月 = 月份 = dimCode: D_MONTH
- 季度 / 季 = 季度 = dimCode: D_QUARTER
- 年份 / 年 = 年份 = dimCode: D_YEAR
- 周 / 星期 = 周 = dimCode: D_WEEK
- 渠道 / 来源渠道 / 流量来源 = 渠道 = dimCode: D_CHANNEL
- 品类 / 商品分类 / 类目 / 分类 = 品类 = dimCode: D_CATEGORY
- 品牌 = 品牌 = dimCode: D_BRAND
- 门店 / 店铺 / 商家 / 门店 = 门店 = dimCode: D_STORE
- 用户等级 / 会员等级 / VIP等级 = 用户等级 = dimCode: D_USER_LEVEL
- 用户性别 / 性别 = 性别 = dimCode: D_GENDER
- 用户年龄 / 年龄段 / 年龄 = 年龄段 = dimCode: D_AGE_GROUP
- 设备类型 / 终端 / 设备 = 设备类型 = dimCode: D_DEVICE
- 操作系统 / OS / 系统 = 操作系统 = dimCode: D_OS
- 浏览器 = 浏览器 = dimCode: D_BROWSER
- APP版本 / 应用版本 / 版本 = APP版本 = dimCode: D_APP_VERSION
- 支付方式 / 支付渠道 = 支付方式 = dimCode: D_PAYMENT
- 物流方式 / 配送方式 = 物流方式 = dimCode: D_LOGISTICS
- 订单状态 / 订单类型 = 订单状态 = dimCode: D_ORDER_STATUS
- 新老用户 / 用户类型 = 新老用户 = dimCode: D_USER_TYPE
- 区域 / 大区 / 地区 = 区域 = dimCode: D_REGION

## 七、统计函数

- SUM / 求和 / 总计 / 合计 / 累计 = 求和 = statFunc: SUM
- AVG / 平均 / 均值 / 平均值 = 平均值 = statFunc: AVG
- COUNT / 计数 / 个数 / 数量 = 计数 = statFunc: COUNT
- COUNT_DISTINCT / 去重计数 / 独立数 / 去重 = 去重计数 = statFunc: COUNT_DISTINCT
- MAX / 最大 / 最大值 / 最高 / 最多 = 最大值 = statFunc: MAX
- MIN / 最小 / 最小值 / 最低 / 最少 = 最小值 = statFunc: MIN

## 八、时间语义

以下时间表达在对话中常见，请正确理解：

- "近7天" / "最近7天" / "过去7天" / "7天内" = 时间范围：date_sub(current_date, 7) ~ current_date
- "近14天" / "最近14天" / "两周" = 时间范围：date_sub(current_date, 14) ~ current_date
- "近30天" / "最近30天" / "一个月" = 时间范围：date_sub(current_date, 30) ~ current_date
- "本周" / "这周" / "本星期" = 当前自然周（周一到周日）
- "上周" / "上个星期" = 上一个自然周
- "本月" / "这个月" = 当前自然月
- "上月" / "上个月" = 上一个自然月
- "本季度" / "这个季度" = 当前自然季度
- "上季度" / "上个季度" = 上一个自然季度
- "今年" / "本年度" / "当年" = 当前自然年
- "去年" / "上一年" / "上年度" = 上一年度
- "同比" = 与去年同期对比（如今年4月 vs 去年4月）
- "环比" = 与上一期对比（如本月 vs 上月）
- "Q1" / "第一季度" = 第一季度（1-3月）
- "Q2" / "第二季度" = 第二季度（4-6月）
- "Q3" / "第三季度" = 第三季度（7-9月）
- "Q4" / "第四季度" = 第四季度（10-12月）
- "上半年" = 1-6月
- "下半年" = 7-12月
- "工作日" = 周一到周五
- "周末" = 周六和周日

## 九、区域划分（中国）

- 华东区 / 华东地区 = 上海、江苏、浙江、安徽、福建、江西、山东
- 华南区 / 华南地区 = 广东、广西、海南
- 华北区 / 华北地区 = 北京、天津、河北、山西、内蒙古
- 华中区 / 华中地区 = 河南、湖北、湖南
- 西南区 / 西南地区 = 四川、贵州、云南、西藏、重庆
- 西北区 / 西北地区 = 陕西、甘肃、青海、宁夏、新疆
- 东北区 / 东北地区 = 辽宁、吉林、黑龙江
- 港澳台 = 香港、澳门、台湾

## 十、分析术语

- 同比 = 与去年同期对比
- 环比 = 与上一期对比
- 渗透率 = 目标人群中使用/购买的比例
- 市场份额 / 市场占有率 = 某品牌/产品占整体市场的比例
- 用户画像 = 描述用户特征的标签集合
- RFM模型 = 基于最近一次消费(R)、消费频率(F)、消费金额(M)的用户分层模型
- AARRR模型 = 获客(Acquisition)、激活(Activation)、留存(Retention)、收入(Revenue)、推荐(Referral)
- 埋点 = 在应用中预设代码收集用户行为数据
- A/B测试 = 对照实验，比较两种方案的效果
- 漏斗分析 = 分析多步骤转化中每步的流失情况
- 热力图 = 用颜色深浅表示数据密度的可视化方式
- 下钻 / 钻取 = 从汇总数据逐层查看明细数据
- 上卷 / 汇总 = 将明细数据按更高层级聚合
- 切片 = 按某个维度固定值过滤数据
- 切块 = 按多个维度固定值过滤数据
- 旋转 / 透视 = 交换行列维度重新展示数据

## 十一、电商业务黑话

- 拉新 = 获取新用户
- 促活 = 提升用户活跃度
- 留存 = 让用户持续使用/购买
- 变现 = 将流量转化为收入
- 裂变 = 通过用户分享带来新用户
- 种草 = 通过内容推荐激发购买欲望
- 拔草 = 完成购买
- 爆款 = 销量极高的商品
- 滞销 = 销量极低的商品
- 清仓 = 低价清理库存
- 秒杀 = 限时超低价抢购
- 预售 = 提前销售未上市商品
- 尾款 = 预售商品的剩余付款
- 定金 = 预售商品的预付款
- 满减 = 满一定金额减一定金额
- 满赠 = 满一定金额赠送商品
- 包邮 = 免运费
- 七天无理由 = 七天内可无理由退货
- 好评率 = 好评订单占总订单比例
- 差评率 = 差评订单占总订单比例
- 投诉率 = 投诉订单占总订单比例
