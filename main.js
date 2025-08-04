const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 存储密码数据的文件路径
const DATA_FILE = path.join(app.getPath('userData'), 'passwords.enc');

// 加密密钥（在实际应用中应该使用更安全的方式存储和管理）
let MASTER_KEY = null;

// 创建主窗口
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    icon: path.join(__dirname, 'assets/icon.png'), 
    minWidth: 600,
    minHeight: 500,
    autoHideMenuBar: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 设置应用图标（用于任务栏）
  if (process.platform === 'win32') {
    mainWindow.setIcon(path.join(__dirname, 'assets/icon.png'));
  }

  // 加载主页面
  mainWindow.loadFile('index.html');

  // 开发环境打开开发者工具
  // mainWindow.webContents.openDevTools();

  return mainWindow;
}

// 加密数据
function encryptData(data, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return { iv: iv.toString('hex'), authTag, encrypted };
}

// 解密数据
function decryptData(encData, key) {
  try {
    const iv = Buffer.from(encData.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(Buffer.from(encData.authTag, 'hex'));
    let decrypted = decipher.update(encData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('解密失败:', error);
    return null;
  }
}

// 保存密码数据
function savePasswords(passwords) {
  if (!MASTER_KEY) return false;
  
  try {
    const encryptedData = encryptData(passwords, MASTER_KEY);
    fs.writeFileSync(DATA_FILE, JSON.stringify(encryptedData));
    return true;
  } catch (error) {
    console.error('保存密码失败:', error);
    return false;
  }
}

// 加载密码数据
function loadPasswords() {
  if (!MASTER_KEY) return [];
  
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    
    const encryptedData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return decryptData(encryptedData, MASTER_KEY) || [];
  } catch (error) {
    console.error('加载密码失败:', error);
    return [];
  }
}

// 应用准备就绪时创建窗口
app.whenReady().then(() => {
  const mainWindow = createWindow();
  
  // 处理主密码验证
  ipcMain.handle('verify-master-password', (event, password) => {
    // 在实际应用中，应该使用更安全的方式验证主密码
    // 这里简单地使用密码生成密钥
    MASTER_KEY = crypto.scryptSync(password, 'salt', 32);
    const passwords = loadPasswords();
    
    // 如果能成功加载密码，说明主密码正确
    return { success: true, passwords };
  });
  
  // 获取所有密码
  ipcMain.handle('get-passwords', () => {
    return loadPasswords();
  });
  
  // 添加或更新密码
  ipcMain.handle('save-password', (event, passwordData) => {
    const passwords = loadPasswords();
    const index = passwords.findIndex(p => p.id === passwordData.id);
    
    if (index >= 0) {
      passwords[index] = passwordData;
    } else {
      passwordData.id = Date.now().toString();
      passwords.push(passwordData);
    }
    
    const success = savePasswords(passwords);
    return { success, passwords };
  });
  
  // 删除密码
  ipcMain.handle('delete-password', (event, id) => {
    const passwords = loadPasswords();
    const newPasswords = passwords.filter(p => p.id !== id);
    
    const success = savePasswords(newPasswords);
    return { success, passwords: newPasswords };
  });
  
  // 搜索密码
  ipcMain.handle('search-passwords', (event, query) => {
    const passwords = loadPasswords();
    if (!query) return passwords;
    
    const lowerQuery = query.toLowerCase();
    return passwords.filter(p => 
      p.title.toLowerCase().includes(lowerQuery) || 
      p.username.toLowerCase().includes(lowerQuery) || 
      p.website.toLowerCase().includes(lowerQuery) || 
      p.notes.toLowerCase().includes(lowerQuery)
    );
  });
  
  // 导出密码
  ipcMain.handle('export-passwords', async () => {
    const passwords = loadPasswords();
    
    const { filePath } = await dialog.showSaveDialog({
      title: '导出密码',
      defaultPath: path.join(app.getPath('documents'), 'passwords.json'),
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    
    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(passwords, null, 2));
      return { success: true };
    }
    
    return { success: false };
  });
  
  // 导入密码
  ipcMain.handle('import-passwords', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: '导入密码',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    });
    
    if (filePaths && filePaths.length > 0) {
      try {
        const importedData = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
        const currentPasswords = loadPasswords();
        
        // 合并密码，避免重复
        const mergedPasswords = [...currentPasswords];
        importedData.forEach(imported => {
          if (!mergedPasswords.some(p => p.id === imported.id)) {
            mergedPasswords.push(imported);
          }
        });
        
        const success = savePasswords(mergedPasswords);
        return { success, passwords: mergedPasswords };
      } catch (error) {
        console.error('导入密码失败:', error);
        return { success: false, error: '导入失败，文件格式不正确' };
      }
    }
    
    return { success: false };
  });
  
  // 打开外部链接
  ipcMain.handle('open-external', async (event, url) => {
    try {
      // 验证URL格式，确保安全
      const validUrl = new URL(url);
      if (validUrl.protocol === 'http:' || validUrl.protocol === 'https:') {
        await shell.openExternal(url);
        return { success: true };
      } else {
        return { success: false, error: '不支持的URL协议' };
      }
    } catch (error) {
      console.error('打开外部链接失败:', error);
      return { success: false, error: '无效的URL' };
    }
  });
});

// 所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});