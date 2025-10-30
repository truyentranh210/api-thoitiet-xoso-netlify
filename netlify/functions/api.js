// netlify/functions/api.js
import express from "express";
import serverless from "serverless-http";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
const router = express.Router();

/* ===========================================================
   🔹 /xoso?dai=
   → Tự cập nhật kết quả xổ số mới nhất
   =========================================================== */
router.get("/xoso", async (req, res) => {
  const dai = (req.query.dai || "").toLowerCase();
  const map = {
    "mb": "mien-bac",
    "mn": "mien-nam",
    "mt": "mien-trung",
    "tp hcm": "tp-hcm",
    "ha noi": "mien-bac",
    "dong thap": "dong-thap",
    "ca mau": "ca-mau",
    "vung tau": "vung-tau",
    "da nang": "da-nang",
    "da lat": "da-lat",
    "dak lak": "dak-lak",
    "mega": "vietlott-mega-645",
    "power": "vietlott-power-655",
  };

  const key = map[dai];
  if (!key) return res.json({ error: "❌ Đài không hợp lệ." });

  try {
    // Crawl từ ketqua.net
    const url = `https://ketqua.net/${key}`;
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Lấy ngày quay & giải đặc biệt (tùy theo cấu trúc trang)
    const ngay = $(".ngay").first().text().trim() || "Hôm nay";
    const giaiDB = $(".giaidb span").first().text().trim() || "Chưa có";

    res.json({
      dai: dai.toUpperCase(),
      ngay,
      giaiDB,
      nguon: "ketqua.net",
      cap_nhat: new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể lấy dữ liệu xổ số." });
  }
});

/* ===========================================================
   🔹 /thoitiet?dia_diem=
   → Lấy thời tiết hiện tại và dự báo tự động
   =========================================================== */
router.get("/thoitiet", async (req, res) => {
  const diaDiem = req.query.dia_diem || "Ha Noi";
  const apiUrl = `https://wttr.in/${encodeURIComponent(diaDiem)}?format=j1`;

  try {
    const response = await fetch(apiUrl);
    const json = await response.json();

    const info = {
      dia_diem: diaDiem,
      nhiet_do: json.current_condition[0].temp_C + "°C",
      do_am: json.current_condition[0].humidity + "%",
      tinh_trang: json.current_condition[0].weatherDesc[0].value,
      luong_mua: json.current_condition[0].precipMM + " mm",
      tam_nhin: json.current_condition[0].visibility + " km",
      du_bao: json.weather[0].hourly.slice(0, 3).map(h => ({
        gio: h.time,
        nhiet_do: h.tempC + "°C",
        mo_ta: h.weatherDesc[0].value
      })),
      cap_nhat: new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    };

    res.json(info);
  } catch (error) {
    res.status(500).json({ error: "Không thể lấy dữ liệu thời tiết." });
  }
});

/* ===========================================================
   🔹 /docs → Trang hướng dẫn JSON
   =========================================================== */
router.get("/docs", (req, res) => {
  res.json({
    message: "🌤 API Thời tiết & Xổ số Việt Nam",
    endpoints: {
      "/xoso?dai=": "Tra cứu kết quả xổ số (VD: dai=MB, MN, MT, Ha Noi, TP HCM, Mega, Power...)",
      "/thoitiet?dia_diem=": "Tra cứu thời tiết hiện tại (VD: dia_diem=Da Nang, Ho Chi Minh...)"
    },
    example: {
      xoso: "/.netlify/functions/api/xoso?dai=MB",
      thoitiet: "/.netlify/functions/api/thoitiet?dia_diem=Ha Noi"
    },
    author: "AI Auto Service by GPT-5",
    version: "2.0.0"
  });
});

// ===========================================================
app.use("/.netlify/functions/api", router);
export const handler = serverless(app);
