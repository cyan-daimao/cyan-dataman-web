import {Response} from "./Response";
import axios from "axios";
import { getBaseURL } from "./Request";

const LOGIN_URL = getBaseURL('employee') + '/login'

export interface LoginCmd  {
    passport: string,
    password: string
}
/**
 * 登录接口
 * @param cmd 登录参数
 * @returns Promise<Resp<string>> 包含 token 的响应体
 */
export async function login(cmd: LoginCmd): Promise<Response<string>> {
    try {
        // 方式1：async/await 写法（推荐，更易读）
        const resp = await axios.post<Response<string>>(LOGIN_URL, cmd);
        return resp.data; // axios 响应的 data 才是后端返回的 Resp 结构

        // 方式2：Promise 链写法（等价，供你理解）
        // return axios.post<Resp<string>>(LOGIN_URL, cmd).then(resp => resp.data);
    } catch (error) {
        // 捕获异常并统一处理（比如转换为标准 Resp 格式）
        console.error("登录失败:", error);
        // 返回错误响应（或抛出自定义异常，根据业务需求）
        return {
            code: 500,
            message: error instanceof Error ? error.message : "登录请求失败",
            data: "",
            traceId: "",
        };
    }
}