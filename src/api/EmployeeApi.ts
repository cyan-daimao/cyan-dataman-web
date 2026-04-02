import {employeeRequest} from './Request'
import {Response} from "./Response";

export interface EmployeeDTO {
    id: string
    staffNumber: string
    passport: string
    cnName: string
    enName: string
    phone: string
    email: string
    jobTitle: string
}

/**
 * 获取员工列表
 */
export const listEmployees = () :Promise<Response<EmployeeDTO[]>> => {
    return employeeRequest.get('/api/v1/employee/list')
}

/**
 * 员工表单命令
 */
export interface EmployeeCmd {
    id?: string
    staffNumber: string
    cnName: string
    enName: string
    phone: string
    email: string
    jobTitle: string
}

/**
 * 保存员工
 */
export const saveEmployee = (cmd:EmployeeCmd):Promise<Response<void>> => {
    return employeeRequest.post('/api/v1/employee/save', cmd)
}


/**
 * 获取当前员工
 */
export const currentEmployee = () :Promise<Response<EmployeeDTO>> =>{
    return employeeRequest.get('/api/v1/employee/current')
}