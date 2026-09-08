const router = require("express").Router();
const { Op } = require("sequelize");
const db = require("../models");

// imagetb = YOLO 影像判缺陷的落地表（ori/pred 圖路徑 + pred_result JSON + 人工複判）。
// 資料由 ingestion adapter 寫入（seedAdapter 產生 demo 資料）。

const Imagetbs = db.imagetbs;
const User = db.users;
const EqAction = db.EqAction;
const ShtSmlCount = db.ShtSmlCount;

router.get("/queryByGlasses", async (req, res) => {
  const glasses = req.query.items;
  const line = req.query.line;

  try {
    const foundData = await Imagetbs.findAll({
      attributes: [
        "id",
        "gid",
        "datetime",
        "xpos",
        "ypos",
        "ori_img_path",
        "pred_img_path",
        "txt_path",
        "pred_result",
        "check_flag",
        "manual_result",
        "show_flag",
        "show_pos",
      ],
      where: {
        [Op.and]: {
          line: {
            [Op.eq]: line,
          },
          gid: {
            [Op.in]: glasses,
          },
          show_flag: 1,
        },
      },
    });
    // console.log(foundData);
    return res.send({
      msg: `成功取得glass defect image and predict data`,
      foundData,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).send({
      msg: "Image table內查無資料!",
    });
  }
});

router.get("/deleteRows", async (req, res) => {
  const ids = req.query.id_list;
  // console.log(ids);
  try {
    const updatedData = await Imagetbs.update(
      { show_flag: false },
      {
        where: {
          id: {
            [Op.in]: ids,
          },
          show_flag: {
            [Op.eq]: true,
          },
        },
      }
    );
    return res.send({
      msg: "刪除列已設定為不顯示!",
      updatedData,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).send({
      msg: "刪除列已無法設定為不顯示!",
      error,
    });
  }
});

router.patch("/updateDefectType", async (req, res) => {
  const { rowData, emp } = req.body;
  // console.log(rowData);
  // console.log(emp);

  const employeeCheck = User.findOne({ where: { employee: emp } });
  if (!employeeCheck) {
    return res.status(401).send("找不到此工號的使用者，請先註冊帳號");
  }
  try {
    // const updateImagetb
    const updateImageArr = rowData.map((e) => {
      let newObj = {};
      newObj.id = e.id;
      newObj.show_pos = e.show_pos;
      newObj.emp = emp;
      newObj.check_flag = true;
      if (e.change_df_type) {
        newObj.manual_result = e.manual_result;
      } else {
        newObj.manual_result = null;
      }
      return newObj;
    });
    // console.log(updateImageArr);
    // const updateImgs = await Imagetbs.bulkCreate(updateImageArr, {
    //   fields: ["check_flag", "show_pos", "manual_result", "emp"],
    //   updateOnDuplicate: ["check_flag", "show_pos", "manual_result", "emp"],
    // });
    await updateImageArr.forEach((element) => {
      const rowid = element.id;
      delete element.id;
      // console.log(element);

      Imagetbs.update(
        {
          check_flag: element.check_flag,
          show_pos: element.show_pos,
          manual_result: element.manual_result,
          emp: element.emp,
        },
        {
          where: {
            id: rowid,
          },
        }
      );
    });
    // const updateImgs = await Imagetbs.update();
    return res.send({
      sucess: true,
      msg: "Image table data資料更新成功!",
      // updateImgs,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({ sucess: false, msg: `Image table資料更新失敗` });
  }
});

router.get("/getHealthCondition", async (req, res) => {
  try {
    const checked_count = await Imagetbs.count({
      where: {
        check_flag: 1,
        show_flag: 1,
      },
    });
    const maual_count = await Imagetbs.count({
      where: {
        check_flag: 1,
        show_flag: 1,
        manual_result: {
          [Op.ne]: null,
        },
      },
    });

    const healthCondition = ((1 - maual_count / checked_count) * 100)
      .toFixed(2)
      .toString();
    return res.send({
      sucess: true,
      msg: healthCondition,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      msg: `模型健康度資料取得失敗!`,
    });
  }
});

// 首頁「模型更新時間」卡片用。開源版沒有隨附權重檔，回傳 MODEL_UPDATED_AT
// （server/.env 可設；沒設就回一個相對於現在的日期，讓卡片有東西顯示）。
router.get("/model-info", (req, res) => {
  const configured = process.env.MODEL_UPDATED_AT;
  const mtime = configured
    ? new Date(configured)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  res.send({ success: true, mtime });
});

router.get("/queryProductByLot", async (req, res) => {
  const lot = req.query.lot;
  try {
    const foundData = await EqAction.findOne({
      attributes: ["product"],
      where: {
        lot: lot
      }
    });
    return res.send({
      success: true,
      msg: "產品資料取得成功!",
      foundData
    });
  }catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      msg: `產品資料取得失敗!`,
    });
  }
});

router.get("/querySmlByLineGls", async (req,res) => {
  const line = req.query.ln;
  const gls_arr = req.query.gls_arr;

  const lineCvtEq = {
    'L1':'AOI-01',
    'L2':'AOI-02',
    'L3':'AOI-03',
    'L4':'AOI-04',
    'L5':'AOI-05',
    'L6':'AOI-06',
  }

  try {
    const getSmlData = await ShtSmlCount.findAll({
      attributes:[
        'gid',
        'ln',
        's',
        'm',
        'l',
        'total'
      ],
      where:{
        [Op.and]:{
          ln:{
            [Op.eq]:lineCvtEq[line]
          },
          gid:{
            [Op.in]: gls_arr
          }
        },
      },
    });
    // console.log(getSmlData);
    return res.send({
      msg:`成功取得glass sml data`,
      getSmlData
    })

  } catch (error) {
    console.log(error);
    
  }

  
})

module.exports = router;
