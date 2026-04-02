import {datamanRequest} from "./Request";
import {AxiosRequestConfig} from "axios";

export interface SubjectDTO {
    id: string;
    subjectCode: string;
    subjectName: string;
    subjectDesc: string;
    parentId: string;
    level: number;
    owner: string
    openStatus: string;
    createBy: string;
    updateBy: string;
    createdAt: string;
    updatedAt: string;
    children: SubjectDTO[];
}

export interface SubjectListQuery{
    parentId: string;
}

// 获取主题列表
export const listSubjects = async (query:SubjectListQuery): Promise<SubjectDTO[]> => {
    try {
        const config: AxiosRequestConfig = {
            params: query // GET 请求的参数要放在 params 里
        };
        const data = await datamanRequest.get('/api/v1/metadata/subjects',config)
        return data.data
    } catch (error) {
        // 错误处理：打印日志 + 抛出错误（让调用方处理），避免静默失败
        console.error('获取主题列表失败:', error);
        throw new Error('获取主题列表失败，请稍后重试');
    }
}

// 获取所有主题树
export const treeSubjects = async (): Promise<SubjectDTO[]> => {
    try {
        const data = await datamanRequest.get('/api/v1/metadata/subjects/tree')
        return data.data
    } catch (error) {
        // 错误处理：打印日志 + 抛出错误（让调用方处理），避免静默失败
        console.error('获取主题列表失败:', error);
        throw new Error('获取主题列表失败，请稍后重试');
    }
}

export interface SubjectCmd {
    subjectCode: string;
    subjectName: string;
    subjectDesc: string;
    parentId: string;
    openStatus?: string;
}

// 保存主题
export const saveSubject = async (cmd: SubjectCmd): Promise<SubjectDTO> => {
    try {
        cmd.openStatus = cmd.openStatus || 'OPEN';
        cmd.parentId = cmd.parentId || '0';
        const resp = await datamanRequest.post('/api/v1/metadata/subjects', cmd)
        return resp.data
    } catch (error) {
        console.error('保存主题失败:', error);
        throw new Error('保存主题失败，请稍后重试');
    }
}

// 编辑主题
export const editSubject = async (id: string, cmd: SubjectCmd): Promise<void> => {
    try {
        cmd.openStatus = cmd.openStatus || 'OPEN';
        cmd.parentId = cmd.parentId || '0';
        await datamanRequest.put(`/api/v1/metadata/subjects/${id}`,cmd)
    }catch ( error){
        console.error('删除主题失败:', error);
        throw new Error('删除主题失败，请稍后重试');
    }
}

// 删除主题
export const deleteSubject = async (id: string): Promise<void> => {
    try {
       await datamanRequest.delete(`/api/v1/metadata/subjects/${id}`)
    }catch ( error){
        console.error('删除主题失败:', error);
        throw new Error('删除主题失败，请稍后重试');
    }
}