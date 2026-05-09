import { create } from 'zustand';
import {
  ChartDataDTO,
  ChartType,
  FilterOperator,
  MetricBiAnalysisCmd,
  MetricRef,
  DimensionRef,
  FilterRef,
  OrderRef,
} from '@/api/DatabiApi';
import { metricBiApi } from '@/api/MetricBiApi';
import { streamChatMessage, parseDslFromContent, cleanContent } from '@/api/ChatBIApi';

// ==================== 类型定义 ====================

export interface QueryLogicItem {
  label: string;
  value: string;
}

export interface QueryLogic {
  metrics: QueryLogicItem[];
  dimensions: QueryLogicItem[];
  filters: QueryLogicItem[];
  orders: QueryLogicItem[];
  limit?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  queryLogic?: QueryLogic;
  chartData?: ChartDataDTO;
  chartType?: ChartType;
  sql?: string;
  dsl?: MetricBiAnalysisCmd;
  saveable?: boolean;
  loading?: boolean;
  error?: string;
}

export interface ChatBIState {
  messages: ChatMessage[];
  conversationId: string;
  isLoading: boolean;
  inputValue: string;

  // actions
  setInputValue: (value: string) => void;
  sendMessage: (query: string) => Promise<void>;
  addUserMessage: (content: string) => void;
  resetChat: () => void;
}

// ==================== 工具函数 ====================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getCurrentUser(): string {
  try {
    const current = localStorage.getItem('current');
    if (current) {
      const parsed = JSON.parse(current);
      return parsed.passport || parsed.id || 'anonymous';
    }
  } catch {
    // ignore
  }
  return 'anonymous';
}

/**
 * 将字符串 operator 映射为 FilterOperator 枚举
 */
function normalizeOperator(op: string): FilterOperator {
  const map: Record<string, FilterOperator> = {
    '=': FilterOperator.EQ,
    '!=': FilterOperator.NE,
    '>': FilterOperator.GT,
    '>=': FilterOperator.GTE,
    '<': FilterOperator.LT,
    '<=': FilterOperator.LTE,
    'IN': FilterOperator.IN,
    'LIKE': FilterOperator.LIKE,
    // 如果已经是枚举值，直接返回
    'EQ': FilterOperator.EQ,
    'NE': FilterOperator.NE,
    'GT': FilterOperator.GT,
    'GTE': FilterOperator.GTE,
    'LT': FilterOperator.LT,
    'LTE': FilterOperator.LTE,
    'NOT_IN': FilterOperator.NOT_IN,
    'IS_NULL': FilterOperator.IS_NULL,
    'IS_NOT_NULL': FilterOperator.IS_NOT_NULL,
    'BETWEEN': FilterOperator.BETWEEN,
    'NOT_LIKE': FilterOperator.NOT_LIKE,
  };
  return map[op] || FilterOperator.EQ;
}

/**
 * 规范化 DSL：转换 operator 字符串为枚举，确保 chartType 有效
 */
function normalizeDsl(dsl: Record<string, unknown>): MetricBiAnalysisCmd | null {
  try {
    const chartType = (dsl.chartType as string) || 'TABLE';
    const metrics = (dsl.metrics as MetricRef[]) || [];
    const dimensions = (dsl.dimensions as DimensionRef[]) || [];
    const filters = ((dsl.filters as Array<Record<string, unknown>>) || []).map((f) => ({
      metricCode: (f.metricCode as string) || undefined,
      dimCode: (f.dimCode as string) || undefined,
      operator: normalizeOperator((f.operator as string) || '='),
      values: (f.values as string[]) || [],
    })) as FilterRef[];
    const orders = ((dsl.orders as Array<Record<string, unknown>>) || []).map((o) => ({
      metricCode: (o.metricCode as string) || undefined,
      dimCode: (o.dimCode as string) || undefined,
      direction: ((o.direction as string) === 'DESC' ? 'DESC' : 'ASC') as 'ASC' | 'DESC',
    })) as OrderRef[];
    const limitValue = typeof dsl.limitValue === 'number' ? dsl.limitValue : 1000;

    return {
      chartType: chartType as ChartType,
      metrics,
      dimensions,
      filters,
      orders,
      limitValue,
    };
  } catch {
    return null;
  }
}

/**
 * 从 DSL 构建取数逻辑卡片数据
 */
function buildQueryLogic(dsl: MetricBiAnalysisCmd): QueryLogic {
  return {
    metrics: dsl.metrics.map((m) => ({
      label: m.alias || m.metricCode,
      value: m.metricCode,
    })),
    dimensions: dsl.dimensions.map((d) => ({
      label: d.alias || d.dimCode,
      value: d.dimCode,
    })),
    filters: dsl.filters.map((f) => ({
      label: f.alias || f.dimCode || f.metricCode || '未知字段',
      value: `${f.dimCode || f.metricCode} ${f.operator} ${f.values.join(', ')}`,
    })),
    orders: dsl.orders.map((o) => ({
      label: o.alias || o.dimCode || o.metricCode || '未知字段',
      value: `${o.direction}`,
    })),
    limit: dsl.limitValue,
  };
}

// ==================== Zustand Store ====================

export const useChatBIStore = create<ChatBIState>((set, get) => ({
  messages: [],
  conversationId: '',
  isLoading: false,
  inputValue: '',

  setInputValue: (value: string) => set({ inputValue: value }),

  addUserMessage: (content: string) => {
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
    };
    set((state) => ({
      messages: [...state.messages, userMsg],
    }));
  },

  resetChat: () => {
    set({ messages: [], conversationId: '', isLoading: false, inputValue: '' });
  },

  sendMessage: async (query: string) => {
    const state = get();
    if (state.isLoading || !query.trim()) return;

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: query.trim(),
    };

    // 添加 AI 占位消息（loading）
    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      loading: true,
    };

    set((s) => ({
      messages: [...s.messages, userMsg, assistantMsg],
      isLoading: true,
      inputValue: '',
    }));

    let fullContent = '';
    let newConversationId = state.conversationId;

    try {
      const stream = streamChatMessage({
        query: query.trim(),
        conversationId: state.conversationId,
        user: getCurrentUser(),
      });

      for await (const event of stream) {
        // 更新 conversation_id
        if (event.conversation_id && !newConversationId) {
          newConversationId = event.conversation_id;
        }

        if (event.event === 'agent_message' && typeof event.answer === 'string') {
          fullContent += event.answer;
          set((s) => {
            const msgs = [...s.messages];
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.content = fullContent;
            }
            return { messages: msgs };
          });
        } else if (event.event === 'message_end') {
          // 消息结束，解析 DSL
          break;
        } else if (event.event === 'error') {
          throw new Error((event as Record<string, string>).error || 'Dify 请求出错');
        }
      }

      // message_end 后处理 DSL
      const rawDsl = parseDslFromContent(fullContent);
      const dsl = rawDsl ? normalizeDsl(rawDsl as unknown as Record<string, unknown>) : null;
      const cleanText = cleanContent(fullContent);

      if (dsl) {
        // 并行执行分析和预览 SQL
        const [execRes, sqlRes] = await Promise.all([
          metricBiApi.execute(dsl),
          metricBiApi.previewSql(dsl),
        ]);

        const chartData = execRes.data;
        const sql = sqlRes.data;

        set((s) => {
          const msgs = [...s.messages];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content = cleanText || lastMsg.content;
            lastMsg.loading = false;
            lastMsg.dsl = dsl;
            lastMsg.chartData = chartData;
            lastMsg.chartType = dsl.chartType;
            lastMsg.sql = sql;
            lastMsg.queryLogic = buildQueryLogic(dsl);
            lastMsg.saveable = chartData?.status === 'SUCCESS';
          }
          return {
            messages: msgs,
            conversationId: newConversationId,
            isLoading: false,
          };
        });
      } else {
        // 没有 DSL，仅展示文本
        set((s) => {
          const msgs = [...s.messages];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content = cleanText || lastMsg.content;
            lastMsg.loading = false;
          }
          return {
            messages: msgs,
            conversationId: newConversationId,
            isLoading: false,
          };
        });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '请求失败，请稍后重试';
      set((s) => {
        const msgs = [...s.messages];
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.loading = false;
          lastMsg.error = errMsg;
        }
        return { messages: msgs, isLoading: false };
      });
    }
  },
}));
