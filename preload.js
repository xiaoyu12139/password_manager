const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露主进程API给渲染进程
contextBridge.exposeInMainWorld('passwordManager', {
  // 验证主密码
  verifyMasterPassword: (password) => {
    return ipcRenderer.invoke('verify-master-password', password);
  },
  
  // 获取所有密码
  getPasswords: () => {
    return ipcRenderer.invoke('get-passwords');
  },
  
  // 保存密码
  savePassword: (passwordData) => {
    return ipcRenderer.invoke('save-password', passwordData);
  },
  
  // 删除密码
  deletePassword: (id) => {
    return ipcRenderer.invoke('delete-password', id);
  },
  
  // 搜索密码
  searchPasswords: (query) => {
    return ipcRenderer.invoke('search-passwords', query);
  },
  
  // 导出密码
  exportPasswords: () => {
    return ipcRenderer.invoke('export-passwords');
  },
  
  // 导入密码
  importPasswords: () => {
    return ipcRenderer.invoke('import-passwords');
  }
});

// 暴露Electron API
contextBridge.exposeInMainWorld('electronAPI', {
  // 打开外部链接
  openExternal: (url) => {
    return ipcRenderer.invoke('open-external', url);
  }
});