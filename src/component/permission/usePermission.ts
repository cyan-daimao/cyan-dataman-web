import { useMemo } from 'react';

/**
 * 权限检查 Hook
 * 返回用户是否拥有指定权限
 *
 * Phase 1：基于 localStorage 缓存的权限列表判断
 */
export const usePermission = (permission?: string): boolean => {
    return useMemo(() => {
        if (!permission) return true;

        const cachedPermissions = localStorage.getItem('user_function_permissions');
        if (!cachedPermissions) return true;

        try {
            const permissions = JSON.parse(cachedPermissions) as string[];
            if (permissions.includes('*')) return true;
            return permissions.includes(permission);
        } catch {
            return true;
        }
    }, [permission]);
};

/**
 * 检查多个权限，返回权限映射
 */
export const usePermissions = (permissionList: string[]): Record<string, boolean> => {
    const deps = permissionList.join(',');
    return useMemo(() => {
        const cachedPermissions = localStorage.getItem('user_function_permissions');
        const result: Record<string, boolean> = {};

        if (!cachedPermissions) {
            permissionList.forEach(p => { result[p] = true; });
            return result;
        }

        try {
            const userPerms = JSON.parse(cachedPermissions) as string[];
            const isAdmin = userPerms.includes('*');
            permissionList.forEach(p => {
                result[p] = isAdmin || userPerms.includes(p);
            });
        } catch {
            permissionList.forEach(p => { result[p] = true; });
        }

        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deps]);
};
