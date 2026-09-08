const router = require("express").Router();
const db = require("../models");
const User = db.users;
const jwt = require("jsonwebtoken");
const {
  validateEmployeeFormat,
  inferDepartmentFromEmployee,
  determinePermissionLevel,
} = require("../utils/employeeValidation");
const {
  verifyToken,
  requireRole,
  rateLimit,
} = require("../middleware/auth.middleware");
const logger = require("../utils/logger");

// 新增使用者 - 加入速率限制
router.post("/createUser", rateLimit(10, 60000), async (req, res) => {
  try {
    const { employee, username, password, email, department } = req.body;

    // 驗證工號格式
    const employeeValidation = validateEmployeeFormat(employee);
    if (!employeeValidation.valid) {
      return res.status(400).json({
        success: false,
        msg: employeeValidation.error,
      });
    }

    // 檢查工號是否已被註冊
    const employeeExist = await User.findOne({
      where: { employee },
    });

    if (employeeExist) {
      return res.status(400).json({
        success: false,
        msg: `工號 ${employee} 已被註冊`,
      });
    }

    // 檢查用戶名是否已被使用
    const usernameExist = await User.findOne({
      where: { username },
    });

    if (usernameExist) {
      return res.status(400).json({
        success: false,
        msg: `用戶名 ${username} 已被使用`,
      });
    }

    // 自動推斷部門（如果未提供）
    const finalDepartment = department || inferDepartmentFromEmployee(employee);

    // 根據部門和工號決定權限等級
    const level = determinePermissionLevel(finalDepartment, employee);

    console.log(
      `工號 ${employee} -> 部門: ${finalDepartment}, 權限等級: ${level}`
    );

    // 建立新用戶
    const savedUser = await User.create({
      department: finalDepartment,
      employee,
      username,
      password,
      email,
      level,
    });

    console.log("新使用者成功儲存到資料庫中");

    // 返回成功響應（不包含敏感資訊）
    return res.status(201).json({
      success: true,
      msg: "使用者註冊成功",
      user: {
        id: savedUser.id,
        employee: savedUser.employee,
        username: savedUser.username,
        email: savedUser.email,
        department: savedUser.department,
        level: savedUser.level,
      },
    });
  } catch (error) {
    console.error("註冊錯誤:", error);
    return res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
});

// 使用者登入
router.post("/login", async (req, res) => {
  try {
    // 確認使用者是否被註冊
    const foundUser = await User.findOne({
      where: { employee: req.body.employee },
    });
    if (!foundUser) {
      return res.status(401).send({
        msg: "找不到此工號的使用者，請先註冊帳號",
      });
    }

    const isMatch = await foundUser.comparePassword(req.body.password);
    
    if (isMatch) {
      // JWT payload 只放 employee——passport 策略也只用這個查人；
      // 不要把密碼（即使是雜湊）放進 token。
      const token = jwt.sign(
        { employee: foundUser.employee },
        process.env.PASSPORT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );
      const { password, ...safeUser } = foundUser.get({ plain: true });
      return res.send({
        msg: "成功登入!!!",
        token: "JWT " + token,
        user: safeUser,
      });
    } else {
      return res.status(401).send({
        msg: "密碼錯誤!!",
      });
    }
  } catch (error) {
    console.error("登入時發生錯誤:", error);
    return res.status(500).send({
      msg: "伺服器內部錯誤，請稍後再試",
      error: error.message
    });
  }
});

// 使用者登出

// 查詢所有使用者資料 - 需要管理員權限
router.get("/allUsers", verifyToken, async (req, res) => {
  try {
    let foundUsers = await User.findAll({
      attributes: { exclude: ["password"] },
      order: [
        ["department", "ASC"],
        ["employee", "ASC"],
      ],
    });
    return res.send({
      success: true,
      data: foundUsers,
      count: foundUsers.length,
    });
  } catch (e) {
    console.error("查詢用戶列表失敗:", e);
    return res.status(500).send({
      success: false,
      msg: "無法獲取用戶列表",
    });
  }
});

// 依工號查詢使用者資料（需登入）
router.get("/:employee", verifyToken, async (req, res) => {
  const { employee } = req.params;
  try {
    const foundUser = await User.findOne({
      where: { employee },
      attributes: { exclude: ["password"] },
    });
    return res.send(foundUser);
  } catch (e) {
    return res.status(500).send({ msg: e.message });
  }
});

// 管理員更新使用者權限
router.patch(
  "/updateUser/:employee",
  verifyToken,
  requireRole(["supervisor", "manager", "admin", "super"]),
  async (req, res) => {
    const { employee } = req.params;
    try {
      const foundUser = await User.findOne({
        where: { employee },
      });

      if (!foundUser) {
        return res.status(400).json({
          success: false,
          msg: `找不到工號:${employee}的使用者`,
        });
      }

      // 只允許更新權限等級和部門
      const allowedUpdates = {};
      if (req.body.level) {
        // 驗證權限等級是否有效
        const validLevels = [
          "operator",
          "supervisor",
          "manager",
          "admin",
          "normal",
          "super",
        ];
        if (validLevels.includes(req.body.level)) {
          allowedUpdates.level = req.body.level;
        } else {
          return res.status(400).json({
            success: false,
            msg: "無效的權限等級",
          });
        }
      }
      if (req.body.department) {
        allowedUpdates.department = req.body.department;
      }

      if (Object.keys(allowedUpdates).length === 0) {
        return res.status(400).json({
          success: false,
          msg: "沒有有效的更新欄位",
        });
      }

      let updateResult = await User.update(allowedUpdates, {
        where: { employee },
      });

      if (updateResult[0] > 0) {
        // 獲取更新後的用戶資料
        const updatedUser = await User.findOne({
          where: { employee },
          attributes: { exclude: ["password"] },
        });

        return res.json({
          success: true,
          msg: "使用者權限修改成功!",
          data: updatedUser,
        });
      } else {
        return res.status(400).json({
          success: false,
          msg: "沒有資料被更新",
        });
      }
    } catch (e) {
      console.error("更新用戶權限失敗:", e);
      return res.status(500).json({
        success: false,
        msg: "更新失敗，請稍後再試",
      });
    }
  }
);

// 修改自己的密碼（需要 JWT）
router.post("/changePassword", verifyToken, async (req, res) => {
  const { newPassword } = req.body;
  const employee = req.user.employee;
  if (!newPassword || newPassword.length < 6 || newPassword.length > 255) {
    return res.status(400).json({ success: false, msg: "密碼長度必須介於6至255位" });
  }
  try {
    const foundUser = await User.findOne({ where: { employee } });
    if (!foundUser) {
      return res.status(404).json({ success: false, msg: "找不到使用者" });
    }
    foundUser.password = newPassword;
    await foundUser.save();
    return res.json({ success: true, msg: "密碼修改成功" });
  } catch (e) {
    console.error("修改密碼失敗:", e);
    return res.status(500).json({ success: false, msg: "修改失敗，請稍後再試" });
  }
});

// 重置某使用者的密碼為其工號（僅管理員）
router.post("/resetPassword", verifyToken, requireRole(["admin", "super"]), async (req, res) => {
  const { employee } = req.body;
  try {
    const foundUser = await User.findOne({ where: { employee } });
    if (!foundUser) {
      return res.status(404).json({ success: false, msg: `找不到工號 ${employee} 的使用者` });
    }
    foundUser.password = employee;
    await foundUser.save();
    return res.json({ success: true, msg: "密碼已重置為工號" });
  } catch (e) {
    console.error("重置密碼失敗:", e);
    return res.status(500).json({ success: false, msg: "重置失敗，請稍後再試" });
  }
});

// 更新自己的使用者資料（只能改 username / email；改密碼走 /changePassword）
router.patch("/:employee", verifyToken, async (req, res) => {
  const { employee } = req.params;
  try {
    if (req.user.employee !== employee) {
      return res.status(403).send({ msg: "只有本人才可修改資料" });
    }
    const foundUser = await User.findOne({ where: { employee } });
    if (!foundUser) {
      return res.status(404).send({ msg: `找不到工號:${employee}的使用者` });
    }

    // 欄位白名單——不讓 req.body 直接進 User.update()（否則可自行改 level / password）
    const allowed = {};
    if (typeof req.body.username === "string") allowed.username = req.body.username;
    if (typeof req.body.email === "string") allowed.email = req.body.email;
    if (Object.keys(allowed).length === 0) {
      return res.status(400).send({ msg: "沒有可更新的欄位（僅 username / email）" });
    }
    // 只記欄位名不記值
    logger.info(`更新使用者 ${employee} 欄位: ${Object.keys(allowed).join(", ")}`);

    const updateUser = await User.update(allowed, { where: { employee } });
    return res.send({ message: "使用者資料修改成功!", updateUser });
  } catch (e) {
    return res.status(500).send({ msg: e.message });
  }
});

module.exports = router;
