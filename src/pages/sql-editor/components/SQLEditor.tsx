import {useRef, useCallback, useEffect} from 'react';
import Editor, {Monaco} from '@monaco-editor/react';
import {Button, message, Space, Tooltip} from 'antd';
import {
    CaretRightOutlined,
    ClearOutlined,
    CopyOutlined,
    FileSearchOutlined,
    FormatPainterOutlined,
    FullscreenOutlined,
} from '@ant-design/icons';
import {ColumnVO} from '@/api/MetadataTableAPI.ts';

interface SQLEditorProps {
    value: string;
    onChange: (value: string) => void;
    onExecute: (sql: string) => void;
    onExecutePlan: () => void;
    onFormat: () => void;
    tableColumnsCache?: Record<string, ColumnVO[]>;
    availableTables?: Array<{name: string; title: string}>;
    theme?: 'light' | 'dark';
    /** 是否显示工具栏的运行按钮（默认 true） */
    showRun?: boolean;
    /** 是否显示工具栏的格式化按钮（默认 true） */
    showFormat?: boolean;
}

// SQL 关键字
const SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
    'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS NULL',
    'GROUP BY', 'HAVING', 'ORDER BY', 'ASC', 'DESC', 'LIMIT',
    'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
    'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE',
    'UNION', 'UNION ALL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'DISTINCT', 'AS', 'WITH',
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'
];

// 数据类型
const DATA_TYPES = [
    'INT', 'BIGINT', 'VARCHAR', 'STRING', 'DOUBLE', 'FLOAT', 'DECIMAL',
    'DATE', 'TIMESTAMP', 'BOOLEAN', 'ARRAY', 'MAP', 'STRUCT'
];

// 函数
const SQL_FUNCTIONS = [
    'COALESCE', 'NVL', 'IF', 'CONCAT', 'SUBSTRING', 'TRIM', 'UPPER', 'LOWER',
    'DATE_FORMAT', 'NOW', 'YEAR', 'MONTH', 'DAY',
    'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD'
];

const SQLEditor: React.FC<SQLEditorProps> = ({
    value,
    onChange,
    onExecute,
    onExecutePlan,
    onFormat,
    tableColumnsCache = {},
    availableTables = [],
    theme = 'light',
    showRun = true,
    showFormat = true,
}) => {
    const isDark = theme === 'dark';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<Monaco | null>(null);

    // 用 ref 保存最新的补全数据，避免闭包问题
    const completionDataRef = useRef({tableColumnsCache, availableTables});
    useEffect(() => {
        completionDataRef.current = {tableColumnsCache, availableTables};
    }, [tableColumnsCache, availableTables]);

    // 当外部 value 变化时（如点击左侧表、格式化、切换标签页），同步到编辑器
    // 使用 defaultValue 避免受控模式导致的光标跳动
    // 仅在编辑器没有焦点时同步，防止打字过程中光标飞走
    useEffect(() => {
        const editor = editorRef.current;
        if (editor && value !== editor.getValue() && !editor.hasTextFocus()) {
            editor.setValue(value);
        }
    }, [value]);

    // 获取要执行的 SQL（优先选中内容）
    const getExecuteSQL = useCallback((): string => {
        const editor = editorRef.current;
        if (!editor) return value;
        
        const selection = editor.getSelection();
        const selectedText = editor.getModel().getValueInRange(selection);
        
        // 如果有选中内容，返回选中内容；否则返回全部内容
        return selectedText?.trim() || value;
    }, [value]);

    // 执行 SQL
    const handleExecute = useCallback(() => {
        const sql = getExecuteSQL();
        onExecute(sql);
    }, [getExecuteSQL, onExecute]);

    // 编辑器挂载
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEditorDidMount = useCallback((editor: any, monaco: Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // 注册 SQL 补全
        monaco.languages.registerCompletionItemProvider('sql', {
            triggerCharacters: ['.', ' '],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            provideCompletionItems: (model: any, position: any) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };

                const lineContent = model.getLineContent(position.lineNumber);
                const textBefore = lineContent.substring(0, position.column - 1);
                const {tableColumnsCache: colCache, availableTables: tables} = completionDataRef.current;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const suggestions: any[] = [];

                // 1. 检测 schema.table.  -> 提示字段
                const doubleDotMatch = textBefore.match(/(\w+)\.(\w+)\.\s*$/);
                if (doubleDotMatch) {
                    const schema = doubleDotMatch[1];
                    const table = doubleDotMatch[2];
                    const fullName = `${schema}.${table}`;
                    const columns = colCache[fullName] || colCache[table];
                    if (columns) {
                        columns.forEach(col => {
                            suggestions.push({
                                label: col.name,
                                kind: monaco.languages.CompletionItemKind.Field,
                                insertText: col.name,
                                range,
                                detail: `${col.type} ${col.comment || ''}`
                            });
                        });
                        return {suggestions};
                    }
                }

                // 2. 检测 xxx.  -> 表字段 或 schema 下的表
                const dotMatch = textBefore.match(/(\w+)\.\s*$/);
                if (dotMatch) {
                    const prefix = dotMatch[1];

                    // 先尝试作为表名/别名获取字段
                    const columns = colCache[prefix];
                    const fullKey = Object.keys(colCache).find(k => k === prefix || k.endsWith(`.${prefix}`));
                    const columnsByFull = fullKey ? colCache[fullKey] : undefined;

                    if (columns || columnsByFull) {
                        const cols = columns || columnsByFull!;
                        cols.forEach(col => {
                            suggestions.push({
                                label: col.name,
                                kind: monaco.languages.CompletionItemKind.Field,
                                insertText: col.name,
                                range,
                                detail: `${col.type} ${col.comment || ''}`
                            });
                        });
                        return {suggestions};
                    }

                    // 否则作为 schema，提示该 schema 下的表
                    const schemaTables = tables.filter(t => t.name.startsWith(`${prefix}.`));
                    if (schemaTables.length > 0) {
                        schemaTables.forEach(t => {
                            suggestions.push({
                                label: t.name,
                                kind: monaco.languages.CompletionItemKind.Class,
                                insertText: t.name,
                                range,
                                detail: t.title
                            });
                        });
                        return {suggestions};
                    }
                }

                // 3. 判断上下文
                const isTableContext = /(FROM|JOIN|INTO|UPDATE|TABLE|DESCRIBE)\s+[\w.]*$/i.test(textBefore);
                const isColumnContext = /(SELECT|WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|SET|ON|AND|OR|,)\s+[\w\s,.]*$/i.test(textBefore);

                // 表名上下文优先提供表名
                if (isTableContext) {
                    tables.forEach(t => {
                        suggestions.push({
                            label: t.name,
                            kind: monaco.languages.CompletionItemKind.Class,
                            insertText: t.name,
                            range,
                            detail: t.title
                        });
                    });
                }

                // 列名上下文提供字段
                if (isColumnContext) {
                    const allColumns = new Map<string, string>();
                    Object.values(colCache).forEach(cols => {
                        cols.forEach(col => {
                            if (!allColumns.has(col.name)) {
                                allColumns.set(col.name, `${col.type} ${col.comment || ''}`);
                            }
                        });
                    });
                    allColumns.forEach((detail, colName) => {
                        suggestions.push({
                            label: colName,
                            kind: monaco.languages.CompletionItemKind.Field,
                            insertText: colName,
                            range,
                            detail
                        });
                    });
                }

                // SQL 关键字
                SQL_KEYWORDS.forEach(kw => {
                    suggestions.push({
                        label: kw,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: kw,
                        range
                    });
                });

                // 数据类型
                DATA_TYPES.forEach(dt => {
                    suggestions.push({
                        label: dt,
                        kind: monaco.languages.CompletionItemKind.TypeParameter,
                        insertText: dt,
                        range
                    });
                });

                // 函数
                SQL_FUNCTIONS.forEach(fn => {
                    suggestions.push({
                        label: fn,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: fn + '($0)',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range
                    });
                });

                // 非表名上下文也提供表名（供用户随时输入）
                if (!isTableContext) {
                    tables.forEach(t => {
                        suggestions.push({
                            label: t.name,
                            kind: monaco.languages.CompletionItemKind.Class,
                            insertText: t.name,
                            range,
                            detail: t.title
                        });
                    });
                }

                return {suggestions};
            }
        });

        // 快捷键
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, handleExecute);
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, onFormat);
    }, [handleExecute, onFormat]);

    // 复制
    const copySQL = useCallback(() => {
        if (value) {
            navigator.clipboard.writeText(value);
            message.success('已复制');
        }
    }, [value]);

    // 清空
    const clearSQL = useCallback(() => {
        onChange('');
    }, [onChange]);

    return (
        <div style={{height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column'}}>
            {/* 工具栏 */}
            <div style={{
                padding: '8px 12px',
                borderBottom: `1px solid ${isDark ? '#303030' : '#f0f0f0'}`,
                background: isDark ? '#1e1e1e' : '#fafafa',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Space>
                    {showRun && (
                        <Tooltip title="执行选中内容或全部 (Ctrl+Enter)">
                            <Button type="primary" icon={<CaretRightOutlined/>} onClick={handleExecute}>运行</Button>
                        </Tooltip>
                    )}
                    <Tooltip title="执行计划">
                        <Button icon={<FileSearchOutlined/>} onClick={onExecutePlan}/>
                    </Tooltip>
                    {showFormat && (
                        <Tooltip title="格式化 (Ctrl+Shift+F)">
                            <Button icon={<FormatPainterOutlined/>} onClick={onFormat}/>
                        </Tooltip>
                    )}
                </Space>
                
                <Space>
                    <Tooltip title="复制">
                        <Button icon={<CopyOutlined/>} onClick={copySQL}/>
                    </Tooltip>
                    <Tooltip title="清空">
                        <Button icon={<ClearOutlined/>} onClick={clearSQL}/>
                    </Tooltip>
                    <Tooltip title="全屏">
                        <Button icon={<FullscreenOutlined/>}/>
                    </Tooltip>
                </Space>
            </div>

            {/* 编辑器 */}
            <div style={{flex: 1, minHeight: 0}}>
                <Editor
                    height="100%"
                    defaultLanguage="sql"
                    defaultValue={value}
                    onChange={(val) => onChange(val || '')}
                    onMount={handleEditorDidMount}
                    theme={isDark ? "vs-dark" : "vs-light"}
                    options={{
                        minimap: {enabled: false},
                        fontSize: 14,
                        lineNumbers: 'on',
                        wordWrap: 'on',
                        automaticLayout: true,
                        quickSuggestions: true,
                        suggestOnTriggerCharacters: true,
                        tabSize: 2,
                        scrollBeyondLastLine: false,
                        folding: true,
                        cursorBlinking: 'smooth',
                        renderLineHighlight: 'line',
                        smoothScrolling: true
                    }}
                />
            </div>
        </div>
    );
};

export default SQLEditor;
