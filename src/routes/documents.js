
const express = require("express");
const router = express.Router();

const db = require("../init-db");
const verificarAdmin = require("../middlewares/authMiddleware");

// LISTAR VENDAS DISPONÍVEIS PARA DOCUMENTOS
router.get("/", verificarAdmin, (req, res) => {
    const documents = db.prepare(`
        SELECT
            id,
            customer_name,
            customer_document,
            sale_type,
            total,
            paid_amount,
            status,
            created_at
        FROM sales
        ORDER BY id DESC
    `).all();

    res.json(documents);
});

// CONSULTAR DOCUMENTO DE UMA VENDA
router.get("/:saleId", verificarAdmin, (req, res) => {
    const sale = db.prepare(`
        SELECT * FROM sales
        WHERE id = ?
    `).get(req.params.saleId);

    if (!sale) {
        return res.status(404).json({
            erro: "Venda não encontrada"
        });
    }

    const items = db.prepare(`
        SELECT *
        FROM sale_items
        WHERE sale_id = ?
    `).all(sale.id);

    const payments = db.prepare(`
        SELECT *
        FROM payments
        WHERE sale_id = ?
        ORDER BY id ASC
    `).all(sale.id);

    res.json({
        venda: sale,
        produtos: items,
        pagamentos: payments
    });
});

// CONSULTAR DADOS PARA NOTA PROMISSÓRIA
router.get("/:saleId/promissory-note", verificarAdmin, (req, res) => {
    const sale = db.prepare(`
        SELECT * FROM sales
        WHERE id = ?
    `).get(req.params.saleId);

    if (!sale) {
        return res.status(404).json({
            erro: "Venda não encontrada"
        });
    }

    if (sale.sale_type !== "prazo") {
        return res.status(400).json({
            erro: "Esta venda não é uma venda a prazo"
        });
    }

    const saldo = sale.total - sale.paid_amount;

    res.json({
        tipo: "Nota promissória",
        venda_id: sale.id,
        cliente: sale.customer_name,
        documento: sale.customer_document,
        valor_original: sale.total,
        valor_pago: sale.paid_amount,
        saldo_devedor: saldo,
        data_venda: sale.created_at
    });
});

module.exports = router;
