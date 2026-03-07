import request from "./Request.ts";
import {Response} from "./Response.ts";

export interface SubjectDTO {
    id: string;
    subjectCode: string;
    subjectName: string;
    subjectDesc: string;
    parentId: string;
    level: number;
    openStatus: string;
    createBy: string;
    updateBy: string;
    createdAt: string;
    updatedAt: string;
    children: SubjectDTO[];
}
// 获取所有主题
export const listSubjects = async () : Promise<SubjectDTO[]> => {
    try {
        const data =  await request.get('/api/v1/metadata/subjects')
        return data.data
    } catch (error){
        // 错误处理：打印日志 + 抛出错误（让调用方处理），避免静默失败
        console.error('获取主题列表失败:', error);
        throw new Error('获取主题列表失败，请稍后重试');
    }

}