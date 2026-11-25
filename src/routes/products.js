
const express = require("express");
const router = express.Router();

const db = require("../init-db");
const verificarAdmin = require("../middlewares/authMiddleware");

// LISTAR TODOS OS PRODUTOS
router.get("/", verificarAdmin, (req, res) => {
    const products = db.prepare(`
        SELECT * FROM products
        ORDER BY id DESC
    `).all();

    res.json(products);
});

// BUSCAR PRODUTO POR ID
router.get("/:id", verificarAdmin, (req, res) => {
    const product = db.prepare(`
        SELECT * FROM products
        WHERE id = ?
    `).get(req.params.id);

    if (!product) {
        return res.status(404).json({
            erro: "Produto não encontrado"
        });
    }

    res.json(product);
});

// CADASTRAR PRODUTO
router.post("/", verificarAdmin, (req, res) => {
    const {
        nome,
        descricao,
        image,
        price,
        unidades
    } = req.body;

    if (!nome || price === undefined || unidades === undefined) {
        return res.status(400).json({
            erro: "Nome, preço e unidades são obrigatórios"
        });
    }

    if (
        !Number.isFinite(Number(price)) ||
        Number(price) < 0 ||
        !Number.isInteger(Number(unidades)) ||
        Number(unidades) < 0
    ) {
        return res.status(400).json({
            erro: "Preço ou quantidade inválidos"
        });
    }

    const resultado = db.prepare(`
        INSERT INTO products (
            nome,
            descricao,
            image,
            price,
            unidades
        )
        VALUES (?, ?, ?, ?, ?)
    `).run(
        nome,
        descricao || null,
        image || null,
        Number(price),
        Number(unidades)
    );

    res.status(201).json({
        sucesso: true,
        id: resultado.lastInsertRowid,
        mensagem: "Produto cadastrado com sucesso"
    });
});

// ATUALIZAR PRODUTO
router.put("/:id", verificarAdmin, (req, res) => {
    const {
        nome,
        descricao,
        image,
        price,
        unidades
    } = req.body;

    const product = db.prepare(`
        SELECT * FROM products WHERE id = ?
    `).get(req.params.id);

    if (!product) {
        return res.status(404).json({
            erro: "Produto não encontrado"
        });
    }

    const novoNome = nome ?? product.nome;
    const novaDescricao = descricao ?? product.descricao;
    const novaImagem = image ?? product.image;
    const novoPreco = price ?? product.price;
    const novasUnidades = unidades ?? product.unidades;

    if (
        !novoNome ||
        !Number.isFinite(Number(novoPreco)) ||
        Number(novoPreco) < 0 ||
        !Number.isInteger(Number(novasUnidades)) ||
        Number(novasUnidades) < 0
    ) {
        return res.status(400).json({
            erro: "Dados do produto inválidos"
        });
    }

    db.prepare(`
        UPDATE products
        SET nome = ?,
            descricao = ?,
            image = ?,
            price = ?,
            unidades = ?
        WHERE id = ?
    `).run(
        novoNome,
        novaDescricao,
        novaImagem,
        Number(novoPreco),
        Number(novasUnidades),
        req.params.id
    );

    res.json({
        sucesso: true,
        mensagem: "Produto atualizado com sucesso"
    });
});

// EXCLUIR PRODUTO
router.delete("/:id", verificarAdmin, (req, res) => {
    const product = db.prepare(`
        SELECT * FROM products WHERE id = ?
    `).get(req.params.id);

    if (!product) {
        return res.status(404).json({
            erro: "Produto não encontrado"
        });
    }

    try {
        db.prepare(`
            DELETE FROM products WHERE id = ?
        `).run(req.params.id);

        res.json({
            sucesso: true,
            mensagem: "Produto excluído com sucesso"
        });

    } catch (error) {
        res.status(409).json({
            erro: "Não é possível excluir um produto que possui histórico de vendas"
        });
    }
});

module.exports = router;
