import {useRef, useState} from 'react';
import Editor, {Monaco} from '@monaco-editor/react';
import {Button, Dropdown, Input, message, Space, Tooltip} from 'antd';
import type {MenuProps} from 'antd';
import {
    CaretRightOutlined,
    ClearOutlined,
    CopyOutlined,
    FileSearchOutlined,
    FormatPainterOutlined,
    FullscreenOutlined,
    PlayCircleOutlined,
    QuestionCircleOutlined,
    ReloadOutlined,
    SearchOutlined,
    SwapOutlined
} from '@ant-design/icons';

interface SQLEditorProps {
    value: string;
    onChange: (value: string) => void;
    onExecute: () => void;
    onExecutePlan: () => void;
    onFormat: () => void;
    selectedTable?: string;
}

const SQLEditor: React.FC<SQLEditorProps> = ({
    value,
    onChange,
    onExecute,
    onExecutePlan,
    onFormat,
    selectedTable
}) => {
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const [searchVisible, setSearchVisible] = useState(false);
    const [replaceVisible, setReplaceVisible] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [replaceValue, setReplaceValue] = useState('');

    // SQL 关键字提示词
    const sqlKeywords = [
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN',
        'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS NULL', 'IS NOT NULL',
        'GROUP BY', 'HAVING', 'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
        'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
        'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'TRUNCATE TABLE',
        'CREATE VIEW', 'DROP VIEW',
        'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT',
        'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
        'DISTINCT', 'ALL', 'AS', 'WITH',
        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
        'CAST', 'CONVERT', 'COALESCE', 'NULLIF',
        'INNER', 'OUTER', 'CROSS', 'NATURAL',
        'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES', 'CONSTRAINT',
        'INDEX', 'UNIQUE', 'DEFAULT', 'CHECK'
    ];

    // 数据类型提示词
    const dataTypes = [
        'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
        'FLOAT', 'DOUBLE', 'DECIMAL',
        'VARCHAR', 'CHAR', 'TEXT', 'STRING',
        'DATE', 'TIME', 'TIMESTAMP', 'DATETIME',
        'BOOLEAN', 'BINARY', 'VARBINARY',
        'ARRAY', 'MAP', 'STRUCT'
    ];

    // 函数提示词
    const functions = [
        'DATE_FORMAT', 'STR_TO_DATE', 'NOW', 'CURRENT_DATE', 'CURRENT_TIME',
        'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
        'CONCAT', 'SUBSTRING', 'LENGTH', 'TRIM', 'UPPER', 'LOWER', 'REPLACE',
        'ROUND', 'FLOOR', 'CEIL', 'ABS', 'MOD', 'POWER', 'SQRT',
        'IF', 'IFNULL', 'NVL', 'GREATEST', 'LEAST',
        'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD',
        'FIRST_VALUE', 'LAST_VALUE', 'OVER', 'PARTITION BY'
    ];

    // 编辑器挂载
    const handleEditorDidMount = (editor: any, monaco: Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // 注册 SQL 补全提供者
        monaco.languages.registerCompletionItemProvider('sql', {
            provideCompletionItems: (model: any, position: any) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };

                const suggestions: any[] = [];

                // 关键字
                sqlKeywords.forEach(keyword => {
                    suggestions.push({
                        label: keyword,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: keyword,
                        range: range,
                        detail: 'SQL关键字'
                    });
                });

                // 数据类型
                dataTypes.forEach(type => {
                    suggestions.push({
                        label: type,
                        kind: monaco.languages.CompletionItemKind.TypeParameter,
                        insertText: type,
                        range: range,
                        detail: '数据类型'
                    });
                });

                // 函数
                functions.forEach(func => {
                    suggestions.push({
                        label: func,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: func + '($0)',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range: range,
                        detail: 'SQL函数'
                    });
                });

                // 自定义表名提示
                if (selectedTable) {
                    suggestions.push({
                        label: selectedTable,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: selectedTable,
                        range: range,
                        detail: '数据表'
                    });
                }

                return {suggestions};
            }
        });

        // 快捷键绑定
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            onExecute();
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
            onFormat();
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
            setSearchVisible(true);
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
            setReplaceVisible(!replaceVisible);
        });
    };

    // 格式化 SQL
    const formatSQL = () => {
        if (!value) return;
        
        // 简单的 SQL 格式化
        let formatted = value
            .replace(/\s+/g, ' ')
            .replace(/\s*,\s*/g, ',\n    ')
            .replace(/\s+(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|GROUP BY|HAVING|ORDER BY|LIMIT|UNION|WITH)/gi, '\n$1')
            .replace(/\s+(AND|OR)/gi, '\n    $1')
            .trim();
        
        onChange(formatted);
        message.success('SQL已格式化');
    };

    // 查找
    const handleFind = () => {
        if (!editorRef.current || !searchValue) return;
        const matches = editorRef.current.getModel().findMatches(
            searchValue,
            true,
            false,
            false,
            null,
            true
        );
        if (matches.length > 0) {
            editorRef.current.revealRange(matches[0].range);
            editorRef.current.setPosition({
                lineNumber: matches[0].range.startLineNumber,
                column: matches[0].range.startColumn
            });
        }
        message.info(`找到 ${matches.length} 个匹配`);
    };

    // 替换
    const handleReplace = () => {
        if (!editorRef.current || !searchValue) return;
        const newValue = value.split(searchValue).join(replaceValue);
        onChange(newValue);
        message.success('替换完成');
    };

    // 复制 SQL
    const copySQL = () => {
        if (value) {
            navigator.clipboard.writeText(value);
            message.success('已复制到剪贴板');
        }
    };

    // 清空
    const clearSQL = () => {
        onChange('');
    };

    // 执行菜单
    const executeMenuItems: MenuProps['items'] = [
        {
            key: 'execute',
            label: '执行 (Ctrl+Enter)',
            icon: <CaretRightOutlined/>,
            onClick: onExecute
        },
        {
            key: 'executePlan',
            label: '查看执行计划',
            icon: <FileSearchOutlined/>,
            onClick: onExecutePlan
        },
        {
            type: 'divider'
        },
        {
            key: 'format',
            label: '格式化 (Ctrl+Shift+F)',
            icon: <FormatPainterOutlined/>,
            onClick: formatSQL
        }
    ];

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
                    <Dropdown menu={{items: executeMenuItems}} trigger={['click']}>
                        <Button type="primary" icon={<CaretRightOutlined/>}>
                            运行
                        </Button>
                    </Dropdown>
                    <Tooltip title="执行计划">
                        <Button icon={<FileSearchOutlined/>} onClick={onExecutePlan}/>
                    </Tooltip>
                    <Tooltip title="格式化">
                        <Button icon={<FormatPainterOutlined/>} onClick={formatSQL}/>
                    </Tooltip>
                </Space>
                
                <Space>
                    <Tooltip title="查找 (Ctrl+F)">
                        <Button 
                            icon={<SearchOutlined/>} 
                            onClick={() => setSearchVisible(!searchVisible)}
                            type={searchVisible ? 'primary' : 'default'}
                        />
                    </Tooltip>
                    <Tooltip title="替换 (Ctrl+H)">
                        <Button 
                            icon={<SwapOutlined/>} 
                            onClick={() => setReplaceVisible(!replaceVisible)}
                            type={replaceVisible ? 'primary' : 'default'}
                        />
                    </Tooltip>
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

            {/* 查找/替换面板 */}
            {(searchVisible || replaceVisible) && (
                <div style={{
                    padding: '8px 12px',
                    background: '#f5f5f5',
                    borderBottom: '1px solid #e8e8e8'
                }}>
                    <Space direction="vertical" style={{width: '100%'}}>
                        <Input
                            placeholder="查找"
                            prefix={<SearchOutlined/>}
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onPressEnter={handleFind}
                            allowClear
                        />
                        {replaceVisible && (
                            <Input
                                placeholder="替换为"
                                prefix={<SwapOutlined/>}
                                value={replaceValue}
                                onChange={(e) => setReplaceValue(e.target.value)}
                                onPressEnter={handleReplace}
                                allowClear
                            />
                        )}
                    </Space>
                </div>
            )}

            {/* 提示词栏 */}
            <div style={{
                padding: '4px 12px',
                background: '#e6f7ff',
                borderBottom: '1px solid #91d5ff',
                fontSize: 12,
                color: '#1890ff'
            }}>
                <Space split={<span>|</span>}>
                    <span><QuestionCircleOutlined/> 提示: 输入 SELECT、FROM 等关键字会有自动补全</span>
                    <span>Ctrl+Enter 执行 | Ctrl+F 查找 | Ctrl+H 替换 | Ctrl+Shift+F 格式化</span>
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
                        suggestOnTriggerCharacters: true,
                        quickSuggestions: true,
                        acceptSuggestionOnEnter: 'on',
                        tabSize: 4,
                        scrollBeyondLastLine: false,
                        folding: true,
                        foldingHighlight: true,
                        renderWhitespace: 'selection',
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on'
                    }}
                />
            </div>
        </div>
    );
};

export default SQLEditor;
