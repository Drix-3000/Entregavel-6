
const express = require("express");
const path = require("path");

const router = express.Router();

const verificarAdmin = require("../middlewares/authMiddleware");

// Página inicial
router.get("/", (req, res) => {
    res.redirect("/login");
});

// Login
router.get("/login", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../public/login.html")
    );
});

// Dashboard protegido
router.get("/dashboard", verificarAdmin, (req, res) => {
    res.sendFile(
        path.join(__dirname, "../public/deshboard.html")
    );
});

router.get("/produtos.html", verificarAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/produtos.html"));
});

router.get("/estoque.html", verificarAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/estoque.html"));
});

router.get("/vendas.html", verificarAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/vendas.html"));
});

router.get("/documentos.html", verificarAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/documentos.html"));
});

router.get("/contas.html", verificarAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/contas.html"));
});

router.get("/conta.html", verificarAdmin, (req, res) => {
    res.sendFile(
        path.join(__dirname, "../public/conta.html")
    );
});


module.exports = router;