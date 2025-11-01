const express = require("express");
const serverless = require("serverless-http");
const cheerio = require("cheerio");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const router = express.Router();

// 🏠 HOME - Hiển thị hướng dẫn toàn bộ API
router.get("/home", (req, res) => {
  const response = {
    project: "🎯 API Xổ Số & Thời Tiết",
    author: "truyentranh210",
    version: "1.0.0",
    updated: new Date().toISOString(),
    description:
      "API chạy trên Netlify Functions, gồm 2 chức năng: lấy kết quả xổ số và thông tin thời tiết thực tế.",
    endpoints: {
      "/home": "Hiển thị toàn bộ hướng dẫn sử dụng API",
      "/xoso?dai=mb": "Lấy kết quả xổ số (ví dụ: mb, mn, mt, tp hcm, da nang...)",
      "/thoitiet?dia_diem=Ha Noi": "Lấy thông tin thời tiết của địa điểm (ví dụ: Ha Noi, Da Nang, Ho Chi Minh)"
    },
    usage: {
      xoso: {
        method: "GET",
        example: "/xoso?dai=mb",
        note: "Trả về giải đặc biệt và ngày mở thưởng theo khu vực."
      },
      thoitiet: {
        method: "GET",
        example: "/thoitiet?dia_diem=Ha Noi",
        note: "Trả về nhiệt độ, độ ẩm, tình trạng thời tiết hiện tại và dự báo ngắn hạn."
      }
    },
    message: "✅ API đang hoạt động tốt! Hãy thử các endpoint ở trên."
  };
  res.json(response);
});

// 🎯 API /xoso
router.get("/xoso", async (req, res) => {
  const dai = (req.query.dai || "").toLowerCase();
  const map = {
    mb: "mien-bac",
    mn: "mien-nam",
    mt: "mien-trung",
    "tp hcm": "tp-hcm",
    "ha noi": "mien-bac",
    "dong thap": "dong-thap",
    "ca mau": "ca-mau",
    "vung tau": "vung-tau",
    "da nang": "da-nang",
    "da lat": "da-lat",
    "dak lak": "dak-lak",
    mega: "vietlott-mega-645",
    power: "vietlott-power-655",
  };
  const key = map[dai];
  if (!key) return res.json({ error: "❌ Đài không hợp lệ." });

  try {
    const r = await fetch(`https://ketqua.net/${key}`);
    const html = await r.text();
    const $ = cheerio.load(html);
    const ngay = $(".ngay").first().text().trim() || "Hôm nay";
    const giaiDB = $(".giaidb span").first().text().trim() || "Chưa có";
    res.json({
      dai: dai.toUpperCase(),
      ngay,
      giaiDB,
      nguon: "ketqua.net",
      cap_nhat: new Date().toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
    });
  } catch (e) {
    res.status(500).json({ error: "Không thể lấy dữ liệu xổ số." });
  }
});

// 🌦️ API /thoitiet
router.get("/thoitiet", async (req, res) => {
  const diaDiem = req.query.dia_diem || "Ha Noi";
  try {
    const r = await fetch(`https://wttr.in/${encodeURIComponent(diaDiem)}?format=j1`);
    const j = await r.json();
    res.json({
      dia_diem: diaDiem,
      nhiet_do: j.current_condition[0].temp_C + "°C",
      do_am: j.current_condition[0].humidity + "%",
      tinh_trang: j.current_condition[0].weatherDesc[0].value,
      luong_mua: j.current_condition[0].precipMM + " mm",
      tam_nhin: j.current_condition[0].visibility + " km",
      du_bao: j.weather[0].hourly.slice(0, 3).map((h) => ({
        gio: h.time,
        nhiet_do: h.tempC + "°C",
        mo_ta: h.weatherDesc[0].value,
      })),
      cap_nhat: new Date().toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
    });
  } catch {
    res.status(500).json({ error: "Không thể lấy dữ liệu thời tiết." });
  }
});

app.use("/", router);
module.exports.handler = serverless(app);
