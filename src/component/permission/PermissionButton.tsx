import React from 'react';
import { Button, Tooltip } from 'antd';
import type { ButtonProps } from 'antd';

interface PermissionButtonProps extends ButtonProps {
    /** 所需权限标识 */
    permission?: string;
    /** 无权限时的提示文字，默认不显示 */
    noPermissionTip?: string;
    /** 无权限时是否渲染为禁用状态，否则不渲染 */
    disabledMode?: boolean;
}

/**
 * 权限按钮组件
 * 根据用户功能权限动态控制按钮的显隐或禁用状态
 *
 * Phase 1：基于 localStorage 缓存的权限列表判断
 * 后续可切换为从权限中心实时查询
 */
const PermissionButton: React.FC<PermissionButtonProps> = ({
    permission,
    noPermissionTip,
    disabledMode = false,
    children,
    ...restProps
}) => {
    // 如果未指定权限，直接渲染
    if (!permission) {
        return <Button {...restProps}>{children}</Button>;
    }

    const cachedPermissions = localStorage.getItem('user_function_permissions');
    let hasPermission = true;

    if (cachedPermissions) {
        try {
            const permissions = JSON.parse(cachedPermissions) as string[];
            if (!permissions.includes('*') && !permissions.includes(permission)) {
                hasPermission = false;
            }
        } catch {
            // parse 失败默认有权限
        }
    }

    if (!hasPermission) {
        if (disabledMode) {
            const button = (
                <Button {...restProps} disabled>
                    {children}
                </Button>
            );
            if (noPermissionTip) {
                return <Tooltip title={noPermissionTip}>{button}</Tooltip>;
            }
            return button;
        }
        return null;
    }

    return <Button {...restProps}>{children}</Button>;
};

export default PermissionButton;
