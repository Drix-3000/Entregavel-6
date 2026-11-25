
const express = require("express");
const router = express.Router();

const db = require("../init-db");
const verificarAdmin = require("../middlewares/authMiddleware");

// CONSULTAR ESTOQUE DE TODOS OS PRODUTOS
router.get("/", verificarAdmin, (req, res) => {
    const products = db.prepare(`
        SELECT
            id,
            nome,
            unidades,
            CASE
                WHEN unidades = 0 THEN 'Esgotado'
                WHEN unidades <= 5 THEN 'Estoque baixo'
                ELSE 'Disponível'
            END AS status
        FROM products
        ORDER BY unidades ASC
    `).all();

    res.json(products);
});

// HISTÓRICO DE MOVIMENTAÇÕES DE UM PRODUTO
router.get("/:id/movements", verificarAdmin, (req, res) => {
    const movements = db.prepare(`
        SELECT *
        FROM stock_movements
        WHERE product_id = ?
        ORDER BY id DESC
    `).all(req.params.id);

    res.json(movements);
});

// ENTRADA DE ESTOQUE
router.post("/:id/entry", verificarAdmin, (req, res) => {
    const { quantidade, descricao } = req.body;

    if (!Number.isInteger(Number(quantidade)) || Number(quantidade) <= 0) {
        return res.status(400).json({
            erro: "Informe uma quantidade inteira maior que zero"
        });
    }

    const product = db.prepare(`
        SELECT * FROM products WHERE id = ?
    `).get(req.params.id);

    if (!product) {
        return res.status(404).json({
            erro: "Produto não encontrado"
        });
    }

    const quantidadeFinal = Number(quantidade);

    const movimentar = db.transaction(() => {
        db.prepare(`
            UPDATE products
            SET unidades = unidades + ?
            WHERE id = ?
        `).run(quantidadeFinal, product.id);

        db.prepare(`
            INSERT INTO stock_movements (
                product_id,
                type,
                quantity,
                description
            )
            VALUES (?, 'entrada', ?, ?)
        `).run(product.id, quantidadeFinal, descricao || null);
    });

    movimentar();

    res.json({
        sucesso: true,
        mensagem: "Entrada de estoque registrada"
    });
});

// SAÍDA MANUAL DE ESTOQUE
router.post("/:id/exit", verificarAdmin, (req, res) => {
    const { quantidade, descricao } = req.body;

    if (!Number.isInteger(Number(quantidade)) || Number(quantidade) <= 0) {
        return res.status(400).json({
            erro: "Informe uma quantidade inteira maior que zero"
        });
    }

    const product = db.prepare(`
        SELECT * FROM products WHERE id = ?
    `).get(req.params.id);

    if (!product) {
        return res.status(404).json({
            erro: "Produto não encontrado"
        });
    }

    const quantidadeFinal = Number(quantidade);

    if (product.unidades < quantidadeFinal) {
        return res.status(400).json({
            erro: "Estoque insuficiente"
        });
    }

    const movimentar = db.transaction(() => {
        db.prepare(`
            UPDATE products
            SET unidades = unidades - ?
            WHERE id = ?
        `).run(quantidadeFinal, product.id);

        db.prepare(`
            INSERT INTO stock_movements (
                product_id,
                type,
                quantity,
                description
            )
            VALUES (?, 'saída', ?, ?)
        `).run(product.id, quantidadeFinal, descricao || null);
    });

    movimentar();

    res.json({
        sucesso: true,
        mensagem: "Saída de estoque registrada"
    });
});

module.exports = router;
