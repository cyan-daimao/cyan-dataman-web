import { dataCollectionRequest } from '@/api/Request';
import dayjs from "dayjs";

/**
 * 平台自身轻量埋点工具
 * 调用 /rpc/data-collection/collect/events 上报 bigdata_module_click 事件
 * 不依赖登录态，请求失败不影响业务
 */

const APP_CODE = 'dataman_web';
const MODULE_CLICK_EVENT_CODE = 'bigdata_module_click';
const TERMINAL_TYPE = 'WEB';
const ENVIRONMENT = import.meta.env.MODE === 'prod' ? 'PROD' : 'TEST';

/**
 * 生成简单唯一 ID
 */
function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 获取或创建会话 ID
 */
function getSessionId(): string {
    let sid = sessionStorage.getItem('_tracking_session_id');
    if (!sid) {
        sid = generateId('sess');
        sessionStorage.setItem('_tracking_session_id', sid);
    }
    return sid;
}

/**
 * 获取匿名 ID
 */
function getAnonymousId(): string {
    let aid = localStorage.getItem('_tracking_anonymous_id');
    if (!aid) {
        aid = generateId('anon');
        localStorage.setItem('_tracking_anonymous_id', aid);
    }
    return aid;
}

/**
 * 获取当前登录员工 ID
 */
function getEmployeeId(): string | undefined {
    const current = readCurrentUser(sessionStorage.getItem('current'))
        || readCurrentUser(localStorage.getItem('current'))
        || readCurrentUser(localStorage.getItem('CURRENT_USER'));
    return current?.id || undefined;
}

/**
 * 读取当前用户缓存
 */
function readCurrentUser(raw: string | null): Record<string, string | undefined> | undefined {
    if (!raw) {
        return undefined;
    }
    try {
        const user = JSON.parse(raw);
        return user && typeof user === 'object' ? user : undefined;
    } catch {
        return undefined;
    }
}

/**
 * 获取 Debug Token（测试环境支持）
 */
function getDebugToken(): string | undefined {
    if (ENVIRONMENT === 'TEST' || ENVIRONMENT === 'DEV') {
        return localStorage.getItem('_tracking_debug_token') || undefined;
    }
    return undefined;
}

/**
 * 上报 bigdata_module_click 事件
 * @param moduleCode 模块编码
 * @param moduleName 模块名称
 * @param routePath 路由路径
 * @param extra 额外属性（parentModuleCode, clickPosition, sourcePage 等）
 */
export function trackModuleClick(
    moduleCode: string,
    moduleName: string,
    routePath: string,
    extra?: Record<string, string | undefined>
): void {
    const employeeId = getEmployeeId();
    const payload = {
        common: {
            app_code: APP_CODE,
            terminal_type: TERMINAL_TYPE,
            environment: ENVIRONMENT,
            anonymous_id: getAnonymousId(),
            session_id: getSessionId(),
            page_code: window.location.pathname,
        },
        action: {
            event_code: MODULE_CLICK_EVENT_CODE,
            event_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            event_type: 'CLICK',
            click_position: extra?.clickPosition,
        },
        business: {
            module_code: moduleCode,
            module_name: moduleName,
            route_path: routePath,
            parent_module_code: extra?.parentModuleCode,
            employee_id: employeeId,
        },
        extra: {
            request_id: generateId('req'),
            debug_token: getDebugToken(),
            source_page: extra?.sourcePage,
        },
    };

    dataCollectionRequest
        .post('/rpc/data-collection/collect/events', payload)
        .catch(() => {
            // 埋点上报失败静默处理，不影响业务
        });
}

/**
 * 设置 Debug Token（测试调试用）
 */
export function setTrackingDebugToken(token: string): void {
    localStorage.setItem('_tracking_debug_token', token);
}
