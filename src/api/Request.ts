import axios from 'axios';
import { message } from "antd";
import { getStorage, removeStorage } from '../utils/storage';
import { KEY } from '../utils/storage';

// 扩展环境URL配置：区分不同业务线的基础地址
const envURL: { [key: string]: { [key: string]: string } } = {
    "dev": {
        dataman: "http://cyan-dataman.cyan.com/",
        employee: "http://cyan-employee.cyan.com/",
        datagateway: "http://cyan-datagateway.cyan.com/",
        datametric: "http://localhost:8080/",
        databi: "http://localhost:8085",
        dataworks: "http://localhost:8086",
        dataauth: "http://localhost:8087",
        dify: "http://10.0.0.2:20080",
    },
    "pre": {
        dataman: "http://cyan-dataman-pre.cyan.com/",
        employee: "http://cyan-employee-pre.cyan.com/",
        datagateway: "http://cyan-datagateway-pre.cyan.com/",
        datametric: "http://cyan-datametric-pre.cyan.com/",
        databi: "http://cyan-databi-pre.cyan.com/",
        dataworks: "http://cyan-dataworks-pre.cyan.com/",
        dataauth: "http://cyan-dataauth-pre.cyan.com/",
        dify: "http://10.0.0.2:20080",
    },
    "prod":  {
        // dataman: "http://cyan-dataman-prod.cyan.com/",
        dataman: "http://8.130.24.136:9101/",
        // employee: "http://cyan-employee-prod.cyan.com/",
        employee: "http://8.130.24.136:9104/",
        // datagateway: "http://cyan-datagateway-prod.cyan.com/",
        datagateway: "http://8.130.24.136:9103/",
        // datametric: "http://cyan-datametric-prod.cyan.com/",
        datametric: "http://8.130.24.136:9107/",
        // databi: "http://cyan-databi-prod.cyan.com/",
        databi: "http://8.130.24.136:9106",
        // dataworks: "http://cyan-dataworks-prod.cyan.com/",
        dataworks: "http://8.130.24.136:9108/",
        dataauth: "http://8.130.24.136:9109/",
        dify: "http://8.130.24.136:20080",
    },
    // vite preview 默认使用 production mode
    "production":  {
        dataman: "http://cyan-dataman.cyan.com/",
        employee: "http://cyan-employee.cyan.com/",
        datagateway: "http://cyan-datagateway.cyan.com/",
        datametric: "http://localhost:8080/",
        databi: "http://localhost:8085",
        dataworks: "http://localhost:8086",
        dataauth: "http://localhost:8087",
        dify: "http://10.0.0.2:20080",
    },
};

// 获取当前环境的基础URL（默认使用dataman）
export const getBaseURL = (service = 'dataman') => {
    const currentMode = import.meta.env.MODE;
    // 容错：如果当前环境配置不存在，使用默认地址
    return envURL[currentMode]?.[service] || `http://localhost:8080`;
};

// 创建通用请求方法（支持指定业务线）
const createRequest = (service = 'dataman') => {
    // 创建 Axios 实例
    const request = axios.create({
        baseURL: getBaseURL(service),
        timeout: 720000,
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });

    // --------------- 请求拦截器 ---------------
    request.interceptors.request.use(
        (config) => {
            const token = getStorage(KEY.TOKEN, '');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            } else {
                window.location.href = '/login';
                return Promise.reject(new Error('未登录，请重新登录'));
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // --------------- 响应拦截器 ---------------
    request.interceptors.response.use((response) => {
            if (response.data.code !== 200) {
                message.error(response.data.message || '操作失败').then()
                return Promise.reject(new Error(response.data.message || '操作失败'));
            }
            return response.data;
        },
        (error) => {
            const status = error.response?.status;
            let msg: string;

            switch (status) {
                case 401:
                    removeStorage('token');
                    window.location.href = '/login';
                    msg = '登录已过期，请重新登录';
                    break;
                case 403:
                    msg = '无权限访问';
                    break;
                case 500:
                    msg = '服务器内部错误';
                    break;
                default:
                    msg = error.response?.data?.message || error.message || '未知错误';
            }

            message.error(msg).then();
            return Promise.reject(error);
        }
    );

    return request;
};

// 默认导出 dataman 业务线的请求实例（保持原有使用方式不变）
export default createRequest('dataman');

// 单独导出 employee 业务线的请求实例
export const employeeRequest = createRequest('employee');
export const datamanRequest = createRequest('dataman');
export const datagatewayRequest = createRequest('datagateway');
export const datametricRequest = createRequest('datametric');
export const databiRequest = createRequest('databi');
export const dataworksRequest = createRequest('dataworks');
export const dataauthRequest = createRequest('dataauth');

// 也可以导出创建函数，支持后续扩展更多业务线
export const createCustomRequest = createRequest;
