
const express = require("express");
const router = express.Router();

const db = require("../init-db");
const verificarAdmin = require("../middlewares/authMiddleware");

// =================================
// LOGIN
// =================================

router.post("/login", (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            erro: "Informe o email e a senha"
        });
    }

    const admin = db.prepare(`
        SELECT * FROM admins
        WHERE email = ? AND senha = ?
    `).get(email, senha);

    if (!admin) {
        return res.status(401).json({
            erro: "Email ou senha incorretos"
        });
    }

    req.session.admin = {
        id: admin.id,
        nome: admin.nome,
        email: admin.email
    };

    return res.json({
        sucesso: true,
        mensagem: "Login realizado com sucesso",
        admin: req.session.admin
    });
});

// =================================
// VERIFICAR SESSÃO
// =================================

router.get("/me", (req, res) => {
    if (!req.session.admin) {
        return res.status(401).json({
            autenticado: false
        });
    }

    return res.json({
        autenticado: true,
        admin: req.session.admin
    });
});

// =================================
// LOGOUT
// =================================

router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                erro: "Erro ao encerrar sessão"
            });
        }

        res.clearCookie("connect.sid");

        return res.json({
            sucesso: true,
            mensagem: "Logout realizado com sucesso"
        });
    });
});

// =================================
// CADASTRAR ADMINISTRADOR
// =================================

router.post("/admins", verificarAdmin, (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({
            erro: "Preencha todos os campos"
        });
    }

    try {
        const resultado = db.prepare(`
            INSERT INTO admins (nome, email, senha)
            VALUES (?, ?, ?)
        `).run(nome, email, senha);

        return res.status(201).json({
            sucesso: true,
            id: resultado.lastInsertRowid,
            mensagem: "Administrador cadastrado"
        });

    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                erro: "Este email já está cadastrado"
            });
        }

        console.error(error);

        return res.status(500).json({
            erro: "Erro ao cadastrar administrador"
        });
    }
});

module.exports = router;