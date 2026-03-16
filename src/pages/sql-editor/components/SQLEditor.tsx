import {useRef, useCallback, memo} from 'react';
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
import {ColumnVO} from '../../../api/MetadataTableAPI';

interface SQLEditorProps {
    value: string;
    onChange: (value: string) => void;
    onExecute: () => void;
    onExecutePlan: () => void;
    onFormat: () => void;
    tableColumnsCache?: Record<string, ColumnVO[]>;
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
    tableColumnsCache = {}
}) => {
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<Monaco | null>(null);

    // 编辑器挂载
    const handleEditorDidMount = useCallback((editor: any, monaco: Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // 注册 SQL 补全
        monaco.languages.registerCompletionItemProvider('sql', {
            triggerCharacters: ['.'],
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
                
                const suggestions: any[] = [];

                // 检测 表名. 或 别名.
                const dotMatch = textBefore.match(/(\w+)\.\s*$/);
                if (dotMatch) {
                    const prefix = dotMatch[1];
                    // 查找表字段
                    const columns = tableColumnsCache[prefix];
                    if (columns) {
                        columns.forEach(col => {
                            suggestions.push({
                                label: col.name,
                                kind: monaco.languages.CompletionItemKind.Field,
                                insertText: col.name,
                                range,
                                detail: `${col.type}`
                            });
                        });
                        return {suggestions};
                    }
                }

                // 关键字
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

                // 表名
                Object.keys(tableColumnsCache).forEach(tableName => {
                    suggestions.push({
                        label: tableName,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: tableName,
                        range,
                        detail: '数据表'
                    });
                });

                return {suggestions};
            }
        });

        // 快捷键
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onExecute);
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, onFormat);
    }, [onExecute, onFormat, tableColumnsCache]);

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
        <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
            {/* 工具栏 */}
            <div style={{
                padding: '8px 12px',
                borderBottom: '1px solid #f0f0f0',
                background: '#fafafa',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Space>
                    <Tooltip title="执行 (Ctrl+Enter)">
                        <Button type="primary" icon={<CaretRightOutlined/>} onClick={onExecute}>运行</Button>
                    </Tooltip>
                    <Tooltip title="执行计划">
                        <Button icon={<FileSearchOutlined/>} onClick={onExecutePlan}/>
                    </Tooltip>
                    <Tooltip title="格式化 (Ctrl+Shift+F)">
                        <Button icon={<FormatPainterOutlined/>} onClick={onFormat}/>
                    </Tooltip>
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
            <div style={{flex: 1}}>
                <Editor
                    height="100%"
                    defaultLanguage="sql"
                    value={value}
                    onChange={(val) => onChange(val || '')}
                    onMount={handleEditorDidMount}
                    theme="vs-light"
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
                        // 性能优化
                        renderLineHighlight: 'line',
                        smoothScrolling: true
                    }}
                />
            </div>
        </div>
    );
};

export default memo(SQLEditor);
