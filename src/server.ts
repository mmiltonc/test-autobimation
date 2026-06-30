import express from "express";
import { recommend } from "./recommend.js";
import { customers } from "./data.js";

const app = express();
app.use(express.json());

app.post("/recommend", (req, res) => {
  const { customerId } = req.body ?? {};
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) {
    return res.status(404).json({ error: "distribuidor no encontrado" });
  }
  res.json({ distribuidor: customer.nombre, offers: recommend(customer) });
});

const port = 3000;
app.listen(port, () => console.log(`Escuchando en http://localhost:${port}`));
