// localStorage 工具函数

// 存储键名常量
export const KEY = {
  // 登录凭证 token
  TOKEN: 'token',
  // 当前登录用户信息
  CURRENT: 'current',
}

/**
 * 存储数据到 localStorage
 * @param key 存储键名
 * @param value 存储值
 */
export const setStorage = <T>(key: string, value: T): void => {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error('存储数据失败:', error);
  }
};

/**
 * 从 localStorage 获取数据
 * @param key 存储键名
 * @param defaultValue 默认值
 * @returns 存储的数据或默认值
 */
export const getStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const serializedValue = localStorage.getItem(key);
    if (serializedValue === null) {
      return defaultValue;
    }
    return JSON.parse(serializedValue) as T;
  } catch (error) {
    console.error('获取数据失败:', error);
    return defaultValue;
  }
};

/**
 * 从 localStorage 删除数据
 * @param key 存储键名
 */
export const removeStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('删除数据失败:', error);
  }
};

/**
 * 清空 localStorage
 */
export const clearStorage = (): void => {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('清空数据失败:', error);
  }
};

/**
 * 检查 localStorage 是否存在指定键
 * @param key 存储键名
 * @returns 是否存在
 */
export const hasStorage = (key: string): boolean => {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error('检查数据失败:', error);
    return false;
  }
};

/**
 * 存储数据到 sessionStorage
 * @param key 存储键名
 * @param value 存储值
 */
export const setSessionStorage = <T>(key: string, value: T): void => {
  try {
    const serializedValue = JSON.stringify(value);
    sessionStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error('存储会话数据失败:', error);
  }
};

/**
 * 从 sessionStorage 获取数据
 * @param key 存储键名
 * @param defaultValue 默认值
 * @returns 存储的数据或默认值
 */
export const getSessionStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const serializedValue = sessionStorage.getItem(key);
    if (serializedValue === null) {
      return defaultValue;
    }
    return JSON.parse(serializedValue) as T;
  } catch (error) {
    console.error('获取会话数据失败:', error);
    return defaultValue;
  }
};

/**
 * 从 sessionStorage 删除数据
 * @param key 存储键名
 */
export const removeSessionStorage = (key: string): void => {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error('删除会话数据失败:', error);
  }
};
