import React, {useEffect, useState} from 'react';
import {Select} from 'antd';
import {listEmployees} from "../../api/EmployeeApi.ts";

// 定义组件入参（移除无用的name相关，只保留必要属性）
interface EmployeeSelectProps {
    placeholder?: string;
    // 回显
    value?: string;
    // 可选：支持自定义选中事件（非必须，Form已接管）
    onChange?: (value: string) => void;
}

// 通用用户搜索选择组件（适配 Ant Design Form）
const EmployeeSelect: React.FC<EmployeeSelectProps> = ({
                                                           placeholder = "选择用户",
                                                           value,
                                                           onChange: onParentChange,
                                                       }) => {
    const [userOptions, setUserOptions] = useState<{ label: string; value: string }[]>([]);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const resp = await listEmployees();
                if (!resp || !Array.isArray(resp.data)) {
                    console.warn('员工列表数据格式错误:', resp);
                    return;
                }
                const options = resp.data.map((item) => ({
                    label: item.cnName + ' - ' + item.passport,
                    value: item.passport
                }));
                setUserOptions(options);
            } catch (error) {
                console.error('获取员工列表失败:', error);
                setUserOptions([]);
            }
        };
        fetchEmployees().then();
    }, []);

    // 内部选中事件（可选：透传父组件的onChange）
    const handleChange = (value: string) => {
        if (onParentChange) {
            onParentChange(value);
        }
    };

    return (
        <Select
            showSearch={true}
            optionFilterProp="label"
            value={value}
            placeholder={placeholder}
            options={userOptions}
            onChange={handleChange}
            // onSearch={(value) => console.log('搜索用户:', value)}
        />
    );
};

export default EmployeeSelect;