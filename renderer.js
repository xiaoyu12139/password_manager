// 获取DOM元素
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const masterPasswordInput = document.getElementById('master-password');
const loginButton = document.getElementById('login-button');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const addPasswordButton = document.getElementById('add-password-button');
const exportButton = document.getElementById('export-button');
const importButton = document.getElementById('import-button');
const logoutButton = document.getElementById('logout-button');
const passwordsList = document.getElementById('passwords-list');
const noPasswordsMessage = document.getElementById('no-passwords-message');

// 模态框元素
const passwordModal = document.getElementById('password-modal');
const passwordDetailsModal = document.getElementById('password-details-modal');
const confirmDialog = document.getElementById('confirm-dialog');
const modalOverlay = document.getElementById('modal-overlay');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');

// 密码表单元素
const passwordForm = document.getElementById('password-form');
const passwordIdInput = document.getElementById('password-id');
const passwordTitleInput = document.getElementById('password-title');
const passwordUsernameInput = document.getElementById('password-username');
const passwordValueInput = document.getElementById('password-value');
const passwordWebsiteInput = document.getElementById('password-website');
const passwordNotesInput = document.getElementById('password-notes');
const loginTypeSelect = document.getElementById('login-type');
const websiteField = document.getElementById('website-field');

// 密码详情元素
const detailsTitle = document.getElementById('details-title');
const detailTitle = document.getElementById('detail-title');
const detailUsername = document.querySelector('#detail-username .value');
const detailPassword = document.querySelector('#detail-password .value');
const detailWebsite = document.querySelector('#detail-website .value');
const detailNotes = document.getElementById('detail-notes');
const detailCreated = document.getElementById('detail-created');
const detailModified = document.getElementById('detail-modified');
const visitLink = document.querySelector('.visit-link');
const editPasswordButton = document.getElementById('edit-password-button');
const deletePasswordButton = document.getElementById('delete-password-button');

// 确认对话框元素
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmYesButton = document.getElementById('confirm-yes');
const confirmNoButton = document.getElementById('confirm-no');

// 全局变量
let currentPasswords = [];
let currentPasswordId = null;
let confirmCallback = null;

// 初始化应用
function initApp() {
  // 自动聚焦到主密码输入框
  masterPasswordInput.focus();
  
  // 登录按钮点击事件
  loginButton.addEventListener('click', handleLogin);
  
  // 主密码输入框回车键触发登录
  masterPasswordInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  
  // 搜索功能
  searchButton.addEventListener('click', handleSearch);
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  
  // 添加密码按钮
  addPasswordButton.addEventListener('click', () => showPasswordModal());
  
  // 导出/导入按钮
  exportButton.addEventListener('click', handleExport);
  importButton.addEventListener('click', handleImport);
  
  // 退出登录
  logoutButton.addEventListener('click', handleLogout);
  
  // 密码表单提交
  passwordForm.addEventListener('submit', handlePasswordFormSubmit);
  
  // 关闭按钮和取消按钮
  document.querySelectorAll('.close-button, .cancel-button').forEach(button => {
    button.addEventListener('click', closeAllModals);
  });
  
  // 确认对话框按钮
  confirmYesButton.addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeAllModals();
  });
  
  confirmNoButton.addEventListener('click', closeAllModals);
  
  // 密码显示/隐藏切换
  document.querySelectorAll('.toggle-password, .show-button').forEach(button => {
    button.addEventListener('click', togglePasswordVisibility);
  });
  
  // 生成密码按钮
  document.querySelector('.generate-password').addEventListener('click', generatePassword);
  
  // 复制按钮
  document.querySelectorAll('.copy-button').forEach(button => {
    button.addEventListener('click', copyToClipboard);
  });
  
  // 编辑和删除密码按钮
  editPasswordButton.addEventListener('click', () => {
    const password = currentPasswords.find(p => p.id === currentPasswordId);
    if (password) showPasswordModal(password);
    closeModal(passwordDetailsModal);
  });
  
  deletePasswordButton.addEventListener('click', () => {
    showConfirmDialog(
      '删除密码',
      '确定要删除这个密码吗？此操作无法撤销。',
      () => deletePassword(currentPasswordId)
    );
  });
  
  // 访问网站链接
  if (visitLink) {
    visitLink.addEventListener('click', (e) => {
      e.preventDefault();
      const url = e.target.getAttribute('data-url');
      if (url) {
        window.electronAPI.openExternal(url);
      }
    });
  }
  
  // 点击遮罩层关闭模态框
  modalOverlay.addEventListener('click', closeAllModals);
}

// 处理登录
async function handleLogin() {
  const masterPassword = masterPasswordInput.value.trim();
  
  if (!masterPassword) {
    showNotification('请输入主密码');
    return;
  }
  
  try {
    const result = await window.passwordManager.verifyMasterPassword(masterPassword);
    
    if (result.success) {
      // 密码验证成功，加载主界面
      currentPasswords = result.passwords;
      showMainScreen();
      renderPasswordsList();
      masterPasswordInput.value = '';
      console.log('登录成功，已加载主界面');
    } else {
      // 密码验证失败，显示错误信息但不加载主界面
      const errorMessage = result.error || '主密码不正确';
      showNotification(errorMessage);
      console.log('登录失败:', errorMessage);
      // 清空输入框，让用户重新输入
      masterPasswordInput.value = '';
      masterPasswordInput.focus();
    }
  } catch (error) {
    console.error('登录过程中发生异常:', error);
    showNotification('登录失败，请重试');
    // 清空输入框，让用户重新输入
    masterPasswordInput.value = '';
    masterPasswordInput.focus();
  }
}

// 显示主界面
function showMainScreen() {
  loginScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
  // 登录成功后，搜索框自动获取焦点
  setTimeout(() => {
    searchInput.focus();
  }, 100);
}

// 显示登录界面
function showLoginScreen() {
  mainScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');
}

// 处理搜索
async function handleSearch() {
  const query = searchInput.value.trim();
  
  try {
    const results = await window.passwordManager.searchPasswords(query);
    currentPasswords = results;
    renderPasswordsList();
  } catch (error) {
    console.error('搜索失败:', error);
    showNotification('搜索失败，请重试');
  }
}

// 渲染密码列表
function renderPasswordsList() {
  passwordsList.innerHTML = '';
  
  if (currentPasswords.length === 0) {
    passwordsList.innerHTML = '';
    noPasswordsMessage.classList.remove('hidden');
    return;
  }
  
  noPasswordsMessage.classList.add('hidden');
  
  currentPasswords.forEach(password => {
    const row = document.createElement('tr');
    
    // 格式化日期
    const modifiedDate = password.modified ? new Date(password.modified) : new Date();
    const formattedDate = modifiedDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    // 处理登录方式显示
    const loginType = password.loginType || 'website';
    const loginTypeText = {
      'website': '网站',
      'app': '应用程序', 
      'system': '系统',
      'other': '其他'
    }[loginType] || '网站';
    
    let loginMethodDisplay;
    if (loginType === 'website' && password.website) {
      loginMethodDisplay = `<a href="#" class="website-link" data-url="${password.website}">${loginTypeText}</a>`;
    } else {
      loginMethodDisplay = loginTypeText;
    }
    
    row.innerHTML = `
      <td>${password.title}</td>
      <td>${password.username}</td>
      <td>${loginMethodDisplay}</td>
      <td>${formattedDate}</td>
      <td class="password-actions">
        <button class="view-button">查看</button>
        <button class="edit-button">编辑</button>
      </td>
    `;
    
    // 添加查看按钮事件
    row.querySelector('.view-button').addEventListener('click', () => {
      showPasswordDetails(password);
    });

    // 添加编辑按钮事件
    row.querySelector('.edit-button').addEventListener('click', () => {
      showPasswordModal(password);
    });
    
    // 添加网站链接点击事件
    const websiteLink = row.querySelector('.website-link');
    if (websiteLink) {
      websiteLink.addEventListener('click', (e) => {
        e.preventDefault();
        const url = e.target.getAttribute('data-url');
        if (url) {
          // 确保URL有协议前缀
          const fullUrl = url.startsWith('http') ? url : `https://${url}`;
          window.electronAPI.openExternal(fullUrl);
        }
      });
    }
    
    passwordsList.appendChild(row);
  });
}

// 显示密码详情
function showPasswordDetails(password) {
  currentPasswordId = password.id;
  
  // 设置详情内容
  detailsTitle.textContent = password.title;
  detailTitle.textContent = password.title;
  detailUsername.textContent = password.username;
  detailPassword.textContent = '••••••••';
  detailPassword.classList.add('password-dots');
  detailWebsite.textContent = password.website || '-';
  detailNotes.textContent = password.notes || '-';
  
  // 设置创建和修改时间
  const createdDate = new Date(password.created || Date.now());
  const modifiedDate = new Date(password.modified || Date.now());
  
  detailCreated.textContent = createdDate.toLocaleString('zh-CN');
  detailModified.textContent = modifiedDate.toLocaleString('zh-CN');
  
  // 设置网站链接
  if (password.website) {
    let url = password.website;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    visitLink.setAttribute('data-url', url);
    visitLink.classList.remove('hidden');
  } else {
    visitLink.classList.add('hidden');
  }
  
  // 显示模态框
  showModal(passwordDetailsModal);
}

// 显示密码表单模态框
function showPasswordModal(password = null) {
  const modalTitle = document.getElementById('modal-title');
  
  if (password) {
    modalTitle.textContent = '编辑密码';
    passwordIdInput.value = password.id;
    passwordTitleInput.value = password.title;
    passwordUsernameInput.value = password.username;
    passwordValueInput.value = password.password;
    
    // 设置登录方式
    const loginType = password.loginType || 'website';
    loginTypeSelect.value = loginType;
    
    // 设置网站地址
    passwordWebsiteInput.value = password.website || '';
    
    // 控制网站字段显示
    toggleWebsiteField();
    
    passwordNotesInput.value = password.notes || '';
  } else {
    modalTitle.textContent = '添加密码';
    passwordForm.reset();
    passwordIdInput.value = '';
    loginTypeSelect.value = 'website';
    toggleWebsiteField();
  }
  
  showModal(passwordModal);
}

// 处理密码表单提交
async function handlePasswordFormSubmit(e) {
  e.preventDefault();
  
  const passwordData = {
    id: passwordIdInput.value,
    title: passwordTitleInput.value.trim(),
    username: passwordUsernameInput.value.trim(),
    password: passwordValueInput.value,
    loginType: loginTypeSelect.value,
    website: loginTypeSelect.value === 'website' ? passwordWebsiteInput.value.trim() : '',
    notes: passwordNotesInput.value.trim(),
    modified: Date.now()
  };
  
  if (!passwordData.id) {
    passwordData.created = Date.now();
  }
  
  try {
    const result = await window.passwordManager.savePassword(passwordData);
    
    if (result.success) {
      currentPasswords = result.passwords;
      renderPasswordsList();
      closeAllModals();
      showNotification(passwordData.id ? '密码已更新' : '密码已添加');
    } else {
      showNotification('保存失败，请重试');
    }
  } catch (error) {
    console.error('保存密码失败:', error);
    showNotification('保存失败，请重试');
  }
}

// 删除密码
async function deletePassword(id) {
  try {
    const result = await window.passwordManager.deletePassword(id);
    
    if (result.success) {
      currentPasswords = result.passwords;
      renderPasswordsList();
      closeAllModals();
      showNotification('密码已删除');
    } else {
      showNotification('删除失败，请重试');
    }
  } catch (error) {
    console.error('删除密码失败:', error);
    showNotification('删除失败，请重试');
  }
}

// 处理导出
async function handleExport() {
  try {
    const result = await window.passwordManager.exportPasswords();
    
    if (result.success) {
      showNotification('密码已成功导出');
    } else {
      showNotification('导出失败，请重试');
    }
  } catch (error) {
    console.error('导出密码失败:', error);
    showNotification('导出失败，请重试');
  }
}

// 处理导入
async function handleImport() {
  try {
    const result = await window.passwordManager.importPasswords();
    
    if (result.success) {
      currentPasswords = result.passwords;
      renderPasswordsList();
      showNotification('密码已成功导入');
    } else {
      showNotification(result.error || '导入失败，请重试');
    }
  } catch (error) {
    console.error('导入密码失败:', error);
    showNotification('导入失败，请重试');
  }
}

// 处理退出登录
function handleLogout() {
  showConfirmDialog(
    '退出登录',
    '确定要退出登录吗？',
    () => {
      currentPasswords = [];
      showLoginScreen();
    }
  );
}

// 显示确认对话框
function showConfirmDialog(title, message, callback) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmCallback = callback;
  showModal(confirmDialog);
}

// 显示模态框
function showModal(modal) {
  closeAllModals();
  modal.classList.remove('hidden');
  modalOverlay.classList.remove('hidden');
}

// 关闭模态框
function closeModal(modal) {
  modal.classList.add('hidden');
  modalOverlay.classList.add('hidden');
}

// 关闭所有模态框
function closeAllModals() {
  passwordModal.classList.add('hidden');
  passwordDetailsModal.classList.add('hidden');
  confirmDialog.classList.add('hidden');
  modalOverlay.classList.add('hidden');
}

// 切换密码可见性
function togglePasswordVisibility(e) {
  const button = e.target;
  const passwordField = button.closest('.password-field') || button.closest('.detail-item');
  const passwordInput = passwordField.querySelector('input[type="password"]') || passwordField.querySelector('.value');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    button.textContent = '隐藏';
  } else if (passwordInput.classList.contains('password-dots')) {
    passwordInput.classList.remove('password-dots');
    passwordInput.textContent = currentPasswords.find(p => p.id === currentPasswordId).password;
    button.textContent = '隐藏';
  } else {
    if (passwordInput.type) {
      passwordInput.type = 'password';
    } else {
      passwordInput.classList.add('password-dots');
      passwordInput.textContent = '••••••••';
    }
    button.textContent = '显示';
  }
}

// 生成随机密码
function generatePassword() {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=<>?';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  passwordValueInput.value = password;
  showNotification('已生成随机密码');
}

// 复制到剪贴板
function copyToClipboard(e) {
  const field = e.target.dataset.field;
  const password = currentPasswords.find(p => p.id === currentPasswordId);
  
  if (!password) return;
  
  const text = field === 'username' ? password.username : password.password;
  
  navigator.clipboard.writeText(text)
    .then(() => {
      showNotification(`${field === 'username' ? '用户名' : '密码'}已复制到剪贴板`);
    })
    .catch(err => {
      console.error('复制失败:', err);
      showNotification('复制失败');
    });
}

// 显示通知
function showNotification(message) {
  notificationMessage.textContent = message;
  notification.classList.remove('hidden');
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 300);
  }, 3000);
}

// 初始化应用
// 控制网站字段显示
function toggleWebsiteField() {
  const loginType = loginTypeSelect.value;
  if (loginType === 'website') {
    websiteField.style.display = 'block';
  } else {
    websiteField.style.display = 'none';
    passwordWebsiteInput.value = '';
  }
}

document.addEventListener('DOMContentLoaded', initApp);