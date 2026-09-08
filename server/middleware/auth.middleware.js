const jwt = require('jsonwebtoken');
const db = require('../models');
const { canAccessResource, PERMISSION_LEVELS } = require('../utils/employeeValidation');

const User = db.users;

/**
 * JWT 令牌驗證中間件
 */
const verifyToken = async (req, res, next) => {
  try {
    // 從請求標頭中獲取令牌
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        msg: '未提供認證令牌，請先登入'
      });
    }

    // 提取 Bearer/JWT token
    let token;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (authHeader.startsWith('JWT ')) {
      token = authHeader.slice(4);
    } else {
      token = authHeader;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        msg: '認證令牌格式錯誤'
      });
    }

    // ⚠️ 不要在這裡 console.log token 或 process.env.PASSPORT_SECRET——
    // utils/logger.js 會把 console 輸出寫進 server/logs/，等於把 JWT 與密鑰明文落檔。
    // debug 驗證失敗看下面 catch 的錯誤類型即可。
    const decoded = jwt.verify(token, process.env.PASSPORT_SECRET);
    
    // 從資料庫獲取用戶信息
    const user = await User.findOne({
      where: { employee: decoded.employee }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        msg: '用戶不存在，請重新登入'
      });
    }

    // 將用戶信息添加到請求對象
    req.user = {
      id: user.id,
      employee: user.employee,
      username: user.username,
      email: user.email,
      department: user.department,
      level: user.level
    };

    next();
  } catch (error) {
    console.error('JWT驗證錯誤:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        msg: '認證令牌已過期，請重新登入'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        msg: '無效的認證令牌'
      });
    }

    return res.status(500).json({
      success: false,
      msg: '驗證失敗，請稍後再試'
    });
  }
};

/**
 * 權限檢查中間件工廠函數
 * @param {string} resource 資源類型
 * @param {string} action 操作類型
 * @returns {Function} 中間件函數
 */
const requirePermission = (resource, action = 'read') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          msg: '未經認證的請求'
        });
      }

      const hasAccess = canAccessResource(req.user, resource, action);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          msg: `您沒有權限執行此操作 (${resource}:${action})`
        });
      }

      next();
    } catch (error) {
      console.error('權限檢查錯誤:', error);
      return res.status(500).json({
        success: false,
        msg: '權限檢查失敗'
      });
    }
  };
};

/**
 * 角色檢查中間件
 * @param {string|Array} allowedRoles 允許的角色
 * @returns {Function} 中間件函數
 */
const requireRole = (allowedRoles) => {
  // 確保 allowedRoles 是陣列
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          msg: '未經認證的請求'
        });
      }

      if (!roles.includes(req.user.level)) {
        return res.status(403).json({
          success: false,
          msg: `需要 ${roles.join(' 或 ')} 權限才能訪問此資源`
        });
      }

      next();
    } catch (error) {
      console.error('角色檢查錯誤:', error);
      return res.status(500).json({
        success: false,
        msg: '角色檢查失敗'
      });
    }
  };
};

/**
 * 部門檢查中間件
 * @param {string|Array} allowedDepartments 允許的部門
 * @returns {Function} 中間件函數
 */
const requireDepartment = (allowedDepartments) => {
  const departments = Array.isArray(allowedDepartments) ? allowedDepartments : [allowedDepartments];
  
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          msg: '未經認證的請求'
        });
      }

      if (!departments.includes(req.user.department)) {
        return res.status(403).json({
          success: false,
          msg: `此功能僅限 ${departments.join('、')} 部門使用`
        });
      }

      next();
    } catch (error) {
      console.error('部門檢查錯誤:', error);
      return res.status(500).json({
        success: false,
        msg: '部門檢查失敗'
      });
    }
  };
};

/**
 * 資源擁有者檢查中間件
 * 確保用戶只能操作自己的資源
 * @param {string} resourceEmployeeField 資源中員工字段名
 * @returns {Function} 中間件函數
 */
const requireResourceOwner = (resourceEmployeeField = 'employee') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          msg: '未經認證的請求'
        });
      }

      // 管理員可以訪問所有資源
      if ([PERMISSION_LEVELS.ADMIN, 'admin', 'super'].includes(req.user.level)) {
        return next();
      }

      // 檢查資源擁有者
      const resourceEmployee = req.body[resourceEmployeeField] || req.params[resourceEmployeeField];
      
      if (resourceEmployee && resourceEmployee !== req.user.employee) {
        return res.status(403).json({
          success: false,
          msg: '您只能操作自己的資料'
        });
      }

      next();
    } catch (error) {
      console.error('資源擁有者檢查錯誤:', error);
      return res.status(500).json({
        success: false,
        msg: '權限檢查失敗'
      });
    }
  };
};

/**
 * API 速率限制中間件
 * 防止 API 濫用
 */
const rateLimitMap = new Map();

const rateLimit = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const clientId = req.user ? req.user.employee : req.ip;
    const now = Date.now();
    
    // 清理過期記錄
    const clientData = rateLimitMap.get(clientId) || { requests: [], windowStart: now };
    clientData.requests = clientData.requests.filter(timestamp => now - timestamp < windowMs);
    
    // 檢查請求數量
    if (clientData.requests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        msg: '請求過於頻繁，請稍後再試',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    // 記錄請求
    clientData.requests.push(now);
    rateLimitMap.set(clientId, clientData);
    
    next();
  };
};

module.exports = {
  verifyToken,
  requirePermission,
  requireRole,
  requireDepartment,
  requireResourceOwner,
  rateLimit
};