
const express = require("express");
const router = express.Router();

const db = require("../init-db");
const verificarAdmin = require("../middlewares/authMiddleware");

// ======================================
// LISTAR CONTAS A RECEBER
// ======================================

router.get("/", verificarAdmin, (req, res) => {

    const accounts = db.prepare(`
        SELECT
            id,
            customer_name,
            customer_document,
            total,
            paid_amount,
            (total - paid_amount) AS balance,
            status,
            created_at
        FROM sales
        WHERE sale_type = 'prazo'
          AND (total - paid_amount) > 0
        ORDER BY id DESC
    `).all();

    res.json(accounts);
});

// ======================================
// HISTÓRICO GERAL DE PAGAMENTOS
// ======================================

router.get("/history", verificarAdmin, (req, res) => {

    const payments = db.prepare(`
        SELECT
            payments.id,
            payments.sale_id,
            payments.amount,
            payments.payment_method,
            payments.created_at,
            sales.customer_name,
            sales.sale_type
        FROM payments
        INNER JOIN sales
            ON sales.id = payments.sale_id
        ORDER BY payments.id DESC
    `).all();

    res.json(payments);
});

// ======================================
// CONSULTAR PAGAMENTOS DE UMA VENDA
// ======================================

router.get("/:saleId", verificarAdmin, (req, res) => {

    const sale = db.prepare(`
        SELECT *
        FROM sales
        WHERE id = ? AND sale_type = 'prazo'
    `).get(req.params.saleId);

    if (!sale) {
        return res.status(404).json({
            erro: "Conta a receber não encontrada"
        });
    }

    const payments = db.prepare(`
        SELECT *
        FROM payments
        WHERE sale_id = ?
        ORDER BY id DESC
    `).all(sale.id);

    res.json({
        venda: sale,
        pagamentos: payments,
        saldo: sale.total - sale.paid_amount
    });
});

// ======================================
// REGISTRAR PAGAMENTO
// ======================================

router.post("/:saleId", verificarAdmin, (req, res) => {

    const { valor, forma_pagamento } = req.body;

    const valorPagamento = Number(valor);

    if (!Number.isFinite(valorPagamento) || valorPagamento <= 0) {
        return res.status(400).json({
            erro: "Informe um valor de pagamento válido"
        });
    }

    const sale = db.prepare(`
        SELECT *
        FROM sales
        WHERE id = ? AND sale_type = 'prazo'
    `).get(req.params.saleId);

    if (!sale) {
        return res.status(404).json({
            erro: "Venda a prazo não encontrada"
        });
    }

    const saldo = sale.total - sale.paid_amount;

    if (valorPagamento > saldo + 0.000001) {
        return res.status(400).json({
            erro: "O pagamento não pode ser maior que o saldo devedor"
        });
    }

    const registrarPagamento = db.transaction(() => {

        db.prepare(`
            INSERT INTO payments (
                sale_id,
                amount,
                payment_method
            )
            VALUES (?, ?, ?)
        `).run(
            sale.id,
            valorPagamento,
            forma_pagamento || "dinheiro"
        );

        const novoValorPago = sale.paid_amount + valorPagamento;

        const novoStatus =
            novoValorPago >= sale.total ? "pago" : "pendente";

        db.prepare(`
            UPDATE sales
            SET paid_amount = ?,
                status = ?
            WHERE id = ?
        `).run(
            novoValorPago,
            novoStatus,
            sale.id
        );

        return {
            valor_pago: novoValorPago,
            saldo: Math.max(0, sale.total - novoValorPago),
            status: novoStatus
        };
    });

    const resultado = registrarPagamento();

    res.json({
        sucesso: true,
        mensagem: "Pagamento registrado com sucesso",
        ...resultado
    });
});

module.exports = router;
