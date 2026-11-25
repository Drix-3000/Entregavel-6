
const express = require("express");
const router = express.Router();

const db = require("../init-db");
const verificarAdmin = require("../middlewares/authMiddleware");

// =========================================
// LISTAR VENDAS
// =========================================

router.get("/", verificarAdmin, (req, res) => {
    try {
        const sales = db.prepare(`
            SELECT *
            FROM sales
            ORDER BY id DESC
        `).all();

        res.json(sales);

    } catch (error) {
        console.error("Erro ao listar vendas:", error);

        res.status(500).json({
            erro: "Erro ao consultar vendas"
        });
    }
});

// =========================================
// CONSULTAR UMA VENDA
// =========================================

router.get("/:id", verificarAdmin, (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: "ID de venda inválido"
        });
    }

    try {
        const sale = db.prepare(`
            SELECT *
            FROM sales
            WHERE id = ?
        `).get(id);

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

        res.json({
            ...sale,
            items
        });

    } catch (error) {
        console.error("Erro ao consultar venda:", error);

        res.status(500).json({
            erro: "Erro ao consultar venda"
        });
    }
});

// =========================================
// REGISTRAR VENDA
// =========================================

router.post("/", verificarAdmin, (req, res) => {
    const {
        cliente,
        documento,
        tipo,
        items
    } = req.body;

    if (!["avista", "prazo"].includes(tipo)) {
        return res.status(400).json({
            erro: "Tipo de venda inválido"
        });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            erro: "Adicione pelo menos um produto"
        });
    }

    const nomeCliente = String(cliente || "").trim();

    if (tipo === "prazo" && !nomeCliente) {
        return res.status(400).json({
            erro: "Informe o nome do cliente para venda a prazo"
        });
    }

    // Agrupar produtos repetidos antes de validar o estoque
    const quantidades = new Map();

    for (const item of items) {
        const productId = Number(item.product_id);
        const quantidade = Number(item.quantidade);

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                erro: "Produto inválido"
            });
        }

        if (!Number.isInteger(quantidade) || quantidade <= 0) {
            return res.status(400).json({
                erro: "Quantidade de produto inválida"
            });
        }

        const quantidadeAtual = quantidades.get(productId) || 0;
        const novaQuantidade = quantidadeAtual + quantidade;

        if (!Number.isSafeInteger(novaQuantidade)) {
            return res.status(400).json({
                erro: "Quantidade total inválida"
            });
        }

        quantidades.set(productId, novaQuantidade);
    }

    try {
        const registrarVenda = db.transaction(() => {
            let total = 0;
            const produtosVenda = [];

            // =====================================
            // VALIDAR ESTOQUE E CALCULAR TOTAL
            // =====================================

            for (const [productId, quantidade] of quantidades) {
                const product = db.prepare(`
                    SELECT *
                    FROM products
                    WHERE id = ?
                `).get(productId);

                if (!product) {
                    throw new Error(`Produto ${productId} não encontrado`);
                }

                if (Number(product.unidades) < quantidade) {
                    throw new Error(
                        `Estoque insuficiente para ${product.nome}. Disponível: ${product.unidades}, solicitado: ${quantidade}`
                    );
                }

                const subtotal = Number(product.price) * quantidade;

                if (!Number.isFinite(subtotal)) {
                    throw new Error("Valor de produto inválido");
                }

                total += subtotal;

                produtosVenda.push({
                    product,
                    quantidade,
                    subtotal
                });
            }

            if (!Number.isFinite(total) || total <= 0) {
                throw new Error("Valor total da venda inválido");
            }

            // =====================================
            // REGISTRAR VENDA
            // =====================================

            const resultado = db.prepare(`
                INSERT INTO sales (
                    customer_name,
                    customer_document,
                    sale_type,
                    total,
                    paid_amount,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                nomeCliente || "Consumidor",
                documento ? String(documento).trim() : null,
                tipo,
                total,
                tipo === "avista" ? total : 0,
                tipo === "avista" ? "pago" : "pendente"
            );

            const saleId = resultado.lastInsertRowid;

            // =====================================
            // REGISTRAR ITENS E BAIXAR ESTOQUE
            // =====================================

            const inserirItem = db.prepare(`
                INSERT INTO sale_items (
                    sale_id,
                    product_id,
                    product_name,
                    quantity,
                    unit_price,
                    subtotal
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            const atualizarEstoque = db.prepare(`
                UPDATE products
                SET unidades = unidades - ?
                WHERE id = ?
            `);

            const registrarMovimento = db.prepare(`
                INSERT INTO stock_movements (
                    product_id,
                    type,
                    quantity,
                    description
                )
                VALUES (?, 'saída', ?, ?)
            `);

            for (const item of produtosVenda) {
                inserirItem.run(
                    saleId,
                    item.product.id,
                    item.product.nome,
                    item.quantidade,
                    item.product.price,
                    item.subtotal
                );

                atualizarEstoque.run(
                    item.quantidade,
                    item.product.id
                );

                registrarMovimento.run(
                    item.product.id,
                    item.quantidade,
                    `Venda #${saleId}`
                );
            }

            // =====================================
            // REGISTRAR PAGAMENTO À VISTA
            // =====================================

            if (tipo === "avista") {
                db.prepare(`
                    INSERT INTO payments (
                        sale_id,
                        amount,
                        payment_method
                    )
                    VALUES (?, ?, ?)
                `).run(saleId, total, "avista");
            }

            return saleId;
        });

        const saleId = registrarVenda();

        res.status(201).json({
            sucesso: true,
            saleId,
            mensagem: "Venda registrada com sucesso"
        });

    } catch (error) {
        console.error("Erro ao registrar venda:", error);

        const erroBanco = error.code && error.code.startsWith("SQLITE_");

        res.status(erroBanco ? 500 : 400).json({
            erro: erroBanco
                ? "Erro ao registrar venda no banco de dados"
                : error.message
        });
    }
});

module.exports = router;
