import { dataCollectionRequest } from '@/api/Request';
import dayjs from "dayjs";

/**
 * 平台自身轻量埋点工具
 * 调用 /rpc/data-collection/collect/events 上报 platform_module_click 事件
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
 * 获取当前登录用户 ID
 */
function getUserId(): string | undefined {
    try {
        const user = JSON.parse(localStorage.getItem('CURRENT_USER') || '{}');
        return user?.passport || user?.username || undefined;
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
 * 上报 platform_module_click 事件
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
    const payload = {
        appCode: APP_CODE,
        eventCode: MODULE_CLICK_EVENT_CODE,
        eventTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        requestId: generateId('req'),
        terminalType: TERMINAL_TYPE,
        environment: ENVIRONMENT,
        userId: getUserId(),
        anonymousId: getAnonymousId(),
        sessionId: getSessionId(),
        pageCode: window.location.pathname,
        debugToken: getDebugToken(),
        properties: {
            module_code: moduleCode,
            module_name: moduleName,
            route_path: routePath,
            parent_module_code: extra?.parentModuleCode,
            click_position: extra?.clickPosition,
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
