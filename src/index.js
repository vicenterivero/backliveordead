import express from "express";
import { pool } from "./db.js";
import cors from "cors"; 

const app = express();

app.use(cors({
  origin: "http://localhost:5173", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());


app.post("/user", async (req, res) => {
  const { name, google_token, play_time_seconds } = req.body;

  if (!name) {
    return res.status(400).json({ error: "El nombre es obligatorio" });
  }

  try {
    const query = `
      INSERT INTO users (name, google_token, play_time_seconds)
      VALUES ($1, $2, $3)
      ON CONFLICT (name)
      DO UPDATE SET
        google_token = EXCLUDED.google_token,
        play_time_seconds = CASE
          WHEN EXCLUDED.play_time_seconds < users.play_time_seconds THEN EXCLUDED.play_time_seconds
          ELSE users.play_time_seconds
        END,
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await pool.query(query, [
      name,
      google_token,
      play_time_seconds || 0
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


app.get("/users", async (req, res) => {
  let { page = 1, limit = 10 } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  const offset = (page - 1) * limit;

  try {
    const count = await pool.query("SELECT COUNT(*) FROM users");
    const total = Number(count.rows[0].count);

    const result = await pool.query(
      `
        SELECT *
        FROM users
        ORDER BY play_time_seconds ASC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    res.json({
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      data: result.rows,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.listen(3000, () => console.log("API escuchando en puerto 3000"));